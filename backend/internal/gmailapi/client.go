package gmailapi

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"net/mail"
	"regexp"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/html"
	"golang.org/x/oauth2"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"
)

// NewService builds a Gmail client from a stored token. The returned
// TokenSource may hand back a refreshed token on later use — callers
// should re-check tok.Token() after each request and persist it if it
// changed, since Gmail access tokens expire in about an hour.
func NewService(ctx context.Context, cfg *oauth2.Config, tok *oauth2.Token) (*gmail.Service, oauth2.TokenSource, error) {
	ts := cfg.TokenSource(ctx, tok)
	svc, err := gmail.NewService(ctx, option.WithTokenSource(ts))
	if err != nil {
		return nil, nil, err
	}
	return svc, ts, nil
}

// IsReauthRequired reports whether err means the Gmail token was revoked or
// otherwise needs the user to reconnect (PRD §9 edge case: "externally
// revoked Gmail access detected on next sync, prompts reconnection").
//
// Two distinct failure shapes both mean this: the Gmail API itself
// rejecting a request (401/403 googleapi.Error), or the refresh token
// itself being dead (oauth2.RetrieveError with invalid_grant) — the latter
// is what actually happens when a user revokes access in their Google
// account settings, since the *next* token refresh is what fails, not the
// Gmail API call.
func IsReauthRequired(err error) bool {
	var apiErr *googleapi.Error
	if errors.As(err, &apiErr) {
		return apiErr.Code == 401 || apiErr.Code == 403
	}
	var retrieveErr *oauth2.RetrieveError
	if errors.As(err, &retrieveErr) {
		return retrieveErr.ErrorCode == "invalid_grant"
	}
	return false
}

// IsRateLimited reports whether err is Gmail API rate limiting (PRD §9 edge
// case: "Gmail API rate limit during sync with graceful degrade").
func IsRateLimited(err error) bool {
	var apiErr *googleapi.Error
	if errors.As(err, &apiErr) {
		return apiErr.Code == 429
	}
	return false
}

type MessageSummary struct {
	ThreadID      string `json:"thread_id"`
	Subject       string `json:"subject"`
	From          string `json:"from"`
	Snippet       string `json:"snippet"`
	Unread        bool   `json:"unread"`
	Starred       bool   `json:"starred"`
	AwaitingReply bool   `json:"awaiting_reply"`
	Newsletter    bool   `json:"newsletter"`
	Date          string `json:"date"`
	MessageCount  int    `json:"message_count"`
}

// followUpAfter is how long a thread you sent the last message in can sit
// without a reply before it's surfaced as awaiting one.
const followUpAfter = 3 * 24 * time.Hour

type MessageDetail struct {
	ID       string `json:"id"`
	From     string `json:"from"`
	To       string `json:"to"`
	Subject  string `json:"subject"`
	Date     string `json:"date"`
	Body     string `json:"body"`      // plain text, for AI prompts and no-HTML fallback
	BodyHTML string `json:"body_html"` // original formatting + images, for display
	Unread   bool   `json:"unread"`
}

type ThreadDetail struct {
	ThreadID string          `json:"thread_id"`
	Messages []MessageDetail `json:"messages"`
}

// ListInbox returns the most recent threads in INBOX, newest first.
//
// ponytail: still one Threads.Get per thread for headers (Gmail's batch API
// needs a separate client setup), but summarize() below fires them
// concurrently — wall time is ~1 slow call instead of 25 sequential ones.
// Revisit with the batch API if a later phase needs hundreds per load.
func ListInbox(ctx context.Context, svc *gmail.Service, maxResults int64) ([]MessageSummary, error) {
	list, err := svc.Users.Threads.List("me").LabelIds("INBOX").MaxResults(maxResults).Context(ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("gmailapi: list threads: %w", err)
	}
	return summarize(ctx, svc, list.Threads)
}

// SearchInbox runs Gmail's own search syntax (same query language as the
// Gmail search bar) — a keyword-only fallback for when no AI key is
// configured, so search still works without one.
func SearchInbox(ctx context.Context, svc *gmail.Service, query string, maxResults int64) ([]MessageSummary, error) {
	list, err := svc.Users.Threads.List("me").Q(query).MaxResults(maxResults).Context(ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("gmailapi: search threads: %w", err)
	}
	return summarize(ctx, svc, list.Threads)
}

// summarizeConcurrency caps in-flight Threads.Get calls so a large inbox
// page doesn't slam Gmail's per-user rate limit all at once.
const summarizeConcurrency = 8

func summarize(ctx context.Context, svc *gmail.Service, threads []*gmail.Thread) ([]MessageSummary, error) {
	results := make([]*MessageSummary, len(threads))
	errs := make([]error, len(threads))

	sem := make(chan struct{}, summarizeConcurrency)
	var wg sync.WaitGroup
	for i, t := range threads {
		wg.Add(1)
		sem <- struct{}{}
		go func(i int, t *gmail.Thread) {
			defer wg.Done()
			defer func() { <-sem }()

			full, err := svc.Users.Threads.Get("me", t.Id).
				Format("metadata").MetadataHeaders("Subject", "From", "Date", "List-Unsubscribe").Context(ctx).Do()
			if err != nil {
				errs[i] = fmt.Errorf("gmailapi: get thread %s: %w", t.Id, err)
				return
			}
			if len(full.Messages) == 0 {
				return
			}
			last := full.Messages[len(full.Messages)-1]
			results[i] = &MessageSummary{
				ThreadID:      t.Id,
				Subject:       header(last, "Subject"),
				From:          header(last, "From"),
				Snippet:       t.Snippet,
				Unread:        hasLabel(last.LabelIds, "UNREAD"),
				Starred:       hasLabel(last.LabelIds, "STARRED"),
				AwaitingReply: awaitingReply(last.LabelIds, header(last, "Date")),
				Newsletter:    header(last, "List-Unsubscribe") != "",
				Date:          formatDate(header(last, "Date")),
				MessageCount:  len(full.Messages),
			}
		}(i, t)
	}
	wg.Wait()

	for _, err := range errs {
		if err != nil {
			return nil, err
		}
	}
	summaries := make([]MessageSummary, 0, len(threads))
	for _, r := range results {
		if r != nil {
			summaries = append(summaries, *r)
		}
	}
	return summaries, nil
}

func GetThread(ctx context.Context, svc *gmail.Service, threadID string) (*ThreadDetail, error) {
	full, err := svc.Users.Threads.Get("me", threadID).Format("full").Context(ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("gmailapi: get thread %s: %w", threadID, err)
	}

	messages := make([]MessageDetail, 0, len(full.Messages))
	for _, m := range full.Messages {
		messages = append(messages, MessageDetail{
			ID:       m.Id,
			From:     header(m, "From"),
			To:       header(m, "To"),
			Subject:  header(m, "Subject"),
			Date:     header(m, "Date"),
			Body:     extractBody(m.Payload),
			BodyHTML: extractBodyHTML(m.Payload),
			Unread:   hasLabel(m.LabelIds, "UNREAD"),
		})
	}
	return &ThreadDetail{ThreadID: threadID, Messages: messages}, nil
}

func Archive(ctx context.Context, svc *gmail.Service, threadID string) error {
	_, err := svc.Users.Threads.Modify("me", threadID, &gmail.ModifyThreadRequest{
		RemoveLabelIds: []string{"INBOX"},
	}).Context(ctx).Do()
	if err != nil {
		return fmt.Errorf("gmailapi: archive thread %s: %w", threadID, err)
	}
	return nil
}

func Unarchive(ctx context.Context, svc *gmail.Service, threadID string) error {
	_, err := svc.Users.Threads.Modify("me", threadID, &gmail.ModifyThreadRequest{
		AddLabelIds: []string{"INBOX"},
	}).Context(ctx).Do()
	if err != nil {
		return fmt.Errorf("gmailapi: unarchive thread %s: %w", threadID, err)
	}
	return nil
}

func SetRead(ctx context.Context, svc *gmail.Service, threadID string, read bool) error {
	req := &gmail.ModifyThreadRequest{}
	if read {
		req.RemoveLabelIds = []string{"UNREAD"}
	} else {
		req.AddLabelIds = []string{"UNREAD"}
	}
	_, err := svc.Users.Threads.Modify("me", threadID, req).Context(ctx).Do()
	if err != nil {
		return fmt.Errorf("gmailapi: set read thread %s: %w", threadID, err)
	}
	return nil
}

func SetStarred(ctx context.Context, svc *gmail.Service, threadID string, starred bool) error {
	req := &gmail.ModifyThreadRequest{}
	if starred {
		req.AddLabelIds = []string{"STARRED"}
	} else {
		req.RemoveLabelIds = []string{"STARRED"}
	}
	_, err := svc.Users.Threads.Modify("me", threadID, req).Context(ctx).Do()
	if err != nil {
		return fmt.Errorf("gmailapi: set starred thread %s: %w", threadID, err)
	}
	return nil
}

// Reply sends a plain-text reply into an existing thread, addressed back to
// the last message's sender with proper In-Reply-To/References threading.
func Reply(ctx context.Context, svc *gmail.Service, threadID, body string) error {
	full, err := svc.Users.Threads.Get("me", threadID).
		Format("metadata").MetadataHeaders("Subject", "From", "Message-Id", "References").
		Context(ctx).Do()
	if err != nil {
		return fmt.Errorf("gmailapi: get thread %s for reply: %w", threadID, err)
	}
	if len(full.Messages) == 0 {
		return fmt.Errorf("gmailapi: thread %s has no messages", threadID)
	}
	last := full.Messages[len(full.Messages)-1]

	messageID := header(last, "Message-Id")
	references := strings.TrimSpace(header(last, "References") + " " + messageID)
	raw := buildReplyRaw(header(last, "From"), replySubject(header(last, "Subject")), messageID, references, body)

	_, err = svc.Users.Messages.Send("me", &gmail.Message{
		Raw:      base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString([]byte(raw)),
		ThreadId: threadID,
	}).Context(ctx).Do()
	if err != nil {
		return fmt.Errorf("gmailapi: send reply on thread %s: %w", threadID, err)
	}
	return nil
}

func buildReplyRaw(to, subject, inReplyTo, references, body string) string {
	return fmt.Sprintf(
		"To: %s\r\nSubject: %s\r\nIn-Reply-To: %s\r\nReferences: %s\r\nContent-Type: text/plain; charset=\"UTF-8\"\r\n\r\n%s",
		to, subject, inReplyTo, references, body,
	)
}

func replySubject(subject string) string {
	if strings.HasPrefix(strings.ToLower(strings.TrimSpace(subject)), "re:") {
		return subject
	}
	return "Re: " + subject
}

func header(msg *gmail.Message, name string) string {
	if msg.Payload == nil {
		return ""
	}
	for _, h := range msg.Payload.Headers {
		if strings.EqualFold(h.Name, name) {
			return h.Value
		}
	}
	return ""
}

// awaitingReply reports whether the thread's last message was sent by the
// account owner (Gmail tags outgoing mail SENT) and is older than
// followUpAfter with no reply since — i.e. it's worth nudging about.
func awaitingReply(labels []string, rawDate string) bool {
	if !hasLabel(labels, "SENT") {
		return false
	}
	t, err := mail.ParseDate(rawDate)
	if err != nil {
		return false
	}
	return time.Since(t) >= followUpAfter
}

// formatDate turns a raw RFC 2822 "Date" header into a short display form
// ("Jan 2"), falling back to the raw value if it can't be parsed.
func formatDate(raw string) string {
	t, err := mail.ParseDate(raw)
	if err != nil {
		return raw
	}
	return t.Format("Jan 2")
}

func partHeader(part *gmail.MessagePart, name string) string {
	for _, h := range part.Headers {
		if strings.EqualFold(h.Name, name) {
			return h.Value
		}
	}
	return ""
}

func hasLabel(labels []string, target string) bool {
	for _, l := range labels {
		if l == target {
			return true
		}
	}
	return false
}

// extractBody prefers text/plain; many marketing emails have no plain part
// at all, so it falls back to stripping text out of text/html rather than
// showing a blank body.
func extractBody(part *gmail.MessagePart) string {
	if plain := findPart(part, "text/plain"); plain != "" {
		return plain
	}
	if doc := findPart(part, "text/html"); doc != "" {
		return htmlToText(doc)
	}
	return ""
}

// extractBodyHTML returns the email's original HTML, for display — as
// opposed to extractBody's plain-text version, which is what AI prompts
// use. Inline images referenced by cid: (Content-ID, common in newsletter
// logos and signatures) are inlined as data URIs so they render without a
// second request; images the sender hosts on their own CDN are left as
// normal https:// URLs and load directly in the browser.
//
// ponytail: cid parts without inline body.Data (large inline images Gmail
// makes you fetch via a separate Attachments.Get call) are left
// unresolved — add an Attachments.Get round trip if that shows up.
func extractBodyHTML(part *gmail.MessagePart) string {
	doc := findPart(part, "text/html")
	if doc == "" {
		return ""
	}
	cids := collectCIDs(part)
	if len(cids) == 0 {
		return doc
	}
	return cidRefPattern.ReplaceAllStringFunc(doc, func(match string) string {
		id := cidRefPattern.FindStringSubmatch(match)[1]
		if dataURI, ok := cids[id]; ok {
			return `src="` + dataURI + `"`
		}
		return match
	})
}

var cidRefPattern = regexp.MustCompile(`src=["']cid:([^"']+)["']`)

func collectCIDs(part *gmail.MessagePart) map[string]string {
	out := map[string]string{}
	var walk func(p *gmail.MessagePart)
	walk = func(p *gmail.MessagePart) {
		if p == nil {
			return
		}
		cid := strings.Trim(partHeader(p, "Content-ID"), "<>")
		if cid != "" && p.Body != nil && p.Body.Data != "" && p.MimeType != "" {
			data, err := base64.URLEncoding.WithPadding(base64.NoPadding).DecodeString(p.Body.Data)
			if err == nil {
				out[cid] = fmt.Sprintf("data:%s;base64,%s", p.MimeType, base64.StdEncoding.EncodeToString(data))
			}
		}
		for _, child := range p.Parts {
			walk(child)
		}
	}
	walk(part)
	return out
}

func findPart(part *gmail.MessagePart, mimeType string) string {
	if part == nil {
		return ""
	}
	if part.MimeType == mimeType && part.Body != nil && part.Body.Data != "" {
		data, err := base64.URLEncoding.WithPadding(base64.NoPadding).DecodeString(part.Body.Data)
		if err != nil {
			return ""
		}
		return string(data)
	}
	for _, p := range part.Parts {
		if body := findPart(p, mimeType); body != "" {
			return body
		}
	}
	return ""
}

// htmlToText walks an HTML document and joins its visible text, skipping
// script/style content and inserting line breaks at block boundaries so
// the result reads like a plain-text email instead of one run-on line.
func htmlToText(doc string) string {
	tokenizer := html.NewTokenizer(strings.NewReader(doc))
	var b strings.Builder
	skipDepth := 0
	for {
		switch tokenizer.Next() {
		case html.ErrorToken:
			return strings.TrimSpace(b.String())
		case html.StartTagToken, html.SelfClosingTagToken:
			tok := tokenizer.Token()
			switch tok.Data {
			case "script", "style":
				skipDepth++
			case "br", "p", "div", "tr", "li":
				b.WriteString("\n")
			}
		case html.EndTagToken:
			if tok := tokenizer.Token(); (tok.Data == "script" || tok.Data == "style") && skipDepth > 0 {
				skipDepth--
			}
		case html.TextToken:
			if skipDepth == 0 {
				if text := strings.TrimSpace(tokenizer.Token().Data); text != "" {
					b.WriteString(text)
					b.WriteString(" ")
				}
			}
		}
	}
}

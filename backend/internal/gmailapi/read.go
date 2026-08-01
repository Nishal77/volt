package gmailapi

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/mail"
	"sync"
	"time"

	"google.golang.org/api/gmail/v1"
)

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
	ID          string       `json:"id"`
	From        string       `json:"from"`
	To          string       `json:"to"`
	Subject     string       `json:"subject"`
	Date        string       `json:"date"`
	Body        string       `json:"body"`      // plain text, for AI prompts and no-HTML fallback
	BodyHTML    string       `json:"body_html"` // original formatting + images, for display
	Unread      bool         `json:"unread"`
	Attachments []Attachment `json:"attachments"`
}

type Attachment struct {
	AttachmentID string `json:"attachment_id"`
	Filename     string `json:"filename"`
	MimeType     string `json:"mime_type"`
	Size         int64  `json:"size"`
}

// collectAttachments walks the MIME tree for parts that carry a filename
// and an attachmentId — real attachments, not the inline images
// collectCIDs already handles for HTML display.
func collectAttachments(part *gmail.MessagePart) []Attachment {
	out := []Attachment{}
	var walk func(p *gmail.MessagePart)
	walk = func(p *gmail.MessagePart) {
		if p == nil {
			return
		}
		if p.Filename != "" && p.Body != nil && p.Body.AttachmentId != "" {
			out = append(out, Attachment{
				AttachmentID: p.Body.AttachmentId,
				Filename:     p.Filename,
				MimeType:     p.MimeType,
				Size:         p.Body.Size,
			})
		}
		for _, child := range p.Parts {
			walk(child)
		}
	}
	walk(part)
	return out
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

// GetAttachment downloads one attachment's raw bytes by message + attachment ID.
func GetAttachment(ctx context.Context, svc *gmail.Service, messageID, attachmentID string) ([]byte, error) {
	att, err := svc.Users.Messages.Attachments.Get("me", messageID, attachmentID).Context(ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("gmailapi: get attachment %s: %w", attachmentID, err)
	}
	data, err := base64.URLEncoding.WithPadding(base64.NoPadding).DecodeString(att.Data)
	if err != nil {
		return nil, fmt.Errorf("gmailapi: decode attachment %s: %w", attachmentID, err)
	}
	return data, nil
}

func GetThread(ctx context.Context, svc *gmail.Service, threadID string) (*ThreadDetail, error) {
	full, err := svc.Users.Threads.Get("me", threadID).Format("full").Context(ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("gmailapi: get thread %s: %w", threadID, err)
	}

	messages := make([]MessageDetail, 0, len(full.Messages))
	for _, m := range full.Messages {
		messages = append(messages, MessageDetail{
			ID:          m.Id,
			From:        header(m, "From"),
			To:          header(m, "To"),
			Subject:     header(m, "Subject"),
			Date:        header(m, "Date"),
			Body:        extractBody(m.Payload),
			BodyHTML:    extractBodyHTML(m.Payload),
			Unread:      hasLabel(m.LabelIds, "UNREAD"),
			Attachments: collectAttachments(m.Payload),
		})
	}
	return &ThreadDetail{ThreadID: threadID, Messages: messages}, nil
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

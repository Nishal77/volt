package gmailapi

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

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
	ThreadID string `json:"thread_id"`
	Subject  string `json:"subject"`
	From     string `json:"from"`
	Snippet  string `json:"snippet"`
	Unread   bool   `json:"unread"`
}

type MessageDetail struct {
	ID      string `json:"id"`
	From    string `json:"from"`
	To      string `json:"to"`
	Subject string `json:"subject"`
	Date    string `json:"date"`
	Body    string `json:"body"`
	Unread  bool   `json:"unread"`
}

type ThreadDetail struct {
	ThreadID string          `json:"thread_id"`
	Messages []MessageDetail `json:"messages"`
}

// ListInbox returns the most recent threads in INBOX, newest first.
//
// ponytail: one Threads.Get per thread for headers — N+1 calls, fine at
// the "recent 25" scale this phase asks for. Batch it (or cache locally)
// if a later phase needs hundreds of threads per load.
func ListInbox(ctx context.Context, svc *gmail.Service, maxResults int64) ([]MessageSummary, error) {
	list, err := svc.Users.Threads.List("me").LabelIds("INBOX").MaxResults(maxResults).Context(ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("gmailapi: list threads: %w", err)
	}

	summaries := make([]MessageSummary, 0, len(list.Threads))
	for _, t := range list.Threads {
		full, err := svc.Users.Threads.Get("me", t.Id).
			Format("metadata").MetadataHeaders("Subject", "From").Context(ctx).Do()
		if err != nil {
			return nil, fmt.Errorf("gmailapi: get thread %s: %w", t.Id, err)
		}
		if len(full.Messages) == 0 {
			continue
		}
		last := full.Messages[len(full.Messages)-1]
		summaries = append(summaries, MessageSummary{
			ThreadID: t.Id,
			Subject:  header(last, "Subject"),
			From:     header(last, "From"),
			Snippet:  t.Snippet,
			Unread:   hasLabel(last.LabelIds, "UNREAD"),
		})
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
			ID:      m.Id,
			From:    header(m, "From"),
			To:      header(m, "To"),
			Subject: header(m, "Subject"),
			Date:    header(m, "Date"),
			Body:    extractBody(m.Payload),
			Unread:  hasLabel(m.LabelIds, "UNREAD"),
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

func hasLabel(labels []string, target string) bool {
	for _, l := range labels {
		if l == target {
			return true
		}
	}
	return false
}

func extractBody(part *gmail.MessagePart) string {
	if part == nil {
		return ""
	}
	if part.MimeType == "text/plain" && part.Body != nil && part.Body.Data != "" {
		data, err := base64.URLEncoding.WithPadding(base64.NoPadding).DecodeString(part.Body.Data)
		if err != nil {
			return ""
		}
		return string(data)
	}
	for _, p := range part.Parts {
		if body := extractBody(p); body != "" {
			return body
		}
	}
	return ""
}

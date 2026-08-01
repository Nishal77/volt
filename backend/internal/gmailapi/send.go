package gmailapi

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"mime/multipart"
	"net/textproto"
	"strings"

	"google.golang.org/api/gmail/v1"
)

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

// OutgoingAttachment is a file to attach to a reply, content already
// decoded — the handler reads the upload, this just puts it on the wire.
type OutgoingAttachment struct {
	Filename string
	MimeType string
	Data     []byte
}

// Reply sends a plain-text reply into an existing thread, addressed back to
// the last message's sender with proper In-Reply-To/References threading.
func Reply(ctx context.Context, svc *gmail.Service, threadID, body string, attachments []OutgoingAttachment) error {
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
	raw, err := buildReplyRaw(header(last, "From"), replySubject(header(last, "Subject")), messageID, references, body, attachments)
	if err != nil {
		return fmt.Errorf("gmailapi: build reply on thread %s: %w", threadID, err)
	}

	_, err = svc.Users.Messages.Send("me", &gmail.Message{
		Raw:      base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(raw),
		ThreadId: threadID,
	}).Context(ctx).Do()
	if err != nil {
		return fmt.Errorf("gmailapi: send reply on thread %s: %w", threadID, err)
	}
	return nil
}

// buildReplyRaw returns an RFC 822 message. Plain text/plain when there are
// no attachments (unchanged from before); multipart/mixed with base64 file
// parts when there are — stdlib mime/multipart builds it, no hand-rolled
// boundary string.
func buildReplyRaw(to, subject, inReplyTo, references, body string, attachments []OutgoingAttachment) ([]byte, error) {
	var buf bytes.Buffer
	fmt.Fprintf(&buf, "To: %s\r\nSubject: %s\r\nIn-Reply-To: %s\r\nReferences: %s\r\n", to, subject, inReplyTo, references)

	if len(attachments) == 0 {
		fmt.Fprintf(&buf, "Content-Type: text/plain; charset=\"UTF-8\"\r\n\r\n%s", body)
		return buf.Bytes(), nil
	}

	mw := multipart.NewWriter(&buf)
	fmt.Fprintf(&buf, "Content-Type: multipart/mixed; boundary=%q\r\n\r\n", mw.Boundary())

	textPart, err := mw.CreatePart(textproto.MIMEHeader{"Content-Type": {`text/plain; charset="UTF-8"`}})
	if err != nil {
		return nil, err
	}
	if _, err := textPart.Write([]byte(body)); err != nil {
		return nil, err
	}

	for _, a := range attachments {
		filePart, err := mw.CreatePart(textproto.MIMEHeader{
			"Content-Type":              {a.MimeType},
			"Content-Transfer-Encoding": {"base64"},
			"Content-Disposition":       {fmt.Sprintf("attachment; filename=%q", a.Filename)},
		})
		if err != nil {
			return nil, err
		}
		enc := base64.StdEncoding.EncodeToString(a.Data)
		if _, err := filePart.Write([]byte(enc)); err != nil {
			return nil, err
		}
	}
	if err := mw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func replySubject(subject string) string {
	if strings.HasPrefix(strings.ToLower(strings.TrimSpace(subject)), "re:") {
		return subject
	}
	return "Re: " + subject
}

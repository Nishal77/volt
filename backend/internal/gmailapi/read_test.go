package gmailapi

import (
	"testing"
	"time"

	"google.golang.org/api/gmail/v1"
)

func TestAwaitingReply(t *testing.T) {
	old := time.Now().Add(-4 * 24 * time.Hour).Format(time.RFC1123Z)
	recent := time.Now().Add(-1 * time.Hour).Format(time.RFC1123Z)

	cases := []struct {
		name   string
		labels []string
		date   string
		want   bool
	}{
		{"sent 4 days ago, no reply", []string{"SENT"}, old, true},
		{"sent 1 hour ago, no reply", []string{"SENT"}, recent, false},
		{"received, not sent by us", []string{"INBOX", "UNREAD"}, old, false},
		{"sent, unparseable date", []string{"SENT"}, "not-a-date", false},
	}
	for _, tc := range cases {
		if got := awaitingReply(tc.labels, tc.date); got != tc.want {
			t.Errorf("%s: awaitingReply = %v, want %v", tc.name, got, tc.want)
		}
	}
}

func TestFormatDate(t *testing.T) {
	got := formatDate("Mon, 02 Jan 2006 15:04:05 -0700")
	if got != "Jan 2" {
		t.Errorf("formatDate = %q, want %q", got, "Jan 2")
	}
	if got := formatDate("garbage"); got != "garbage" {
		t.Errorf("formatDate fallback = %q, want the raw input back", got)
	}
}

func TestCollectAttachmentsSkipsInlineImagesWithoutAttachmentId(t *testing.T) {
	part := &gmail.MessagePart{
		Parts: []*gmail.MessagePart{
			// inline image, part of the HTML body — no AttachmentId
			{MimeType: "image/png", Filename: "", Body: &gmail.MessagePartBody{Data: "..."}},
			// real attachment
			{
				MimeType: "application/pdf",
				Filename: "invoice.pdf",
				Body:     &gmail.MessagePartBody{AttachmentId: "att1", Size: 1024},
			},
		},
	}
	got := collectAttachments(part)
	if len(got) != 1 {
		t.Fatalf("collectAttachments returned %d attachments, want 1", len(got))
	}
	if got[0].Filename != "invoice.pdf" || got[0].AttachmentID != "att1" {
		t.Errorf("collectAttachments = %+v, want invoice.pdf/att1", got[0])
	}
}

func TestCollectAttachmentsEmptyIsNotNil(t *testing.T) {
	got := collectAttachments(&gmail.MessagePart{})
	if got == nil {
		t.Error("collectAttachments returned nil, want an empty slice — nil marshals to JSON null and breaks the frontend's .map()")
	}
}

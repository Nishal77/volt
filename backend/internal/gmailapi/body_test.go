package gmailapi

import (
	"encoding/base64"
	"strings"
	"testing"

	"google.golang.org/api/gmail/v1"
)

func b64(s string) string {
	return base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString([]byte(s))
}

func TestExtractBodyPlainText(t *testing.T) {
	part := &gmail.MessagePart{
		MimeType: "text/plain",
		Body:     &gmail.MessagePartBody{Data: b64("hello world")},
	}
	if got := extractBody(part); got != "hello world" {
		t.Errorf("extractBody = %q, want %q", got, "hello world")
	}
}

func TestExtractBodyNestedMultipart(t *testing.T) {
	part := &gmail.MessagePart{
		MimeType: "multipart/alternative",
		Parts: []*gmail.MessagePart{
			{MimeType: "text/html", Body: &gmail.MessagePartBody{Data: "irrelevant"}},
			{MimeType: "text/plain", Body: &gmail.MessagePartBody{Data: b64("nested body")}},
		},
	}
	if got := extractBody(part); got != "nested body" {
		t.Errorf("extractBody = %q, want %q", got, "nested body")
	}
}

func TestExtractBodyFallsBackToHTMLWhenNoPlainPart(t *testing.T) {
	part := &gmail.MessagePart{
		MimeType: "text/html",
		Body:     &gmail.MessagePartBody{Data: b64("<p>Hi <b>there</b></p>")},
	}
	got := extractBody(part)
	if !strings.Contains(got, "Hi") || !strings.Contains(got, "there") {
		t.Errorf("extractBody html fallback = %q, want text containing Hi and there", got)
	}
}

func TestExtractBodyHTMLInlinesCIDImages(t *testing.T) {
	part := &gmail.MessagePart{
		MimeType: "multipart/related",
		Parts: []*gmail.MessagePart{
			{
				MimeType: "text/html",
				Body:     &gmail.MessagePartBody{Data: b64(`<img src="cid:logo123">`)},
			},
			{
				MimeType: "image/png",
				Headers:  []*gmail.MessagePartHeader{{Name: "Content-ID", Value: "<logo123>"}},
				Body:     &gmail.MessagePartBody{Data: b64("fake-png-bytes")},
			},
		},
	}
	got := extractBodyHTML(part)
	if strings.Contains(got, "cid:logo123") {
		t.Errorf("extractBodyHTML left an unresolved cid: reference: %q", got)
	}
	if !strings.Contains(got, "data:image/png;base64,") {
		t.Errorf("extractBodyHTML did not inline the cid image as a data URI: %q", got)
	}
}

func TestExtractBodyHTMLLeavesUnresolvedCIDUntouched(t *testing.T) {
	part := &gmail.MessagePart{
		MimeType: "text/html",
		Body:     &gmail.MessagePartBody{Data: b64(`<img src="cid:missing">`)},
	}
	got := extractBodyHTML(part)
	if !strings.Contains(got, "cid:missing") {
		t.Errorf("expected unresolved cid reference to be left alone, got %q", got)
	}
}

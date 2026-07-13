package gmailapi

import (
	"encoding/base64"
	"errors"
	"fmt"
	"testing"

	"golang.org/x/oauth2"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/googleapi"
)

func TestReplySubject(t *testing.T) {
	cases := map[string]string{
		"Hello":       "Re: Hello",
		"Re: Hello":   "Re: Hello",
		"re: hello":   "re: hello",
		"  Re: Hello": "  Re: Hello",
	}
	for in, want := range cases {
		if got := replySubject(in); got != want {
			t.Errorf("replySubject(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestHasLabel(t *testing.T) {
	if !hasLabel([]string{"INBOX", "UNREAD"}, "UNREAD") {
		t.Error("expected UNREAD to be found")
	}
	if hasLabel([]string{"INBOX"}, "UNREAD") {
		t.Error("expected UNREAD not to be found")
	}
}

func TestHeader(t *testing.T) {
	msg := &gmail.Message{
		Payload: &gmail.MessagePart{
			Headers: []*gmail.MessagePartHeader{
				{Name: "Subject", Value: "Hi"},
				{Name: "From", Value: "a@example.com"},
			},
		},
	}
	if got := header(msg, "subject"); got != "Hi" {
		t.Errorf("header case-insensitive lookup = %q, want %q", got, "Hi")
	}
	if got := header(msg, "Missing"); got != "" {
		t.Errorf("header for missing name = %q, want empty", got)
	}
}

func TestExtractBodyPlainText(t *testing.T) {
	data := base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString([]byte("hello world"))
	part := &gmail.MessagePart{
		MimeType: "text/plain",
		Body:     &gmail.MessagePartBody{Data: data},
	}
	if got := extractBody(part); got != "hello world" {
		t.Errorf("extractBody = %q, want %q", got, "hello world")
	}
}

func TestIsReauthRequired(t *testing.T) {
	cases := []struct {
		name string
		err  error
		want bool
	}{
		{"401 from gmail api", &googleapi.Error{Code: 401}, true},
		{"403 from gmail api", &googleapi.Error{Code: 403}, true},
		{"404 from gmail api", &googleapi.Error{Code: 404}, false},
		{"invalid_grant on refresh", &oauth2.RetrieveError{ErrorCode: "invalid_grant"}, true},
		{"other oauth2 error", &oauth2.RetrieveError{ErrorCode: "server_error"}, false},
		{"wrapped 401", fmt.Errorf("request failed: %w", &googleapi.Error{Code: 401}), true},
		{"unrelated error", errors.New("boom"), false},
	}
	for _, tc := range cases {
		if got := IsReauthRequired(tc.err); got != tc.want {
			t.Errorf("%s: IsReauthRequired = %v, want %v", tc.name, got, tc.want)
		}
	}
}

func TestIsRateLimited(t *testing.T) {
	if !IsRateLimited(&googleapi.Error{Code: 429}) {
		t.Error("expected 429 to be rate limited")
	}
	if IsRateLimited(&googleapi.Error{Code: 500}) {
		t.Error("expected 500 not to be rate limited")
	}
	if IsRateLimited(errors.New("boom")) {
		t.Error("expected unrelated error not to be rate limited")
	}
}

func TestExtractBodyNestedMultipart(t *testing.T) {
	data := base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString([]byte("nested body"))
	part := &gmail.MessagePart{
		MimeType: "multipart/alternative",
		Parts: []*gmail.MessagePart{
			{MimeType: "text/html", Body: &gmail.MessagePartBody{Data: "irrelevant"}},
			{MimeType: "text/plain", Body: &gmail.MessagePartBody{Data: data}},
		},
	}
	if got := extractBody(part); got != "nested body" {
		t.Errorf("extractBody = %q, want %q", got, "nested body")
	}
}

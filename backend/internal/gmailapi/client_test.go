package gmailapi

import (
	"errors"
	"fmt"
	"testing"

	"golang.org/x/oauth2"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/googleapi"
)

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

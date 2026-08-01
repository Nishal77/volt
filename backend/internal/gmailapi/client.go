// Package gmailapi wraps the Gmail API for Volt's single-account use.
// Split by sub-domain, same package, same exported interface throughout:
//   - client.go — service construction, auth-error classification, shared
//     message-header helpers used by both read.go and send.go.
//   - read.go    — list/search/summarize, thread reads, attachments in.
//   - send.go    — label mutations, reply/send with MIME + attachments out.
//   - body.go    — HTML/plain body extraction and sanitization.
package gmailapi

import (
	"context"
	"errors"
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
//
// Every request this client makes retries on Gmail's 429 and on transient
// 5xx/network errors (retry.go) — wired once here so list/get/send/
// attachment calls all get it, instead of each call site needing its own
// retry loop.
func NewService(ctx context.Context, cfg *oauth2.Config, tok *oauth2.Token) (*gmail.Service, oauth2.TokenSource, error) {
	ts := cfg.TokenSource(ctx, tok)
	httpClient := oauth2.NewClient(ctx, ts)
	httpClient.Transport = &retryTransport{base: httpClient.Transport}

	svc, err := gmail.NewService(ctx, option.WithHTTPClient(httpClient))
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

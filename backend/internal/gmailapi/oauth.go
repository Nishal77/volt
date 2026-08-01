// Package gmailapi wraps Google's OAuth2 flow and the Gmail API for the
// single-account, no-AI inbox operations Phase 2 needs: list, read,
// archive, reply, mark read/unread.
package gmailapi

import (
	"sync"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/gmail/v1"
)

// Scopes are minimum-necessary per CLAUDE.md §3: readonly for sync/read,
// modify for archive/label/mark-read, send for reply. Full mail.google.com
// access is deliberately not requested.
var Scopes = []string{
	gmail.GmailReadonlyScope,
	gmail.GmailModifyScope,
	gmail.GmailSendScope,
}

func OAuthConfig(clientID, clientSecret, redirectURL string) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       Scopes,
		Endpoint:     google.Endpoint,
	}
}

// ponytail: single mutex-guarded update instead of an atomic.Pointer swap
// across every handler that captured *oauth2.Config at router build time —
// this instance updates its OAuth client at most a few times ever (initial
// setup, occasional rotation), never under concurrent request load, so a
// plain lock around the rare write is enough. Revisit with atomic.Pointer
// if that assumption stops holding.
var configMu sync.Mutex

// SetClient lets a self-hoster configure their Google OAuth client from the
// running app instead of editing .env, without needing a server restart —
// it updates the shared *oauth2.Config in place so every handler that
// already holds it sees the change on their next request.
func SetClient(cfg *oauth2.Config, clientID, clientSecret string) {
	configMu.Lock()
	defer configMu.Unlock()
	cfg.ClientID = clientID
	cfg.ClientSecret = clientSecret
}

// Configured reports whether an OAuth client has been set, either from
// .env at startup or via SetClient afterward.
func Configured(cfg *oauth2.Config) bool {
	configMu.Lock()
	defer configMu.Unlock()
	return cfg.ClientID != "" && cfg.ClientSecret != ""
}

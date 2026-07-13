// Package gmailapi wraps Google's OAuth2 flow and the Gmail API for the
// single-account, no-AI inbox operations Phase 2 needs: list, read,
// archive, reply, mark read/unread.
package gmailapi

import (
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

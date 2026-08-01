package api

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2"

	"github.com/Nishal77/volt/backend/internal/db"
	"github.com/Nishal77/volt/backend/internal/gmailapi"
	"github.com/Nishal77/volt/backend/internal/vault"
)

// oauthState is a fixed, non-secret string. Single self-hosted instance,
// no multi-user sessions to distinguish — CSRF protection here would guard
// state that doesn't exist. Skipped; revisit if Volt ever grows sessions.
const oauthState = "volt"

func googleLoginHandler(cfg *oauth2.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !gmailapi.Configured(cfg) {
			c.JSON(http.StatusPreconditionRequired, gin.H{"error": "oauth_not_configured"})
			return
		}
		url := cfg.AuthCodeURL(oauthState, oauth2.AccessTypeOffline, oauth2.ApprovalForce)
		c.Redirect(http.StatusFound, url)
	}
}

func googleCallbackHandler(cfg *oauth2.Config, pool *pgxpool.Pool, frontendURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if errParam := c.Query("error"); errParam != "" {
			c.Redirect(http.StatusFound, frontendURL+"/inbox?error=oauth_denied")
			return
		}
		code := c.Query("code")
		if code == "" {
			c.Redirect(http.StatusFound, frontendURL+"/inbox?error=oauth_failed")
			return
		}
		encKey, err := vault.Key()
		if err != nil {
			c.Redirect(http.StatusFound, frontendURL+"/unlock?error=vault_locked")
			return
		}

		tok, err := cfg.Exchange(context.Background(), code)
		if err != nil {
			c.Redirect(http.StatusFound, frontendURL+"/inbox?error=oauth_failed")
			return
		}

		if err := db.SaveToken(context.Background(), pool, encKey, tok); err != nil {
			c.Redirect(http.StatusFound, frontendURL+"/inbox?error=save_failed")
			return
		}

		c.Redirect(http.StatusFound, frontendURL+"/inbox")
	}
}

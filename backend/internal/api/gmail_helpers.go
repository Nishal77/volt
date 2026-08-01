package api

import (
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2"
	"google.golang.org/api/gmail/v1"

	"github.com/Nishal77/volt/backend/internal/db"
	"github.com/Nishal77/volt/backend/internal/gmailapi"
)

// errDBUnavailable means the DB itself couldn't be reached — distinct from
// "not connected" or a real Gmail API failure, so the error the user sees
// actually names the right system instead of blaming Gmail for a Postgres
// outage.
var errDBUnavailable = errors.New("api: database unreachable")

// gmailService loads the stored token, builds a Gmail client, and returns a
// deferrable save func that persists the token if the http client silently
// refreshed it mid-request. Every inbox handler routes through this so
// refresh-persistence lives in one place, not copy-pasted per handler.
func gmailService(ctx context.Context, cfg *oauth2.Config, pool *pgxpool.Pool, encKey []byte) (*gmail.Service, func(), error) {
	if err := pool.Ping(ctx); err != nil {
		return nil, nil, errDBUnavailable
	}

	tok, err := db.GetToken(ctx, pool, encKey)
	if errors.Is(err, db.ErrNoToken) {
		return nil, nil, err
	}
	if err != nil {
		return nil, nil, err
	}

	svc, ts, err := gmailapi.NewService(ctx, cfg, tok)
	if err != nil {
		return nil, nil, err
	}

	save := func() {
		refreshed, err := ts.Token()
		if err != nil || refreshed.AccessToken == tok.AccessToken {
			return
		}
		_ = db.SaveToken(ctx, pool, encKey, refreshed)
	}
	return svc, save, nil
}

// handleGmailError maps a gmail API/db error to the right HTTP response.
func handleGmailError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, errDBUnavailable):
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "db_unreachable"})
	case errors.Is(err, db.ErrNoToken):
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not_connected"})
	case gmailapi.IsReauthRequired(err):
		c.JSON(http.StatusUnauthorized, gin.H{"error": "reconnect_required"})
	case gmailapi.IsRateLimited(err):
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "rate_limited"})
	default:
		c.JSON(http.StatusBadGateway, gin.H{"error": "gmail_request_failed"})
	}
}

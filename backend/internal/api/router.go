package api

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Nishal77/volt/backend/internal/config"
	"github.com/Nishal77/volt/backend/internal/gmailapi"
)

// NewRouter wires health, OAuth, and inbox routes. encKey is the decoded
// AES-256 key used to encrypt the stored Gmail token at rest.
func NewRouter(pool *pgxpool.Pool, cfg config.Config, encKey []byte) *gin.Engine {
	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		if err := pool.Ping(context.Background()); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "db unreachable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	oauthCfg := gmailapi.OAuthConfig(cfg.GoogleClientID, cfg.GoogleClientSecret, cfg.GoogleRedirectURL)

	r.GET("/auth/google", googleLoginHandler(oauthCfg))
	r.GET("/auth/google/callback", googleCallbackHandler(oauthCfg, pool, encKey, cfg.FrontendURL))

	inbox := r.Group("/api/inbox")
	inbox.GET("", listInboxHandler(oauthCfg, pool, encKey))
	inbox.GET("/:id", getThreadHandler(oauthCfg, pool, encKey))
	inbox.POST("/:id/archive", archiveThreadHandler(oauthCfg, pool, encKey))
	inbox.POST("/:id/read", setReadHandler(oauthCfg, pool, encKey))
	inbox.POST("/:id/reply", replyThreadHandler(oauthCfg, pool, encKey))

	return r
}

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
	r.Use(corsMiddleware(cfg.FrontendURL))
	r.NoRoute(func(c *gin.Context) {
		if c.Request.Method == http.MethodOptions {
			c.Status(http.StatusNoContent)
			return
		}
		c.Status(http.StatusNotFound)
	})

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
	inbox.POST("/:id/summarize", summarizeThreadHandler(oauthCfg, pool, encKey, cfg.PromptsDir))
	inbox.POST("/:id/draft", draftReplyHandler(oauthCfg, pool, encKey, cfg.PromptsDir))

	r.GET("/api/search", searchInboxHandler(oauthCfg, pool, encKey, cfg.PromptsDir))

	settings := r.Group("/api/settings")
	settings.POST("/ai-key", saveAIKeyHandler(pool, encKey))
	settings.GET("/ai-key", getAIKeyStatusHandler(pool, encKey))

	return r
}

// corsMiddleware lets the frontend (a different origin in dev, e.g.
// localhost:3000 vs :8080) call the API from the browser. Single allowed
// origin, no wildcard — this instance only ever serves its own frontend.
func corsMiddleware(frontendURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", frontendURL)
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type")
		c.Next()
	}
}

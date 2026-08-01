package api

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Nishal77/volt/backend/internal/config"
	"github.com/Nishal77/volt/backend/internal/gmailapi"
)

// NewRouter wires health, vault, OAuth, and inbox routes. The encryption
// key used for stored credentials lives only in internal/vault's in-memory
// holder, unlocked via POST /api/vault/unlock — never passed in here.
func NewRouter(pool *pgxpool.Pool, cfg config.Config) *gin.Engine {
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

	vaultGroup := r.Group("/api/vault")
	vaultGroup.GET("/status", vaultStatusHandler(pool))
	vaultGroup.POST("/setup", vaultSetupHandler(pool))
	vaultGroup.POST("/unlock", vaultUnlockHandler(pool))
	vaultGroup.POST("/reset", vaultResetHandler(pool))

	r.GET("/auth/google", googleLoginHandler(oauthCfg))
	r.GET("/auth/google/callback", googleCallbackHandler(oauthCfg, pool, cfg.FrontendURL))

	inbox := r.Group("/api/inbox")
	inbox.GET("", listInboxHandler(oauthCfg, pool))
	inbox.GET("/:id", getThreadHandler(oauthCfg, pool))
	inbox.GET("/:id/attachments/:messageId/:attachmentId", getAttachmentHandler(oauthCfg, pool))
	inbox.POST("/:id/archive", archiveThreadHandler(oauthCfg, pool))
	inbox.POST("/:id/unarchive", unarchiveThreadHandler(oauthCfg, pool))
	inbox.POST("/:id/read", setReadHandler(oauthCfg, pool))
	inbox.POST("/:id/star", setStarredHandler(oauthCfg, pool))
	inbox.POST("/:id/reply", replyThreadHandler(oauthCfg, pool))
	inbox.POST("/:id/schedule", scheduleSendHandler(pool))
	inbox.POST("/:id/summarize", summarizeThreadHandler(oauthCfg, pool, cfg.PromptsDir))
	inbox.POST("/:id/draft", draftReplyHandler(oauthCfg, pool, cfg.PromptsDir))

	r.GET("/api/gmail/status", gmailStatusHandler(pool))

	scheduled := r.Group("/api/scheduled")
	scheduled.GET("", listScheduledSendsHandler(pool))
	scheduled.DELETE("/:id", cancelScheduledSendHandler(pool))
	startScheduledSendWorker(oauthCfg, pool)

	r.GET("/api/search", searchInboxHandler(oauthCfg, pool, cfg.PromptsDir))
	r.POST("/api/chat", chatHandler(oauthCfg, pool, cfg.PromptsDir))
	r.GET("/api/avatar", avatarHandler)
	r.GET("/api/prompts", promptsHandler(cfg.PromptsDir))

	settings := r.Group("/api/settings")
	settings.POST("/ai-key", saveAIKeyHandler(pool))
	settings.GET("/ai-key", getAIKeyStatusHandler(pool))

	return r
}

// corsMiddleware lets the frontend (a different origin in dev, e.g.
// localhost:3000 vs :8080) call the API from the browser. Single allowed
// origin, no wildcard — this instance only ever serves its own frontend.
func corsMiddleware(frontendURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", frontendURL)
		c.Header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type")
		c.Next()
	}
}

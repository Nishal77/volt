package api

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2"

	"github.com/Nishal77/volt/backend/internal/ai"
	"github.com/Nishal77/volt/backend/internal/db"
	"github.com/Nishal77/volt/backend/internal/gmailapi"
)

type saveAIKeyRequest struct {
	Provider string `json:"provider" binding:"required,oneof=anthropic openai google groq openrouter kimi"`
	APIKey   string `json:"api_key" binding:"required"`
}

func saveAIKeyHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req saveAIKeyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_body"})
			return
		}
		encKey, ok := requireUnlocked(c)
		if !ok {
			return
		}

		if err := ai.Validate(c.Request.Context(), ai.Config{Provider: req.Provider, APIKey: req.APIKey}); err != nil {
			handleAIError(c, err)
			return
		}

		if err := db.SaveAIKey(c.Request.Context(), pool, encKey, req.Provider, req.APIKey); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "save_failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "saved"})
	}
}

// getAIKeyStatusHandler reports whether a key is configured, never the key
// itself — it never leaves storage once written.
func getAIKeyStatusHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		encKey, ok := requireUnlocked(c)
		if !ok {
			return
		}
		provider, _, err := db.GetAIKey(c.Request.Context(), pool, encKey)
		if errors.Is(err, db.ErrNoAIKey) {
			c.JSON(http.StatusOK, gin.H{"configured": false})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "lookup_failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"configured": true, "provider": provider})
	}
}

type saveOAuthClientRequest struct {
	ClientID     string `json:"client_id" binding:"required"`
	ClientSecret string `json:"client_secret" binding:"required"`
}

// saveOAuthClientHandler lets a self-hoster paste in their own Google OAuth
// client from the running app instead of editing .env — it takes effect
// immediately, no restart, via gmailapi.SetClient.
func saveOAuthClientHandler(pool *pgxpool.Pool, oauthCfg *oauth2.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req saveOAuthClientRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_body"})
			return
		}
		encKey, ok := requireUnlocked(c)
		if !ok {
			return
		}
		if err := db.SaveOAuthClient(c.Request.Context(), pool, encKey, req.ClientID, req.ClientSecret); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "save_failed"})
			return
		}
		gmailapi.SetClient(oauthCfg, req.ClientID, req.ClientSecret)
		c.JSON(http.StatusOK, gin.H{"status": "saved"})
	}
}

// getOAuthClientStatusHandler reports whether an OAuth client is
// configured, never the client secret itself.
func getOAuthClientStatusHandler(oauthCfg *oauth2.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"configured": gmailapi.Configured(oauthCfg)})
	}
}

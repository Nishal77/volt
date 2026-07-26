package api

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Nishal77/volt/backend/internal/db"
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

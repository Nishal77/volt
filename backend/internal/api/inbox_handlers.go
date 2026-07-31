package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2"

	"github.com/Nishal77/volt/backend/internal/db"
	"github.com/Nishal77/volt/backend/internal/gmailapi"
)

const inboxMaxResults = 25

func listInboxHandler(cfg *oauth2.Config, pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		encKey, ok := requireUnlocked(c)
		if !ok {
			return
		}
		svc, save, err := gmailService(c.Request.Context(), cfg, pool, encKey)
		if err != nil {
			handleGmailError(c, err)
			return
		}
		defer save()

		messages, err := gmailapi.ListInbox(c.Request.Context(), svc, inboxMaxResults)
		if err != nil {
			handleGmailError(c, err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"messages": messages})
	}
}

// gmailStatusHandler is a cheap "is an account connected" check — reads
// the stored token from the DB, no live Gmail API call.
func gmailStatusHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		encKey, ok := requireUnlocked(c)
		if !ok {
			return
		}
		_, err := db.GetToken(c.Request.Context(), pool, encKey)
		c.JSON(http.StatusOK, gin.H{"connected": err == nil})
	}
}

func getThreadHandler(cfg *oauth2.Config, pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		encKey, ok := requireUnlocked(c)
		if !ok {
			return
		}
		svc, save, err := gmailService(c.Request.Context(), cfg, pool, encKey)
		if err != nil {
			handleGmailError(c, err)
			return
		}
		defer save()

		thread, err := gmailapi.GetThread(c.Request.Context(), svc, c.Param("id"))
		if err != nil {
			handleGmailError(c, err)
			return
		}
		c.JSON(http.StatusOK, thread)
	}
}

func archiveThreadHandler(cfg *oauth2.Config, pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		encKey, ok := requireUnlocked(c)
		if !ok {
			return
		}
		svc, save, err := gmailService(c.Request.Context(), cfg, pool, encKey)
		if err != nil {
			handleGmailError(c, err)
			return
		}
		defer save()

		if err := gmailapi.Archive(c.Request.Context(), svc, c.Param("id")); err != nil {
			handleGmailError(c, err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "archived"})
	}
}

type setReadRequest struct {
	Read bool `json:"read"`
}

func setReadHandler(cfg *oauth2.Config, pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req setReadRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_body"})
			return
		}

		encKey, ok := requireUnlocked(c)
		if !ok {
			return
		}
		svc, save, err := gmailService(c.Request.Context(), cfg, pool, encKey)
		if err != nil {
			handleGmailError(c, err)
			return
		}
		defer save()

		if err := gmailapi.SetRead(c.Request.Context(), svc, c.Param("id"), req.Read); err != nil {
			handleGmailError(c, err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	}
}

func unarchiveThreadHandler(cfg *oauth2.Config, pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		encKey, ok := requireUnlocked(c)
		if !ok {
			return
		}
		svc, save, err := gmailService(c.Request.Context(), cfg, pool, encKey)
		if err != nil {
			handleGmailError(c, err)
			return
		}
		defer save()

		if err := gmailapi.Unarchive(c.Request.Context(), svc, c.Param("id")); err != nil {
			handleGmailError(c, err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "unarchived"})
	}
}

type setStarredRequest struct {
	Starred bool `json:"starred"`
}

func setStarredHandler(cfg *oauth2.Config, pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req setStarredRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_body"})
			return
		}

		encKey, ok := requireUnlocked(c)
		if !ok {
			return
		}
		svc, save, err := gmailService(c.Request.Context(), cfg, pool, encKey)
		if err != nil {
			handleGmailError(c, err)
			return
		}
		defer save()

		if err := gmailapi.SetStarred(c.Request.Context(), svc, c.Param("id"), req.Starred); err != nil {
			handleGmailError(c, err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	}
}

type replyRequest struct {
	Body string `json:"body" binding:"required"`
}

func replyThreadHandler(cfg *oauth2.Config, pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req replyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_body"})
			return
		}

		encKey, ok := requireUnlocked(c)
		if !ok {
			return
		}
		svc, save, err := gmailService(c.Request.Context(), cfg, pool, encKey)
		if err != nil {
			handleGmailError(c, err)
			return
		}
		defer save()

		if err := gmailapi.Reply(c.Request.Context(), svc, c.Param("id"), req.Body); err != nil {
			handleGmailError(c, err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "sent"})
	}
}

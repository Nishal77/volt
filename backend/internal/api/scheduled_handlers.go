package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Nishal77/volt/backend/internal/db"
)

type scheduleSendRequest struct {
	Body   string    `json:"body" binding:"required"`
	SendAt time.Time `json:"send_at" binding:"required"`
}

func scheduleSendHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req scheduleSendRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_body"})
			return
		}
		if !req.SendAt.After(time.Now()) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "send_at_must_be_future"})
			return
		}
		if _, ok := requireUnlocked(c); !ok {
			return
		}

		id, err := db.CreateScheduledSend(c.Request.Context(), pool, c.Param("id"), req.Body, req.SendAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "schedule_failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"id": id})
	}
}

func listScheduledSendsHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := requireUnlocked(c); !ok {
			return
		}
		sends, err := db.PendingScheduledSends(c.Request.Context(), pool)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "list_failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"scheduled": sends})
	}
}

func cancelScheduledSendHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := requireUnlocked(c); !ok {
			return
		}
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_id"})
			return
		}
		cancelled, err := db.CancelScheduledSend(c.Request.Context(), pool, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "cancel_failed"})
			return
		}
		if !cancelled {
			c.JSON(http.StatusNotFound, gin.H{"error": "not_found_or_already_sent"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "cancelled"})
	}
}

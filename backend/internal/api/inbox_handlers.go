package api

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2"
	"google.golang.org/api/gmail/v1"

	"github.com/Nishal77/volt/backend/internal/db"
	"github.com/Nishal77/volt/backend/internal/gmailapi"
)

// applyLabelMutation is the one place the unlock -> gmailService -> mutate
// -> respond recipe lives. Every thread label mutation (archive, unarchive,
// mark read, star) shares this exact shape and differs only in which
// gmailapi call runs and what the success body says.
func applyLabelMutation(
	cfg *oauth2.Config,
	pool *pgxpool.Pool,
	successBody gin.H,
	mutate func(ctx context.Context, svc *gmail.Service, threadID string) error,
) gin.HandlerFunc {
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

		if err := mutate(c.Request.Context(), svc, c.Param("id")); err != nil {
			handleGmailError(c, err)
			return
		}
		c.JSON(http.StatusOK, successBody)
	}
}

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

func getAttachmentHandler(cfg *oauth2.Config, pool *pgxpool.Pool) gin.HandlerFunc {
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

		data, err := gmailapi.GetAttachment(c.Request.Context(), svc, c.Param("messageId"), c.Param("attachmentId"))
		if err != nil {
			handleGmailError(c, err)
			return
		}
		filename := c.Query("filename")
		if filename == "" {
			filename = "attachment"
		}
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
		c.Data(http.StatusOK, "application/octet-stream", data)
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
	return applyLabelMutation(cfg, pool, gin.H{"status": "archived"}, gmailapi.Archive)
}

func unarchiveThreadHandler(cfg *oauth2.Config, pool *pgxpool.Pool) gin.HandlerFunc {
	return applyLabelMutation(cfg, pool, gin.H{"status": "unarchived"}, gmailapi.Unarchive)
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
		applyLabelMutation(cfg, pool, gin.H{"status": "ok"}, func(ctx context.Context, svc *gmail.Service, id string) error {
			return gmailapi.SetRead(ctx, svc, id, req.Read)
		})(c)
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
		applyLabelMutation(cfg, pool, gin.H{"status": "ok"}, func(ctx context.Context, svc *gmail.Service, id string) error {
			return gmailapi.SetStarred(ctx, svc, id, req.Starred)
		})(c)
	}
}

// maxAttachmentBytes caps each attachment's decoded size — keeps the
// base64 JSON payload reasonable and stays well under Gmail's own 25MB cap.
const maxAttachmentBytes = 10 << 20 // 10MB

type attachmentUpload struct {
	Filename string `json:"filename" binding:"required"`
	MimeType string `json:"mime_type" binding:"required"`
	Data     string `json:"data" binding:"required"` // base64, no data: prefix
}

type replyRequest struct {
	Body        string             `json:"body" binding:"required"`
	Attachments []attachmentUpload `json:"attachments"`
}

func decodeAttachments(uploads []attachmentUpload) ([]gmailapi.OutgoingAttachment, error) {
	out := make([]gmailapi.OutgoingAttachment, 0, len(uploads))
	for _, u := range uploads {
		data, err := base64.StdEncoding.DecodeString(u.Data)
		if err != nil {
			return nil, fmt.Errorf("attachment %q: invalid base64: %w", u.Filename, err)
		}
		if len(data) > maxAttachmentBytes {
			return nil, fmt.Errorf("attachment %q exceeds %dMB limit", u.Filename, maxAttachmentBytes>>20)
		}
		out = append(out, gmailapi.OutgoingAttachment{Filename: u.Filename, MimeType: u.MimeType, Data: data})
	}
	return out, nil
}

func replyThreadHandler(cfg *oauth2.Config, pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req replyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_body"})
			return
		}
		attachments, err := decodeAttachments(req.Attachments)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_attachment"})
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

		if err := gmailapi.Reply(c.Request.Context(), svc, c.Param("id"), req.Body, attachments); err != nil {
			handleGmailError(c, err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "sent"})
	}
}

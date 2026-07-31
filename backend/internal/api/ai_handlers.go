package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2"

	"github.com/Nishal77/volt/backend/internal/ai"
	"github.com/Nishal77/volt/backend/internal/db"
	"github.com/Nishal77/volt/backend/internal/gmailapi"
)

// loadAIConfig fetches the user's BYO key, or writes ai_not_configured and
// returns ok=false. Every AI handler routes through this so the "not
// configured yet" response is written in exactly one place.
func loadAIConfig(c *gin.Context, pool *pgxpool.Pool, encKey []byte) (ai.Config, bool) {
	provider, apiKey, err := db.GetAIKey(c.Request.Context(), pool, encKey)
	if errors.Is(err, db.ErrNoAIKey) {
		c.JSON(http.StatusPreconditionFailed, gin.H{"error": "ai_not_configured"})
		return ai.Config{}, false
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ai_key_lookup_failed"})
		return ai.Config{}, false
	}
	return ai.Config{Provider: provider, APIKey: apiKey}, true
}

func threadText(t *gmailapi.ThreadDetail) string {
	var b strings.Builder
	for _, m := range t.Messages {
		fmt.Fprintf(&b, "From: %s\nTo: %s\nDate: %s\nSubject: %s\n\n%s\n\n---\n\n", m.From, m.To, m.Date, m.Subject, m.Body)
	}
	return b.String()
}

func summarizeThreadHandler(cfg *oauth2.Config, pool *pgxpool.Pool, promptsDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		threadID := c.Param("id")

		if cached, err := db.GetSummary(c.Request.Context(), pool, threadID); err == nil && cached != "" {
			c.JSON(http.StatusOK, gin.H{"summary": cached, "cached": true})
			return
		}

		encKey, ok := requireUnlocked(c)
		if !ok {
			return
		}
		aiCfg, ok := loadAIConfig(c, pool, encKey)
		if !ok {
			return
		}
		svc, save, err := gmailService(c.Request.Context(), cfg, pool, encKey)
		if err != nil {
			handleGmailError(c, err)
			return
		}
		defer save()
		thread, err := gmailapi.GetThread(c.Request.Context(), svc, threadID)
		if err != nil {
			handleGmailError(c, err)
			return
		}

		system, err := ai.LoadPrompt(promptsDir, "summarize")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "prompt_load_failed"})
			return
		}
		summary, err := ai.Complete(c.Request.Context(), aiCfg, system, threadText(thread))
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "ai_request_failed"})
			return
		}
		_ = db.SaveSummary(c.Request.Context(), pool, threadID, summary)
		c.JSON(http.StatusOK, gin.H{"summary": summary, "cached": false})
	}
}

func draftReplyHandler(cfg *oauth2.Config, pool *pgxpool.Pool, promptsDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		encKey, ok := requireUnlocked(c)
		if !ok {
			return
		}
		aiCfg, ok := loadAIConfig(c, pool, encKey)
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

		system, err := ai.LoadPrompt(promptsDir, "draft")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "prompt_load_failed"})
			return
		}
		draft, err := ai.Complete(c.Request.Context(), aiCfg, system, threadText(thread))
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "ai_request_failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"draft": draft})
	}
}

func searchInboxHandler(cfg *oauth2.Config, pool *pgxpool.Pool, promptsDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		query := c.Query("q")
		if query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing_query"})
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

		provider, apiKey, err := db.GetAIKey(c.Request.Context(), pool, encKey)
		if errors.Is(err, db.ErrNoAIKey) {
			// No AI key configured — fall back to Gmail's own search syntax
			// instead of failing outright. Keyword-only, no semantic match,
			// but search still works for users who haven't set up AI.
			results, err := gmailapi.SearchInbox(c.Request.Context(), svc, query, inboxMaxResults)
			if err != nil {
				handleGmailError(c, err)
				return
			}
			c.JSON(http.StatusOK, gin.H{"messages": results, "fallback": "keyword"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ai_key_lookup_failed"})
			return
		}
		aiCfg := ai.Config{Provider: provider, APIKey: apiKey}

		messages, err := gmailapi.ListInbox(c.Request.Context(), svc, inboxMaxResults)
		if err != nil {
			handleGmailError(c, err)
			return
		}

		system, err := ai.LoadPrompt(promptsDir, "search")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "prompt_load_failed"})
			return
		}
		userPrompt := searchUserPrompt(messages, query)
		raw, err := ai.Complete(c.Request.Context(), aiCfg, system, userPrompt)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "ai_request_failed"})
			return
		}

		var matchedIDs []string
		if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &matchedIDs); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "ai_response_unparseable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"messages": filterByThreadID(messages, matchedIDs)})
	}
}

// chatHandler is a stateless single-turn "ask anything" endpoint — no
// conversation history is threaded through the model. The frontend keeps
// the message list for display; each send is independent.
// ponytail: no multi-turn context, add if replies need to reference
// earlier turns in the same chat.
func chatHandler(pool *pgxpool.Pool, promptsDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Message string `json:"message" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_body"})
			return
		}

		encKey, ok := requireUnlocked(c)
		if !ok {
			return
		}
		aiCfg, ok := loadAIConfig(c, pool, encKey)
		if !ok {
			return
		}

		system, err := ai.LoadPrompt(promptsDir, "chat")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "prompt_load_failed"})
			return
		}
		reply, err := ai.Complete(c.Request.Context(), aiCfg, system, req.Message)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "ai_request_failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"reply": reply})
	}
}

func searchUserPrompt(messages []gmailapi.MessageSummary, query string) string {
	var b strings.Builder
	fmt.Fprintf(&b, "Query: %s\n\nThreads:\n", query)
	for _, m := range messages {
		fmt.Fprintf(&b, "- thread_id: %s | from: %s | subject: %s | snippet: %s\n", m.ThreadID, m.From, m.Subject, m.Snippet)
	}
	return b.String()
}

// filterByThreadID preserves the AI's relevance ordering, not the inbox's.
func filterByThreadID(messages []gmailapi.MessageSummary, ids []string) []gmailapi.MessageSummary {
	byID := make(map[string]gmailapi.MessageSummary, len(messages))
	for _, m := range messages {
		byID[m.ThreadID] = m
	}
	out := make([]gmailapi.MessageSummary, 0, len(ids))
	for _, id := range ids {
		if m, ok := byID[id]; ok {
			out = append(out, m)
		}
	}
	return out
}

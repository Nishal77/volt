package api

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2"

	"github.com/Nishal77/volt/backend/internal/db"
	"github.com/Nishal77/volt/backend/internal/gmailapi"
	"github.com/Nishal77/volt/backend/internal/vault"
)

// scheduledSendInterval trades off send-time precision against DB polling
// load — a scheduled send may fire up to this long after its send_at.
const scheduledSendInterval = 30 * time.Second

// startScheduledSendWorker polls for due "send later" replies and sends
// them via the same gmailapi.Reply path a live user click uses — nothing
// new on the send side, just a timer instead of a click. If the vault is
// locked when a tick fires, it skips silently and retries next tick; the
// send still can't happen without the vault unlocked, since that's what
// decrypts the Gmail token (CLAUDE.md §3: never touches credentials while
// locked, including here).
func startScheduledSendWorker(cfg *oauth2.Config, pool *pgxpool.Pool) {
	go func() {
		ticker := time.NewTicker(scheduledSendInterval)
		defer ticker.Stop()
		for range ticker.C {
			sendDueScheduled(cfg, pool)
		}
	}()
}

func sendDueScheduled(cfg *oauth2.Config, pool *pgxpool.Pool) {
	encKey, err := vault.Key()
	if err != nil {
		return // locked — try again next tick
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	due, err := db.DueScheduledSends(ctx, pool, time.Now())
	if err != nil || len(due) == 0 {
		return
	}

	svc, save, err := gmailService(ctx, cfg, pool, encKey)
	if err != nil {
		return // not connected / reauth needed — try again next tick
	}
	defer save()

	for _, s := range due {
		if err := gmailapi.Reply(ctx, svc, s.ThreadID, s.Body); err != nil {
			log.Printf("scheduled send %d for thread %s failed, won't retry: %v", s.ID, s.ThreadID, err)
			_ = db.MarkScheduledSendFailed(ctx, pool, s.ID)
			continue
		}
		_ = db.MarkScheduledSendSent(ctx, pool, s.ID)
	}
}

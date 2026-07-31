package db

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ponytail: body stored plain, same precedent as ai_summary — it's content,
// not a credential, so it doesn't go through the vault's AES key. The
// actual send still can't happen without the vault unlocked, since that's
// what decrypts the Gmail token.
const scheduledSendSchema = `
CREATE TABLE IF NOT EXISTS scheduled_send (
	id SERIAL PRIMARY KEY,
	thread_id TEXT NOT NULL,
	body TEXT NOT NULL,
	send_at TIMESTAMPTZ NOT NULL,
	sent_at TIMESTAMPTZ,
	failed BOOLEAN NOT NULL DEFAULT false,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`

type ScheduledSend struct {
	ID       int       `json:"id"`
	ThreadID string    `json:"thread_id"`
	Body     string    `json:"body"`
	SendAt   time.Time `json:"send_at"`
}

func CreateScheduledSend(ctx context.Context, pool *pgxpool.Pool, threadID, body string, sendAt time.Time) (int, error) {
	var id int
	err := pool.QueryRow(ctx, `
		INSERT INTO scheduled_send (thread_id, body, send_at) VALUES ($1, $2, $3)
		RETURNING id`, threadID, body, sendAt).Scan(&id)
	return id, err
}

// PendingScheduledSends returns not-yet-sent, not-failed sends, soonest first.
func PendingScheduledSends(ctx context.Context, pool *pgxpool.Pool) ([]ScheduledSend, error) {
	rows, err := pool.Query(ctx, `
		SELECT id, thread_id, body, send_at FROM scheduled_send
		WHERE sent_at IS NULL AND NOT failed
		ORDER BY send_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ScheduledSend
	for rows.Next() {
		var s ScheduledSend
		if err := rows.Scan(&s.ID, &s.ThreadID, &s.Body, &s.SendAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// DueScheduledSends returns pending sends whose send_at has passed.
func DueScheduledSends(ctx context.Context, pool *pgxpool.Pool, now time.Time) ([]ScheduledSend, error) {
	rows, err := pool.Query(ctx, `
		SELECT id, thread_id, body, send_at FROM scheduled_send
		WHERE sent_at IS NULL AND NOT failed AND send_at <= $1`, now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ScheduledSend
	for rows.Next() {
		var s ScheduledSend
		if err := rows.Scan(&s.ID, &s.ThreadID, &s.Body, &s.SendAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func MarkScheduledSendSent(ctx context.Context, pool *pgxpool.Pool, id int) error {
	_, err := pool.Exec(ctx, `UPDATE scheduled_send SET sent_at = now() WHERE id = $1`, id)
	return err
}

// MarkScheduledSendFailed stops retrying a send that errored — a stuck
// invalid thread would otherwise get retried every tick forever.
func MarkScheduledSendFailed(ctx context.Context, pool *pgxpool.Pool, id int) error {
	_, err := pool.Exec(ctx, `UPDATE scheduled_send SET failed = true WHERE id = $1`, id)
	return err
}

// CancelScheduledSend deletes a not-yet-sent scheduled send. Returns false
// if it was already sent (or never existed) — nothing to cancel.
func CancelScheduledSend(ctx context.Context, pool *pgxpool.Pool, id int) (bool, error) {
	tag, err := pool.Exec(ctx, `DELETE FROM scheduled_send WHERE id = $1 AND sent_at IS NULL`, id)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

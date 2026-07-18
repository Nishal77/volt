package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Nishal77/volt/backend/internal/crypto"
)

// ErrNoAIKey is returned when no BYO AI key has been configured yet.
var ErrNoAIKey = errors.New("db: no ai key stored")

func SaveAIKey(ctx context.Context, pool *pgxpool.Pool, encKey []byte, provider, apiKey string) error {
	blob, err := crypto.Encrypt(encKey, []byte(apiKey))
	if err != nil {
		return fmt.Errorf("db: encrypt ai key: %w", err)
	}
	_, err = pool.Exec(ctx, `
		INSERT INTO ai_key (id, provider, encrypted_key, updated_at)
		VALUES (1, $1, $2, now())
		ON CONFLICT (id) DO UPDATE SET provider = $1, encrypted_key = $2, updated_at = now()`,
		provider, blob)
	return err
}

// GetAIKey decrypts and returns the stored provider + API key, or
// ErrNoAIKey if none has been configured yet.
func GetAIKey(ctx context.Context, pool *pgxpool.Pool, encKey []byte) (provider, apiKey string, err error) {
	var blob []byte
	err = pool.QueryRow(ctx, `SELECT provider, encrypted_key FROM ai_key WHERE id = 1`).Scan(&provider, &blob)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", ErrNoAIKey
	}
	if err != nil {
		return "", "", fmt.Errorf("db: query ai key: %w", err)
	}
	plaintext, err := crypto.Decrypt(encKey, blob)
	if err != nil {
		return "", "", fmt.Errorf("db: decrypt ai key: %w", err)
	}
	return provider, string(plaintext), nil
}

// GetSummary returns a cached thread summary, or "" if none exists yet.
func GetSummary(ctx context.Context, pool *pgxpool.Pool, threadID string) (string, error) {
	var summary string
	err := pool.QueryRow(ctx, `SELECT summary FROM ai_summary WHERE thread_id = $1`, threadID).Scan(&summary)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("db: query summary: %w", err)
	}
	return summary, nil
}

func SaveSummary(ctx context.Context, pool *pgxpool.Pool, threadID, summary string) error {
	_, err := pool.Exec(ctx, `
		INSERT INTO ai_summary (thread_id, summary, created_at)
		VALUES ($1, $2, now())
		ON CONFLICT (thread_id) DO UPDATE SET summary = $2, created_at = now()`,
		threadID, summary)
	return err
}

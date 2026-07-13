package db

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2"

	"github.com/Nishal77/volt/backend/internal/crypto"
)

// ErrNoToken is returned when no Gmail account has been connected yet.
var ErrNoToken = errors.New("db: no gmail token stored")

// ponytail: single self-hosted instance, single Gmail account (CLAUDE.md
// non-negotiable) — one row, no user_id/account table. Add multi-row
// support only if that non-negotiable ever changes.
const schema = `
CREATE TABLE IF NOT EXISTS gmail_token (
	id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
	encrypted_token BYTEA NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`

// EnsureSchema creates the token table if it doesn't exist yet.
func EnsureSchema(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, schema)
	return err
}

// SaveToken encrypts and upserts the single stored Gmail OAuth token.
func SaveToken(ctx context.Context, pool *pgxpool.Pool, key []byte, tok *oauth2.Token) error {
	plaintext, err := json.Marshal(tok)
	if err != nil {
		return fmt.Errorf("db: marshal token: %w", err)
	}
	blob, err := crypto.Encrypt(key, plaintext)
	if err != nil {
		return fmt.Errorf("db: encrypt token: %w", err)
	}
	_, err = pool.Exec(ctx, `
		INSERT INTO gmail_token (id, encrypted_token, updated_at)
		VALUES (1, $1, now())
		ON CONFLICT (id) DO UPDATE SET encrypted_token = $1, updated_at = now()`,
		blob)
	return err
}

// GetToken decrypts and returns the stored Gmail OAuth token, or ErrNoToken
// if no account has been connected yet.
func GetToken(ctx context.Context, pool *pgxpool.Pool, key []byte) (*oauth2.Token, error) {
	var blob []byte
	err := pool.QueryRow(ctx, `SELECT encrypted_token FROM gmail_token WHERE id = 1`).Scan(&blob)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNoToken
	}
	if err != nil {
		return nil, fmt.Errorf("db: query token: %w", err)
	}
	plaintext, err := crypto.Decrypt(key, blob)
	if err != nil {
		return nil, fmt.Errorf("db: decrypt token: %w", err)
	}
	var tok oauth2.Token
	if err := json.Unmarshal(plaintext, &tok); err != nil {
		return nil, fmt.Errorf("db: unmarshal token: %w", err)
	}
	return &tok, nil
}

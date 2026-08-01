package db

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Nishal77/volt/backend/internal/crypto"
)

// ErrNoOAuthClient is returned when no Google OAuth client has been
// configured yet, whether via .env or the in-app setup screen.
var ErrNoOAuthClient = errors.New("db: no oauth client stored")

type oauthClientConfig struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
}

// SaveOAuthClient persists a self-hoster's own Google OAuth client, letting
// them configure it from the running app instead of editing .env — see
// docs/decisions for the in-app setup screen this backs.
func SaveOAuthClient(ctx context.Context, pool *pgxpool.Pool, encKey []byte, clientID, clientSecret string) error {
	plaintext, err := json.Marshal(oauthClientConfig{ClientID: clientID, ClientSecret: clientSecret})
	if err != nil {
		return fmt.Errorf("db: marshal oauth client: %w", err)
	}
	blob, err := crypto.Encrypt(encKey, plaintext)
	if err != nil {
		return fmt.Errorf("db: encrypt oauth client: %w", err)
	}
	_, err = pool.Exec(ctx, `
		INSERT INTO oauth_client (id, encrypted_config, updated_at)
		VALUES (1, $1, now())
		ON CONFLICT (id) DO UPDATE SET encrypted_config = $1, updated_at = now()`,
		blob)
	return err
}

// GetOAuthClient decrypts and returns the stored client ID and secret, or
// ErrNoOAuthClient if none has been configured yet.
func GetOAuthClient(ctx context.Context, pool *pgxpool.Pool, encKey []byte) (clientID, clientSecret string, err error) {
	var blob []byte
	err = pool.QueryRow(ctx, `SELECT encrypted_config FROM oauth_client WHERE id = 1`).Scan(&blob)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", ErrNoOAuthClient
	}
	if err != nil {
		return "", "", fmt.Errorf("db: query oauth client: %w", err)
	}
	plaintext, err := crypto.Decrypt(encKey, blob)
	if err != nil {
		return "", "", fmt.Errorf("db: decrypt oauth client: %w", err)
	}
	var cfg oauthClientConfig
	if err := json.Unmarshal(plaintext, &cfg); err != nil {
		return "", "", fmt.Errorf("db: unmarshal oauth client: %w", err)
	}
	return cfg.ClientID, cfg.ClientSecret, nil
}

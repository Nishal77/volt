package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrVaultNotSetUp means no passphrase has ever been configured — first
// boot, or a fresh database.
var ErrVaultNotSetUp = errors.New("db: vault not set up")

// SaveVaultConfig stores the salt and a verifier ciphertext (a known
// plaintext encrypted with the derived key), so a later unlock attempt can
// tell a wrong passphrase from a right one before touching real
// credentials. Never stores the key itself — only what's needed to check
// it and re-derive it from a correct passphrase.
func SaveVaultConfig(ctx context.Context, pool *pgxpool.Pool, salt, verifier []byte) error {
	_, err := pool.Exec(ctx, `
		INSERT INTO vault_config (id, salt, verifier)
		VALUES (1, $1, $2)
		ON CONFLICT (id) DO UPDATE SET salt = $1, verifier = $2`,
		salt, verifier)
	return err
}

func GetVaultConfig(ctx context.Context, pool *pgxpool.Pool) (salt, verifier []byte, err error) {
	err = pool.QueryRow(ctx, `SELECT salt, verifier FROM vault_config WHERE id = 1`).Scan(&salt, &verifier)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil, ErrVaultNotSetUp
	}
	if err != nil {
		return nil, nil, fmt.Errorf("db: query vault config: %w", err)
	}
	return salt, verifier, nil
}

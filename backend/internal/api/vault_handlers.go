package api

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2"

	"github.com/Nishal77/volt/backend/internal/crypto"
	"github.com/Nishal77/volt/backend/internal/db"
	"github.com/Nishal77/volt/backend/internal/gmailapi"
	"github.com/Nishal77/volt/backend/internal/vault"
)

// hydrateOAuthClient loads a previously in-app-configured OAuth client back
// into the live config after unlock, so a self-hoster who set it up via the
// UI (rather than .env) doesn't have to re-enter it every restart.
func hydrateOAuthClient(ctx *gin.Context, pool *pgxpool.Pool, oauthCfg *oauth2.Config, key []byte) {
	clientID, clientSecret, err := db.GetOAuthClient(ctx.Request.Context(), pool, key)
	if err == nil {
		gmailapi.SetClient(oauthCfg, clientID, clientSecret)
	}
}

const vaultVerifierPlaintext = "volt-vault-ok"

type passphraseRequest struct {
	Passphrase string `json:"passphrase" binding:"required,min=8"`
}

func vaultStatusHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		_, _, err := db.GetVaultConfig(c.Request.Context(), pool)
		setUp := !errors.Is(err, db.ErrVaultNotSetUp)
		c.JSON(http.StatusOK, gin.H{"setup": setUp, "unlocked": vault.Unlocked()})
	}
}

// vaultSetupHandler runs exactly once — the first time this instance ever
// starts. It picks the salt, derives the key from the given passphrase,
// and stores a verifier so future unlocks can check the passphrase without
// touching real credentials.
func vaultSetupHandler(pool *pgxpool.Pool, oauthCfg *oauth2.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req passphraseRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_body"})
			return
		}
		if _, _, err := db.GetVaultConfig(c.Request.Context(), pool); !errors.Is(err, db.ErrVaultNotSetUp) {
			c.JSON(http.StatusConflict, gin.H{"error": "already_set_up"})
			return
		}

		salt, err := vault.NewSalt()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "salt_generation_failed"})
			return
		}
		key := vault.DeriveKey(req.Passphrase, salt)
		verifier, err := crypto.Encrypt(key, []byte(vaultVerifierPlaintext))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "setup_failed"})
			return
		}
		if err := db.SaveVaultConfig(c.Request.Context(), pool, salt, verifier); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "setup_failed"})
			return
		}
		vault.Unlock(key)
		hydrateOAuthClient(c, pool, oauthCfg, key)
		c.JSON(http.StatusOK, gin.H{"status": "unlocked"})
	}
}

func vaultUnlockHandler(pool *pgxpool.Pool, oauthCfg *oauth2.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req passphraseRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_body"})
			return
		}
		salt, verifier, err := db.GetVaultConfig(c.Request.Context(), pool)
		if errors.Is(err, db.ErrVaultNotSetUp) {
			c.JSON(http.StatusPreconditionFailed, gin.H{"error": "not_set_up"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "unlock_failed"})
			return
		}

		key := vault.DeriveKey(req.Passphrase, salt)
		plaintext, err := crypto.Decrypt(key, verifier)
		if err != nil || string(plaintext) != vaultVerifierPlaintext {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "wrong_passphrase"})
			return
		}
		vault.Unlock(key)
		hydrateOAuthClient(c, pool, oauthCfg, key)
		c.JSON(http.StatusOK, gin.H{"status": "unlocked"})
	}
}

// vaultResetHandler wipes the vault config and every credential encrypted
// under the old key, so a forgotten passphrase can't lock someone out of
// their own instance forever. There's deliberately no passphrase check
// here — if you knew it, you wouldn't need this. The tradeoff is explicit:
// this destroys stored credentials rather than recovering them, because
// zero-knowledge means the server has no way to do the latter.
func vaultResetHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := db.ResetVault(c.Request.Context(), pool); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "reset_failed"})
			return
		}
		vault.Lock()
		c.JSON(http.StatusOK, gin.H{"status": "reset"})
	}
}

// requireUnlocked returns the vault key or writes a 423 Locked response.
// Every handler that touches an encrypted credential calls this first.
func requireUnlocked(c *gin.Context) ([]byte, bool) {
	key, err := vault.Key()
	if err != nil {
		c.JSON(http.StatusLocked, gin.H{"error": "vault_locked"})
		return nil, false
	}
	return key, true
}

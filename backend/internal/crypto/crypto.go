// Package crypto encrypts OAuth tokens at rest with AES-256-GCM.
//
// ponytail: server-holds-the-key encryption, not the zero-knowledge
// client-side scheme CLAUDE.md locks in for Phase 5. That's this phase's
// explicit floor ("stores tokens encrypted at rest at minimum"), not the
// ceiling — Phase 5 replaces this with the verified client-side scheme.
package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
)

// LoadKey decodes a base64-encoded 32-byte AES-256 key from an env var value.
func LoadKey(base64Key string) ([]byte, error) {
	if base64Key == "" {
		return nil, errors.New("crypto: TOKEN_ENCRYPTION_KEY is not set")
	}
	key, err := base64.StdEncoding.DecodeString(base64Key)
	if err != nil {
		return nil, fmt.Errorf("crypto: decode key: %w", err)
	}
	if len(key) != 32 {
		return nil, fmt.Errorf("crypto: key must be 32 bytes, got %d", len(key))
	}
	return key, nil
}

// Encrypt returns nonce||ciphertext, ready to store as a single blob.
func Encrypt(key, plaintext []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	return gcm.Seal(nonce, nonce, plaintext, nil), nil
}

// Decrypt reverses Encrypt.
func Decrypt(key, blob []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonceSize := gcm.NonceSize()
	if len(blob) < nonceSize {
		return nil, errors.New("crypto: ciphertext too short")
	}
	nonce, ciphertext := blob[:nonceSize], blob[nonceSize:]
	return gcm.Open(nil, nonce, ciphertext, nil)
}

// Package vault holds the master encryption key in memory only, derived
// from a passphrase the self-hoster enters after each server start. The
// key is never written to disk, env, or DB — restart the process and it's
// gone until unlocked again. This is what makes the "self-hosted server
// never sees plaintext" claim (CLAUDE.md §3) actually true: a stolen DB
// dump plus a stolen server is still useless without the passphrase, which
// exists only in the operator's head and briefly in process memory.
package vault

import (
	"crypto/rand"
	"errors"
	"sync"

	"golang.org/x/crypto/argon2"
)

// ErrLocked means no passphrase has unlocked the vault yet this process
// lifetime — every credential-touching handler must check this first.
var ErrLocked = errors.New("vault: locked")

const (
	saltLen      = 16
	keyLen       = 32 // AES-256
	argonTime    = 1
	argonMemory  = 64 * 1024 // 64 MiB
	argonThreads = 4
)

var (
	mu  sync.RWMutex
	key []byte
)

// NewSalt generates a random salt for first-time vault setup.
func NewSalt() ([]byte, error) {
	salt := make([]byte, saltLen)
	_, err := rand.Read(salt)
	return salt, err
}

// DeriveKey turns a passphrase + salt into a 32-byte AES key via Argon2id.
// Same primitive libsodium's pwhash uses; golang.org/x/crypto was already
// an indirect dependency, so no new library is added for this (ADR 0003).
func DeriveKey(passphrase string, salt []byte) []byte {
	return argon2.IDKey([]byte(passphrase), salt, argonTime, argonMemory, argonThreads, keyLen)
}

// Unlock holds the derived key in memory for the rest of this process's
// life, or until Lock is called.
func Unlock(k []byte) {
	mu.Lock()
	defer mu.Unlock()
	key = k
}

// Lock discards the in-memory key. Every handler goes back to ErrLocked
// until Unlock is called again.
func Lock() {
	mu.Lock()
	defer mu.Unlock()
	key = nil
}

// Key returns the unlocked key, or ErrLocked if the vault hasn't been
// unlocked this process lifetime.
func Key() ([]byte, error) {
	mu.RLock()
	defer mu.RUnlock()
	if key == nil {
		return nil, ErrLocked
	}
	return key, nil
}

// Unlocked reports whether the vault currently holds a key.
func Unlocked() bool {
	mu.RLock()
	defer mu.RUnlock()
	return key != nil
}

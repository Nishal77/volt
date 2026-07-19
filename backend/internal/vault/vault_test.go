package vault

import "testing"

func TestDeriveKeyDeterministicPerSaltAndDifferentAcrossPassphrases(t *testing.T) {
	salt, err := NewSalt()
	if err != nil {
		t.Fatalf("new salt: %v", err)
	}

	k1 := DeriveKey("correct horse battery staple", salt)
	k2 := DeriveKey("correct horse battery staple", salt)
	if string(k1) != string(k2) {
		t.Fatal("same passphrase + salt must derive the same key")
	}

	k3 := DeriveKey("wrong passphrase", salt)
	if string(k1) == string(k3) {
		t.Fatal("different passphrases must derive different keys")
	}
	if len(k1) != keyLen {
		t.Fatalf("expected %d-byte key, got %d", keyLen, len(k1))
	}
}

func TestLockedUntilUnlocked(t *testing.T) {
	Lock()
	if _, err := Key(); err != ErrLocked {
		t.Fatalf("expected ErrLocked before Unlock, got %v", err)
	}
	if Unlocked() {
		t.Fatal("expected Unlocked() false before Unlock")
	}

	Unlock([]byte("some-32-byte-key-aaaaaaaaaaaaaaa"))
	k, err := Key()
	if err != nil {
		t.Fatalf("expected no error after Unlock, got %v", err)
	}
	if string(k) != "some-32-byte-key-aaaaaaaaaaaaaaa" {
		t.Fatal("Key() did not return the unlocked key")
	}

	Lock()
	if _, err := Key(); err != ErrLocked {
		t.Fatal("expected ErrLocked again after Lock")
	}
}

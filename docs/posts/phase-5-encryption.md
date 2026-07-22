# Phase 5 — Zero-Knowledge Vault

Volt (open-source, self-hosted Gmail client) now has zero-knowledge
encryption — same pattern Bitwarden uses, not just "we encrypt stuff."

Your Gmail token and AI provider key are AES-256-GCM encrypted. The key
itself is never stored — not in the database, not in an env var, not on
disk, anywhere. It's derived from a passphrase you set (Argon2id — a
memory-hard KDF), and it lives only in server process memory, only while
unlocked.

Restart the server and the key is gone. You have to unlock again with
your passphrase before Gmail or AI features work. Lose the passphrase and
there's no recovery — that's the actual tradeoff of zero-knowledge, not a
caveat I'm hiding.

I didn't just claim this — I killed the actual server process mid-session
and confirmed the key was really gone from memory, not simulated, then
pulled the encrypted row straight out of Postgres with psql to confirm
it's ciphertext, not plaintext with extra steps.

Full writeup: `docs/decisions/0003-zero-knowledge-vault.md`.

#buildinpublic #opensource #security #encryption

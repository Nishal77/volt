# Volt

Open-source, self-hostable, keyboard-first Gmail client with BYO-AI-key
features and a native MCP server.

Full quickstart, screenshots, and badges land in Phase 8 (Launch) —
this README currently covers what Phase 5 requires: the security model.

## Security

Volt encrypts your Gmail OAuth token and AI provider key with AES-256-GCM.
The encryption key itself is never stored anywhere — not in the database,
not in an env var, not on disk.

Instead, the key is derived from a passphrase you set on first run
(Argon2id — the same class of memory-hard KDF libsodium uses) and held in
server process memory only, for that process's lifetime. Restart the
server and it's gone; you unlock again with your passphrase before Gmail
or AI features work.

This means a stolen database dump plus a compromised server is still not
enough to read your credentials — the key exists only where you put it: in
your head, and briefly in memory while unlocked. There is no recovery
mechanism if you lose the passphrase, by design.

Details: [`docs/decisions/0003-zero-knowledge-vault.md`](docs/decisions/0003-zero-knowledge-vault.md).

## Self-hosting

See `deploy/docker-compose.yml` and `deploy/.env.example`.

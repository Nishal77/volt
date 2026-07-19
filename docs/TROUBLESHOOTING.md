# Troubleshooting

Grows out of Phase 7's clean-machine and real-user tests. If you hit
something not listed here, please open an issue — that gap is exactly
what this doc exists to close.

## Backend never becomes healthy / `docker compose up` hangs

Check `docker compose logs backend`. Common cause: Postgres not yet
accepting connections — the backend's `depends_on: service_healthy`
should handle this, but if you edited the compose file, confirm the
healthcheck is still wired.

## OAuth redirect mismatch / "redirect_uri_mismatch" error

`GOOGLE_REDIRECT_URL` in `.env` must exactly match a redirect URI
registered on your own Google Cloud OAuth client (see
[SELF_HOSTING.md](SELF_HOSTING.md) step 2). This is a value you own and
configure yourself — Volt has no shared OAuth client.

## Locked out after every restart

Expected behavior, not a bug: the encryption key lives only in server
process memory (zero-knowledge design,
[ADR 0003](decisions/0003-zero-knowledge-vault.md)). Every restart
requires `POST /api/vault/unlock` (or the `/unlock` UI page) again with
your passphrase. There is no recovery path if the passphrase is lost.

## AI features return "ai_not_configured"

You haven't saved a provider API key yet — Settings → AI. Volt never
ships with a default key; it's BYO-key by design.

## Setup is taking a long time

Three separate credential steps are expected: Google OAuth client, vault
passphrase, and (optional) AI provider key. If any single step is taking
more than a few minutes, that's worth reporting as a friction point —
open an issue with which step and what was unclear.

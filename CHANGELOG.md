# Changelog

All notable changes to Volt are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/), versioned by phase since
this project hasn't cut a release yet.

## Phase 7 — Self-Host Hardening (in progress)
### Added
- `scripts/clean-machine-test.sh` — clean-machine boot check.
- `docs/SELF_HOSTING.md`, `docs/TROUBLESHOOTING.md`, `SECURITY.md`.
### Fixed
- `.gitignore` was blocking `CLAUDE.md` and most of `docs/` from ever
  being committed — removed the offending rules, backfilled everything
  that had silently never been tracked.

## Phase 6 — MCP Server
### Added
- `mcp-server/`: native MCP server (TypeScript, official SDK) exposing
  `list_inbox`, `get_thread`, `search_inbox`, `draft_reply` as tools.
  `draft_reply` returns text only — no send/auto-send tool exists.

## Phase 5 — Zero-Knowledge Vault
### Added
- `backend/internal/vault`: Argon2id passphrase-derived AES-256-GCM
  encryption key, held in server memory only, never persisted.
  `/api/vault/setup` and `/api/vault/unlock`; credential-touching
  endpoints return 423 until unlocked.
- `/unlock` frontend page, auto-redirects from `/inbox` on 423.
### Removed
- `TOKEN_ENCRYPTION_KEY` env var — replaced by the passphrase-derived
  key, not layered on top of it.

## Phase 4 — AI Layer
### Added
- BYO-AI-key settings, on-demand summarize/draft/search over the inbox.
- Visible error banner on AI failures (was previously silent/console-only).

## Phase 3 — Speed Layer
### Added
- Keyboard shortcuts, command palette, and snippets — inbox fully
  operable without a mouse.

## Phase 2 — Gmail Auth & Core Inbox
### Added
- Gmail OAuth connect flow, encrypted token storage.
- Inbox read, archive, reply.
### Fixed
- CORS on the backend API; root path redirects to `/inbox`.

## Phase 1 — Foundation
### Added
- Backend (Go), frontend (Next.js), Postgres, and CI wired up.
- `/health` endpoint with router test coverage.

## Phase 0 — Validation
No code changes — this phase produced only the go/no-go signal to build,
not shippable artifacts.

# ADR 0003 — Zero-knowledge credential vault via passphrase-derived key

## Status
Accepted.

## Context
Phase 2 and Phase 4 stored the Gmail OAuth token and BYO AI key encrypted
with AES-256-GCM, but the key itself was a static `TOKEN_ENCRYPTION_KEY`
env var the server held and could decrypt with at any time. That's
encryption at rest, not the zero-knowledge pattern CLAUDE.md §3 claims
("the self-hosted server never sees plaintext... same approach Bitwarden
uses") — a server compromise plus a DB dump was enough to read everything.

Phase 5's spec (`docs/specs/phase-5-encryption.md`) left the actual
mechanism as an open question ("age vs. libsodium, not yet decided") and
flagged this as one of the roadmap's two highest-risk phases. Two paths
were possible: (a) keep the server-managed key and just verify + document
it honestly as "encrypted at rest," or (b) build real zero-knowledge. The
project owner chose (b).

## Decision
- The self-hoster sets a passphrase on first run (`POST /api/vault/setup`).
- The encryption key is derived from that passphrase via Argon2id
  (`backend/internal/vault`), using `golang.org/x/crypto/argon2` — already
  an indirect dependency (see ADR 0002's reasoning for preferring existing,
  well-vetted primitives over a new SDK/binding for "age" or "libsodium").
- The derived key lives in server process memory only
  (`internal/vault`'s package-level holder), never written to disk, env,
  or the database. Restarting the process discards it.
- Every server restart requires unlocking again
  (`POST /api/vault/unlock`), verified against a stored verifier
  ciphertext — a known plaintext encrypted with the derived key — not
  against the real credentials, so a wrong passphrase never risks
  corrupting real data.
- Postgres stores only: a random salt, the verifier ciphertext, and the
  AES-256-GCM-encrypted Gmail token / AI key. No plaintext, no key,
  anywhere at rest.

## Rationale
Argon2id is the same class of primitive libsodium's `pwhash` uses
(memory-hard KDF resistant to GPU/ASIC brute force), without adding a cgo
dependency or a new library the codebase has to trust. `age` is designed
for file encryption with recipient keys, not for deriving a symmetric key
from a low-entropy human passphrase — the wrong tool for this shape of
problem.

## Consequences
- Every server restart requires the operator to re-enter the passphrase
  before Gmail/AI features work again — `423 Locked` on all
  credential-touching endpoints until then. This is inherent to real
  zero-knowledge, not a bug: friction is the price of the server
  genuinely being unable to decrypt on its own.
- Losing the passphrase means losing access to stored credentials — no
  recovery mechanism, by design. Re-running setup after data loss means
  reconnecting Gmail and re-entering the AI key.
- Pre-Phase-5 data encrypted under the old static env-var key cannot be
  decrypted after this change (different key entirely). Acceptable pre-launch
  with no real users; would need a real migration path if this landed
  post-launch.

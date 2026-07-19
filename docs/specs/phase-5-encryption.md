# Phase 5 — Security Layer: Client-Side Encryption

## Status
Draft — depends on which library (age or libsodium) gets chosen; §4 Tech
Stack lists both as options without picking one. Also flagged by Advisor
Notes (p.2) as one of the roadmap's two self-identified risk phases for
running long.

## Source
`docs/volt_prd.pdf` §4 (Tech Stack — Encryption row), §8 (NFR — Security:
"client-side encryption preferred (P0)"), §10 (Technical Risks — client-side
encryption engineering time), §12 Phase 5 subsection. CLAUDE.md §3
(Non-negotiables — client-side encryption must be independently verified
against the actual Postgres data, not assumed true from code review alone;
this standard applies retroactively to anything touching credentials before
Phase 5).

## Objective
Make the structural claim "the self-hosted server never sees plaintext"
actually true, verified by direct inspection — not just documented or
assumed from code review (§12, CLAUDE.md §3).

## In Scope
- Client-side encryption for stored credentials/tokens, using age or
  libsodium (§12, §4).
- Verify server-side storage is genuinely ciphertext-only — test this
  explicitly, don't assume (§12).
- Document the encryption approach in the repo README security section
  (§12).

## Explicit Non-Scope
- Any new user-facing feature — this phase is entirely a verification and
  hardening pass on storage already built in Phases 2 and 4 (OAuth tokens,
  AI provider key). No new product surface.
- WCAG audit, formal compliance work, penetration testing — explicitly and
  permanently deferred per §8: "No WCAG audit, no formal compliance work, no
  penetration test planned for v1 given the solo, no-budget constraint."
  Not owned by this phase or any other phase in the v1 roadmap.
- Multi-tenant or scalability work — explicitly and permanently deferred
  per §8 ("V1 targets single-user, single-instance self-hosting only").

## Dependencies
Phase 4's exit gate (AI layer working, including the AI-key storage this
phase must now verify). This phase also retroactively covers the OAuth
token storage built in Phase 2, per CLAUDE.md §3's note that the
verification standard "applies retroactively to anything touching
credentials before then."

## Interfaces Touched
- Postgres: credential/token storage tables built in Phase 2 (OAuth
  tokens) and Phase 4 (AI provider key) — schema/storage format changes to
  make them genuinely ciphertext-only.
- Encryption library: age or libsodium (client-side) — specific choice not
  yet made (see Status).
- `README.md` security section (documentation only, no new runtime
  interface).

## Exit Gate
Inspect your own Postgres database directly and confirm no plaintext
credentials are visible (§12, CLAUDE.md §3). This must be an actual `psql`
inspection of the live database, not a code-review assertion that
encryption is applied.

## Open Questions Carried Forward
- Encryption library choice: age vs. libsodium — not yet decided (§4).
- [Inference] (§10): client-side encryption adds real engineering time
  beyond basic CRUD sync — not precisely budgeted; this is one of the two
  phases (with Phase 6) Advisor Notes (p.2) flag as most likely to run long
  against the working 11-week timeline.

## Build-in-Public Deliverable
Technical deep-dive post: "How Volt keeps your credentials encrypted even
from the self-hosted server — same pattern Bitwarden uses," to LinkedIn —
§14 calls this "most resume-relevant post — don't skip writing it." A
condensed thread version links to the full write-up; post to
r/selfhosted-adjacent security subs, where §14 notes the technical audience
"will scrutinize this one — be ready to defend the specifics."

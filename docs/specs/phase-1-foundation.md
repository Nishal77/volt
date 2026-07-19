# Phase 1 — Foundation & Setup

## Status
Confirmed.

## Source
`docs/volt_prd.pdf` §4 (Tech Stack), §7 P0 table ("Deploy via Docker
Compose"), §12 Phase 1 subsection. CLAUDE.md §4 (Tech stack table), §6
(Conventions — ADR numbering, commit format), §10 (Commands).

## Objective
Stand up boring infrastructure once, correctly, so it doesn't need
revisiting later. This phase produces no user-facing feature — it produces
the skeleton (repo, backend, frontend, Docker Compose, OAuth client setup,
CI) that every subsequent phase builds on.

## In Scope
- Repo setup: monorepo, license (MIT or Apache 2.0 — CLAUDE.md §5 states
  Apache 2.0 is already chosen) (§12).
- Go backend skeleton (Gin or Echo — decide and record in ADR 0001 per
  CLAUDE.md §4), Postgres connection via pgx, health-check endpoint (§12,
  CLAUDE.md §4).
- Next.js frontend skeleton, deployed to a dev environment, Bun-managed
  (§12, CLAUDE.md §4).
- Docker Compose file spinning up backend + Postgres + frontend together
  (§12).
- Google Cloud OAuth client setup + self-hoster documentation (§12) — this
  is creating the OAuth client and documenting the steps, not implementing
  the consent flow itself.
- CI: basic lint/build check on push, GitHub Actions with
  `oven-sh/setup-bun` for JS/TS jobs and standard Go toolchain for backend
  (§12, CLAUDE.md §4).

## Explicit Non-Scope
- Gmail OAuth2 consent flow implementation and token storage — owned by
  Phase 2. This phase only creates the OAuth client and writes the
  self-hoster setup steps.
- sqlc query generation — explicitly deferred to Phase 2 per CLAUDE.md §4
  (ADR 0002): "no real queries exist yet in Phase 1, don't scaffold it
  early."
- Any inbox UI, keyboard navigation, or AI feature — owned by Phases 2–4
  respectively.
- Production-hardening of the Docker Compose setup (friction-point fixes,
  clean-machine testing) — owned by Phase 7. This phase's exit gate only
  requires a clean machine to produce a running *empty* app.

## Dependencies
Phase 0's exit gate (some signal people want this) should be met before
starting, per Advisor Notes (p.2) and this phase's own predecessor spec.
No unresolved decisions block *starting* this phase — the one open decision
(Gin vs. Echo) is resolved inside it.

## Interfaces Touched
- New: Go backend service (framework TBD this phase), Postgres database
  (via pgx), Next.js frontend app, Docker Compose stack (`deploy/`), CI
  workflow (`.github/workflows/ci.yml`), Google Cloud OAuth client
  (credentials only, no consent flow).
- No Gmail API calls yet, no MCP surface yet.

## Exit Gate
`docker compose up` on a clean machine gives a running (empty) app with a
health-check endpoint passing (§12, CLAUDE.md §7). Verify by running this
on a genuinely clean environment, not the builder's already-configured dev
machine.

## Open Questions Carried Forward
- Backend framework: Gin vs. Echo — not yet chosen (§4 Tech Stack table
  lists both as options). This phase is where it gets decided; CLAUDE.md §4
  requires the decision be recorded in ADR 0001 and not revisited later
  without a new ADR.
- [Inference] (§10): Google's OAuth verification for sensitive scopes
  likely requires app review beyond a small test-user allowlist — not yet
  researched in depth. Advisor Notes (p.2) recommend resolving this research
  question during this phase (Phase 1), even though the consent flow itself
  isn't implemented until Phase 2 — so the answer is known before it can
  block Phase 7's stranger self-host test.

## Build-in-Public Deliverable
"Day 1 of building in public: repo is live, here's the stack and why I
picked Go over Node for the backend," linking the repo, on LinkedIn/X; a
terminal GIF of `docker compose up` succeeding, posted to relevant
build-in-public accountability Discords (§14).

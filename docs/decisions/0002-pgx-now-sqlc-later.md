# ADR 0002: Raw pgx now, sqlc deferred to Phase 2

## Status
Accepted

## Context
CLAUDE.md §4 locks Postgres access via pgx, with sqlc explicitly deferred:
"no real queries exist yet in Phase 1, don't scaffold it early."

## Decision
Phase 1 uses `github.com/jackc/pgx/v5/pgxpool` directly for the connection
pool and health-check ping. No sqlc generation step, no query files, no
generated code.

## Rationale
sqlc generates typed Go from actual SQL queries. Phase 1 has exactly one
database interaction — a health-check ping — and no schema yet. Wiring up
sqlc's codegen pipeline against zero real queries is scaffolding for a
problem that doesn't exist yet; it gets adopted in Phase 2 once real
queries (token storage, inbox sync) exist to generate from.

## Consequences
`backend/internal/db` stays a thin pgxpool wrapper through Phase 1. Phase 2
introduces sqlc, a `migrations/` directory, and generated query code —
this ADR's scope ends where that begins.

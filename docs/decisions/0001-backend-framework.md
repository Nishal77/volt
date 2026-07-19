# ADR 0001 — Backend web framework: Gin

## Status
Accepted.

## Context
CLAUDE.md §4 leaves the choice between Gin and Echo open, to be decided and
recorded in Phase 1. Both are equivalent-weight Go HTTP routers with
middleware support; nothing in the PRD requires a feature unique to either.

## Decision
Gin (`github.com/gin-gonic/gin`).

## Rationale
- Largest community/ecosystem of the two, which matters for a solo
  maintainer answering self-hoster issues.
- `gin.Context` covers everything this project needs (routing, middleware,
  JSON binding) with no additional abstraction.

## Consequences
All backend HTTP handlers (`backend/internal/api/`) are written against
`gin.Context`. This is a locked decision per CLAUDE.md §4 — revisiting it
requires a new ADR, not an inline change.

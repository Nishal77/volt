# ADR 0001: Backend framework — Gin

## Status
Accepted

## Context
CLAUDE.md §4 locks the backend language as Go and leaves the router
framework as "Gin or Echo," to be picked in Phase 1 and not revisited
without a new ADR.

## Decision
Gin.

## Rationale
Both are thin, comparable routers with similar performance and no
meaningful gap for Volt's needs (a handful of REST endpoints, no exotic
routing). Gin has the larger ecosystem and more prior art to pull from when
wiring up OAuth middleware, request validation, and error handling in
later phases — lower friction for a solo maintainer than Echo's smaller
but comparable feature set. Neither choice is a lock-in; swapping later
would touch only `internal/api`.

## Consequences
All backend routing, middleware, and request/response handling in
`backend/internal/api` uses Gin's `*gin.Engine` and `gin.Context`. Do not
introduce Echo alongside it — one router framework, per this ADR.

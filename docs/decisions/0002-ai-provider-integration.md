# ADR 0002 — AI provider integration: stdlib HTTP, no SDK

## Status
Accepted.

## Context
Phase 4 needs to call the user's own Claude or OpenAI key (BYO-key, CLAUDE.md
§3 — Volt never absorbs inference cost). Both providers expose a simple
JSON-over-HTTP chat/completions endpoint. No SDK was already a project
dependency for either provider.

## Decision
Call both providers directly via Go's `net/http` and `encoding/json`
(`backend/internal/ai/ai.go`). No `anthropic-sdk-go` or `openai-go`
dependency added.

## Rationale
- Both APIs are a single POST with a JSON body and a bearer/API-key header —
  not enough surface to justify an SDK's abstraction.
- One fewer third-party dependency in a project whose differentiator is
  auditability; the whole request/response shape is visible in one file.
- Prompt templates load from `docs/prompts/` at runtime (CLAUDE.md §6) —
  keeping the HTTP call itself equally plain keeps the whole AI path
  inspectable without SDK internals in the way.

## Consequences
Adding a third provider means writing its own `completeX` function
following the same shape — a few lines, not a new abstraction. If a
provider's API grows real complexity (streaming, tool use, retries) that
stdlib starts duplicating, revisit with a new ADR rather than organically
growing this file into a bespoke SDK.

# ADR 0004 — MCP server transport: stdio, no network auth

## Status
Accepted.

## Context
Phase 6's spec flags an unresolved question: who's allowed to connect to
the MCP server, and is it local-only or network-exposed? The PRD doesn't
define this, and CLAUDE.md §3's minimum-necessary-access stance means it
shouldn't be defaulted silently.

## Decision
The MCP server uses stdio transport only — the MCP client (Claude Code,
Cursor, Claude Desktop) spawns `mcp-server/src/index.ts` as a local
subprocess and talks to it over stdin/stdout. No HTTP/SSE transport, no
network port, no auth token.

## Rationale
- Matches CLAUDE.md's self-host-only, single-user philosophy exactly:
  whoever can run a process on this machine can already read the Postgres
  DB and the backend's env — stdio adds no new attack surface beyond what
  already exists.
- stdio is the standard transport for local dev-tool MCP servers (this is
  how Claude Code and Cursor's own bundled MCP servers work) — no
  bespoke auth scheme to design, implement, or get wrong.
- The MCP server itself holds no credentials (it's a thin HTTP proxy to
  the already-running Volt backend, per `mcp-server/README.md`) — the real
  access control is the backend's own vault unlock state. A spawned MCP
  process with a locked vault gets `423`/`401` errors from every tool
  call, same as any other unauthenticated HTTP client.

## Consequences
If Volt ever needs a *remote* MCP client (not spawned locally by the same
machine running the backend), this decision needs revisiting with a new
ADR — stdio fundamentally can't do that, and a network transport would
need real auth, which is explicitly out of scope here.

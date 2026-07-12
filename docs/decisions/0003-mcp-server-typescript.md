# ADR 0003: MCP server — TypeScript, official MCP SDK

## Status
Accepted

## Context
CLAUDE.md §4 locks the MCP server (built in Phase 6) as TypeScript using the
official MCP SDK, Bun-managed — distinct from the Go backend.

## Decision
`mcp-server/` is TypeScript, using the official Model Context Protocol SDK,
managed with Bun (matching the frontend's package-manager convention).

## Rationale
Go has no official MCP SDK as of this writing. The MCP server's job is to
expose inbox actions as tools to an MCP client (Claude Code, Cursor) —
correctness and fidelity to the protocol spec matter more than runtime
uniformity with the Go backend, and the official SDK only exists for
TypeScript (and Python). TypeScript also keeps it in the same
Bun-managed toolchain as the frontend, avoiding a third package manager.

## Consequences
`mcp-server/` is a separate Bun-managed TypeScript package, not part of the
Go module. It calls the Go backend's HTTP API to perform inbox actions
rather than sharing Go code directly. This ADR is recorded now, ahead of
Phase 6's implementation, so the language choice isn't silently assumed
when that phase starts.

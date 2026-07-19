# Phase 6 — MCP Server

## Status
Draft — depends on Phase 5 completing (this phase's tools expose
credentials/data that Phase 5 is responsible for having verified as
properly encrypted at rest). Also flagged by Advisor Notes (p.2) as one of
the roadmap's two self-identified risk phases for running long.

## Source
`docs/volt_prd.pdf` §2 (Goals — "if time allows, complete through Phase 8"),
§4 (Tech Stack — Agent integration row), §7 P0 table ("Native MCP server"),
§12 Phase 6 subsection. CLAUDE.md §4 (MCP server is TypeScript, official MCP
SDK, Bun-managed; ADR 0003 explains why not Go — "Go has no official MCP
SDK").

## Objective
Build the headline differentiator and the most direct, current signal of
the agentic-AI skill being demonstrated (§7, §12): an MCP server exposing
the live inbox as tools a real MCP client (Claude Code, Cursor) can call.

## In Scope
- Build an MCP server exposing inbox read/search/draft actions as tools
  (§12).
- Test it end-to-end with Claude Code or Cursor actually calling it (§12).
- Document setup so others can connect their own Claude/Cursor to their
  self-hosted Volt instance (§12).

## Explicit Non-Scope
- Exposing a send/auto-send action as an MCP tool — §12 names only
  "read/search/draft" as the exposed actions. CLAUDE.md §3's non-negotiable
  ("AI drafting is on-demand only. Never auto-send, never automatic without
  an explicit user click, in any phase including post-launch") applies here
  specifically: an MCP client calling a "draft" tool must still require a
  human to click send in the Volt UI, not complete the send through the MCP
  tool call itself.
- Any new inbox feature (summarize, keyboard nav, encryption) — those are
  Phases 2–5's outputs, reused here, not rebuilt.
- Outlook or any non-Gmail provider surfaced via MCP — Outlook is a
  permanent v1 non-goal (§3) regardless of transport.

## Dependencies
Phase 5's exit gate: verified ciphertext-only credential storage. Exposing
inbox data as MCP tools before that verification exists would mean an
external agent client is querying data whose at-rest security hasn't
actually been confirmed.

## Interfaces Touched
- MCP transport (TypeScript, official MCP SDK, Bun-managed) — new
  `mcp-server/` service per CLAUDE.md §5 repo structure.
- Reuses Phase 2's Gmail read/search actions and Phase 4's draft action,
  exposed as MCP tools rather than rebuilt.
- External MCP clients: Claude Code, Cursor (or any MCP-compatible client)
  connecting to the self-hosted instance.

## Exit Gate
You can ask Claude (via MCP) to "summarize my last 5 unread emails" and get
a real answer from your live inbox (§12). Verify with an actual MCP client
connection to a real, running self-hosted instance — not a mocked tool
response.

## Open Questions Carried Forward
- Timeline risk: this phase and Phase 5 are the two Advisor Notes (p.2)
  name explicitly as most likely to run long against the working 11-week
  estimate.
- No PRD section defines authentication/authorization for the MCP server
  itself (who's allowed to connect, whether it's local-only or
  network-exposed) — not called out as an open question in §10/§11, but
  worth resolving explicitly during this phase rather than defaulting
  silently, given CLAUDE.md §3's broader stance on minimum-necessary access
  and never absorbing risk on the maintainer's behalf.

## Build-in-Public Deliverable
"I connected Claude to my own open-source email client via MCP — here's
what that looks like" — §14 calls this the "best launch-adjacent post; high
novelty." Demo video/GIF tagged to relevant agentic-AI and MCP-focused
accounts; post to r/programming and MCP/LLM-tooling subreddits, and to
MCP/Claude builder Discords, which §14 calls "the single most relevant
community for this specific milestone."

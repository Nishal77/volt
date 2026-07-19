# docs/specs/ — Phase Specs

## What this is

One execution-ready file per roadmap phase (`phase-0-validation.md` through
`phase-9-post-launch.md`). Each file is a complete instruction on its own —
"implement docs/specs/phase-N-*.md" should need no extra context pasted in
chat.

## How this differs from other docs

- **`docs/volt_prd.pdf`** — product-level, whole-project. States what Volt is,
  why it exists, the full feature comparison, personas, non-functional
  requirements, and the phase roadmap at a summary level. Specs are derived
  from it; the PRD is the source of truth for product intent, specs are the
  source of truth for what a given phase actually does.
- **`docs/decisions/` (ADRs)** — retrospective. Written *after* a decision is
  made, explaining why. Specs are prospective — written before/during a
  phase, stating what will be built and what's still open.
- **This directory** — living documents, not frozen on creation. Update a
  phase's spec when reality diverges from what was planned (a decision gets
  made, scope shifts, a dependency turns out wrong). Stale specs are worse
  than no specs.

## Source-file note

The PRD lives at `docs/volt_prd.pdf`, not `docs/PRD.md` as referenced
elsewhere (CLAUDE.md §5's repo-structure listing, this task's own brief).
Citations in these specs point to `docs/volt_prd.pdf §N`. If the PRD is
later converted to Markdown at `docs/PRD.md`, update the citations here to
match — don't let two source-of-truth paths coexist silently.

## Status values

- **Confirmed** (Phases 0–2): inputs already exist or get decided inside the
  phase itself. Full detail.
- **Draft** (Phases 3–9): depends on a decision or a prior phase's outcome
  that doesn't exist yet. The Status line names the specific blocker —
  vague-but-honest beats detailed-but-fictional.

## Index

| Phase | File | Status |
|---|---|---|
| 0 | [phase-0-validation.md](phase-0-validation.md) | Confirmed |
| 1 | [phase-1-foundation.md](phase-1-foundation.md) | Confirmed |
| 2 | [phase-2-gmail-core-inbox.md](phase-2-gmail-core-inbox.md) | Confirmed |
| 3 | [phase-3-speed-layer.md](phase-3-speed-layer.md) | Draft |
| 4 | [phase-4-ai-layer.md](phase-4-ai-layer.md) | Draft |
| 5 | [phase-5-encryption.md](phase-5-encryption.md) | Draft |
| 6 | [phase-6-mcp-server.md](phase-6-mcp-server.md) | Draft |
| 7 | [phase-7-hardening.md](phase-7-hardening.md) | Draft |
| 8 | [phase-8-launch.md](phase-8-launch.md) | Draft |
| 9 | [phase-9-post-launch.md](phase-9-post-launch.md) | Draft |

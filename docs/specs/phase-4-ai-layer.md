# Phase 4 — AI Layer

## Status
Draft — depends on AI quality with a general-purpose model being
[Unconfirmed] against Superhuman's purpose-built pipeline (§10); no
prototyping or benchmarking has happened yet, so this phase's actual
difficulty is unknown until it starts.

## Source
`docs/volt_prd.pdf` §7 P0 table (AI Summarize on demand, AI Draft reply on
demand), §7 P1 table (natural language inbox search), §8 (NFR — AI actions
show loading state within 300ms), §12 Phase 4 subsection. CLAUDE.md §3
(AI drafting is on-demand only, never auto-send, in any phase), §6 (prompt
templates loaded from `docs/prompts/` at runtime, single source of truth).

## Objective
Ship the features that make this an AI-native client, not just a fast one
(§12): on-demand summarize, on-demand draft, and inbox search — all
BYO-AI-key, all user-editable before anything sends.

## In Scope
- BYO-AI-key settings (Claude/OpenAI API key, stored encrypted) (§12, §4
  Tech Stack).
- AI Summarize: one API call per thread, cache the result, display above
  the thread (§12, §7 P0).
- AI Draft (on-demand): user clicks "draft reply," AI generates, user edits
  before sending — never auto-sends (§12, §7 P0, CLAUDE.md §3).
- Natural language inbox search — inbox-only, not calendar/web (§12, §7 P1).
- Prompt templates kept in a visible, documented file in the repo — loaded
  from `docs/prompts/` at runtime, not duplicated in code (§12, CLAUDE.md
  §6).

## Explicit Non-Scope
- Automatic (non-on-demand) AI drafting or auto-labeling — permanent v1
  non-goal (§3), not deferred to any phase, not just this one.
- Automatic AI inbox categorization (Split Inbox auto-categorized) — P2,
  deferred past v1 per §7: "needs a trained triage layer; real risk of
  visibly wrong behavior." No phase in the current v1 roadmap owns this.
- Automatic follow-up detection — P2, deferred past v1 per §7: "polish
  feature, not core to the value proposition." No phase in the current v1
  roadmap owns this.
- AI search across calendar or web — explicitly scoped out; §12 states
  "inbox-only, not calendar/web."
- Client-side zero-knowledge verification of the encryption used to store
  the AI key — this phase stores the key "encrypted" per its own §12 bullet
  (satisfying §8's NFR floor of "encrypted at rest at minimum"); the
  independently-verified, ciphertext-confirmed zero-knowledge scheme is
  Phase 5's job, applied across all stored credentials including this key.
  This ordering is inferred from cross-referencing §4, §8, and §12 — it is
  not stated as a single explicit sentence anywhere in the PRD, so confirm
  it before treating it as settled.

## Dependencies
Phase 3's exit gate: a fully keyboard-operable inbox to summarize, draft
against, and search. No hard blocking decision, but the AI-quality
unknown named in Status above means effort/timeline here is the roadmap's
least-grounded estimate.

## Interfaces Touched
- AI provider API (Claude or OpenAI, user's own key) — BYO-key, no
  maintainer-absorbed inference cost (CLAUDE.md §3).
- New Postgres storage for the encrypted AI provider key.
- `docs/prompts/` — the app reads prompt templates from here at runtime
  (CLAUDE.md §6); this phase is what makes that structurally true rather
  than aspirational.
- Gmail API (read access, already established in Phase 2) — used as input
  context for summarize/draft/search, no new Gmail scopes required.

## Exit Gate
Summarize and draft both work reliably on real threads; search returns
relevant results for test queries (§12). Verify against real Gmail threads
connected in Phase 2, not synthetic fixtures.

## Open Questions Carried Forward
- [Unconfirmed] (§10): AI quality with a general-purpose model vs.
  Superhuman's purpose-built pipeline has not been prototyped or
  benchmarked — directly determines whether this phase's exit gate is easy
  or a multi-week grind.
- Reasonable but unconfirmed (§11): BYO-AI-key architecture is an
  acceptable tradeoff for target users — this phase is the first place that
  tradeoff becomes a real onboarding step rather than a design assumption.
- Timeline risk: Advisor Notes (p.2) don't name Phase 4 directly as a
  flagged risk phase (that's Phases 5–6), but an unbenchmarked AI-quality
  assumption sitting inside a "5–6 week" slot is worth watching.

## Build-in-Public Deliverable
Side-by-side demo: "Here's Volt summarizing a long thread in one click —
and here's exactly what prompt it sent," linking the prompt file in the
repo — the strongest differentiation story per §14 ("transparency-as-a-feature
is the strongest differentiation story, use it directly").

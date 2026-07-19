# Phase 3 — Speed Layer

## Status
Implemented (code-complete). Exit gate (full keyboard-only cycle against a
real Gmail account) not yet run — see root CLAUDE.md §2.

## Source
`docs/volt_prd.pdf` §2 (Goals — "working keyboard nav (Phases 2–3) as the
minimum bar for a credible portfolio artifact"), §7 P0/P1 tables (keyboard
navigation, Command Palette are P0; snippets/templates are P1), §12 Phase 3
subsection.

## Objective
Build half of Superhuman's core value proposition — speed — before AI
exists in the product, so Volt feels fast even with zero AI calls (§12).

## In Scope
- Core keyboard shortcuts: navigate list (j/k), open/close, archive, reply,
  compose, search focus (~15–20 core shortcuts) (§12, §7 P0: "Keyboard-navigate
  the inbox").
- Command Palette (Cmd/Ctrl+K) wired to every action built so far (§12, §7
  P0).
- Basic snippets/templates with variable substitution (§12, §7 P1:
  "Snippets/templates with variables" — basic version; see Explicit
  Non-Scope for the polish pass).

## Explicit Non-Scope
- AI Summarize, AI Draft, natural-language search — owned by Phase 4.
- Snippets/templates *polish* — the basic version ships here, but
  §9 (Post-Launch) explicitly lists "snippets polish" as a Phase 9 item
  shipped "based on real feedback, not the original guess." Don't gold-plate
  snippets in this phase; ship the minimum variable-substitution version and
  let Phase 9 iterate.
- Scheduled send and manual rule-based inbox splitting — both P1
  "should-have" stories (§7) but neither appears in this phase's §12 task
  list; §12's Phase 9 subsection explicitly names "scheduling, manual split
  inbox" as post-launch, feedback-driven work. Don't pull them forward here
  just because they're adjacent P1 stories.
- Client-side encryption — owned by Phase 5.

## Dependencies
Phase 2's exit gate: a working core inbox (connect, read, archive, reply)
that this phase's shortcuts and Command Palette operate on. No new external
decisions block this phase — it's pure frontend work on top of Phase 2's
actions.

## Interfaces Touched
No new external interfaces. Frontend-only: wires existing Phase 2 backend
actions (archive, reply, mark read/unread, thread open) to keyboard
shortcuts and a Command Palette component; adds local snippet storage
(exact persistence layer not yet specified in the PRD).

## Exit Gate
You can operate the entire inbox without touching the mouse (§12). Verify
by completing a full read/archive/reply/compose cycle using only the
keyboard.

## Open Questions Carried Forward
- None specific to this phase surfaced in the PRD's Technical Risks (§10)
  or Open Questions (§11) sections — this is the lowest-risk phase in the
  roadmap by the PRD's own framing (§12: "Cheap to build, high impact" for
  the Command Palette specifically, §7).
- General timeline risk carries forward from Phase 0/1: PRD's Advisor Notes
  (p.2) flag the overall 6–10 vs. 10–11 week timeline disagreement, working
  number 11 weeks — this phase should not be where time gets compressed to
  compensate, since Phases 5 and 6 are the roadmap's own flagged risk
  phases.

## Build-in-Public Deliverable
GIF of flying through the inbox keyboard-only, framed around Superhuman's
core value prop, posted to LinkedIn/X — historically the best-performing
format on X per §14's own note ("speed is visually obvious even to
non-technical viewers").

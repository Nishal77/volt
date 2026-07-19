# Phase 0 — Validation

## Status
Confirmed.

## Source
`docs/volt_prd.pdf` §1 (Problem Statement), §2 (Goals and Success Metrics),
§11 (Open Questions and Risks), §12 Phase 0 subsection, §14 (Build-in-Public
Content Calendar, Phase 0 row). Advisor Notes (p.2, first bullet).

## Objective
Find out whether anyone other than the builder wants an open-source,
self-hostable, keyboard-first Gmail client before spending the following
~10 weeks building it. This is not a feature-building phase — it's the
mechanism that answers the PRD's single largest unvalidated assumption
(§1: "the size of the population that would actually switch is assumed,
not measured").

## In Scope
- Write a one-page landing page: what Volt is, why it's different, a
  waitlist field or GitHub watch/star CTA (§12).
- Post it in r/selfhosted, r/opensource, r/programming, and relevant dev
  Discords/Slacks (§12).
- Post a "here's what I'm about to build and why" thread on LinkedIn/X
  (§12).
- DM 5–10 developers who use Superhuman or complain about SaaS AI pricing
  (§12).
- Track waitlist signups, GitHub stars/watches, comment sentiment (§12).

## Explicit Non-Scope
- Any application code (backend, frontend, infra) — owned by Phase 1.
- Committing to the 11-week roadmap before this phase's exit gate is met —
  per Advisor Notes (p.2): "don't schedule Phase 1 tasks until at least the
  landing page and one round of outreach ... are live."
- Posting to all four content-calendar channels (LinkedIn, X, Reddit, Show
  HN/IH/Discord) as a mandate — Advisor Notes call the §14 calendar "a menu,
  not a mandate." Phase 0's own row already concentrates on Reddit +
  Discord/Slack DMs + LinkedIn/X, which is what's in scope above; Show HN is
  explicitly saved for Phase 8 (§14 notes: "save Reddit for milestones").

## Dependencies
None — this is the first phase. Nothing upstream needs to be true.

## Interfaces Touched
None (no application code). External surfaces only: a static landing page
(not yet built by any phase — this phase's own deliverable), GitHub
repo/watch-star mechanism, Reddit, LinkedIn/X, dev Discords/Slacks.

## Exit Gate
At least some signal that real people want this — not zero response. Verify
by checking the tracked metrics from the In Scope list (waitlist signups,
GitHub stars/watches, comment sentiment) after the landing page and one
outreach round have been live for a meaningful window. Dead silence
everywhere means dig into why or reconsider scope/positioning before
committing to the remaining ~10 weeks (§12).

## Open Questions Carried Forward
- Unvalidated: real switching-demand for "open + self-hosted" separate from
  AI quality — no waitlist/survey/interview data exists yet (§11). This
  phase is the mechanism that answers this question, not a downstream risk
  to someone else.
- The evidence status noted in §1: absence of a direct open-source
  competitor is confirmed (searched multiple "open-source alternative to X"
  directories); the size of the population that would switch is not.

## Build-in-Public Deliverable
Origin-story post: "I'm about to spend 10 weeks building an open-source
Superhuman alternative — here's the gap and why it's worth building," posted
to LinkedIn/X with the empty repo linked; DM outreach to 5–10 target users
in parallel (§14).

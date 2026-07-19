# Phase 8 — Public Launch

## Status
Draft — depends on the undecided `docs/PRD.md` public-vs-private question
(CLAUDE.md §9) being resolved before this phase, since the launch README
and public posts need to be consistent with whatever gets decided about the
PRD's visibility.

## Source
`docs/volt_prd.pdf` §2 (Goals — Show HN / Reddit posts, 100 GitHub stars
within 30 days, 10 verified self-host installs within 60 days), §12 Phase 8
subsection. CLAUDE.md §9 (docs/PRD.md visibility decision must be made
"before Phase 8").

## Objective
Get Volt in front of the audience validated back in Phase 0 (§12) — the
first real public exposure of the finished v1 scope.

## In Scope
- Finalize README: what it is, why it exists, screenshots/GIF, quickstart,
  security section, roadmap link (§12).
- Show HN post (§12).
- r/selfhosted, r/opensource launch posts (§12).
- LinkedIn/X launch thread tying together the whole build-in-public arc
  (§12).
- DM the people who showed interest in Phase 0 — tell them it's live (§12).

## Explicit Non-Scope
- Rewriting the setup/install instructions from scratch — that's Phase 7's
  job (README/setup docs written and friction-tested against a real
  stranger). This phase's README work builds on that tested baseline,
  adding screenshots/GIF, a security section, and a roadmap link for public
  launch framing — it does not redo Phase 7's onboarding-accuracy work.
- Product Hunt listing — §12 explicitly marks this "optional, lower
  priority than Show HN/Reddit for this audience." Don't treat it as
  required launch scope.
- Any new product feature — this phase packages and publicizes what Phases
  1–7 already built; it does not add scope under launch-day pressure.
- Silently deciding the `docs/PRD.md` public-vs-private question by leaving
  the folder as-is — CLAUDE.md §9 is explicit that this must not be
  "decided by default because the folder already existed." This phase
  requires an explicit choice: ship the PRD as-is, trim it into
  `docs/ROADMAP.md` for public consumption while the raw PRD stays out of
  the repo, or something in between.

## Dependencies
Phase 7's exit gate: a stranger has successfully self-hosted Volt unaided.
Phase 0's audience (the people who showed interest during validation) is
who gets DMed here — this phase closes the loop Phase 0 opened.

## Interfaces Touched
- `README.md`, `docs/ROADMAP.md`, `CHANGELOG.md` — finalized for public
  consumption per CLAUDE.md §5 (README stays short, depth lives in `docs/`).
- Public GitHub repository (visibility/release, not a new code interface).
- External: Hacker News, r/selfhosted, r/opensource, LinkedIn, X.
- No new application code interfaces — this phase is documentation and
  distribution.

## Exit Gate
Public repo, public post, real traffic — a milestone, not an ending (§12).
Verify by confirming the repo is public, the Show HN/Reddit/LinkedIn posts
are live, and traffic/engagement is actually observed (not just posted into
silence).

## Open Questions Carried Forward
- `docs/PRD.md` public-vs-private decision (CLAUDE.md §9) — must be made
  before this phase, not defaulted.
- Unreviewed (§11): legal/ToS risk of operating a third-party Gmail client
  at scale — real public traffic starting this phase is the first point
  this risk stops being theoretical.
- Advisor Notes (p.2) content-calendar caveat still applies here: the §14
  calendar is "a menu, not a mandate" — this phase's own row already
  concentrates on Show HN as primary channel, which matches that guidance.

## Build-in-Public Deliverable
Capstone post: "10 weeks ago I found a gap... today Volt is live" — linking
the repo, the Phase 0 post, the Phase 5 security deep-dive, and the Phase 6
MCP demo — to LinkedIn/X; separate, tailored (not copy-pasted) posts to
r/selfhosted and r/opensource; Show HN post as primary launch channel per
§14.

# Phase 9 — Post-Launch

## Status
Draft — depends on real user feedback from Phase 8's launch, which by
definition doesn't exist until that phase completes. This phase has no
exit gate (see below), so "draft" here means the task list is
feedback-driven and can't be fully specified in advance.

## Source
`docs/volt_prd.pdf` §7 P1 table (scheduled send, manual rule-based inbox
splitting, natural language search — the P1 stories not placed in any
earlier phase's §12 task list), §12 Phase 9 subsection.

## Objective
A live launch is not the finish line for either the community goal or the
job-market goal — sustained activity is what actually gets noticed (§12).
This phase is ongoing maintenance mode, not a scoped build.

## In Scope
- Respond to every GitHub issue within 48 hours for the first month (§12).
- Ship P1 features based on real feedback, not the original guess (§12),
  specifically: scheduling (manual time picker — the P1 "should-have" story
  not placed in any earlier phase), manual split inbox (rule-based, the P1
  story likewise not placed earlier), and snippets polish (building on
  Phase 3's basic version) (§12, §7).
- Weekly-ish "what I shipped this week" posts — consistency beats intensity
  for long-term reach (§12).
- Reach out to Superhuman directly once the project has a real track
  record, not on day one (§12).

## Explicit Non-Scope
- Automatic (non-on-demand) AI drafting or auto-labeling — still a
  permanent v1 non-goal per §3; "maintenance mode" does not relax this
  non-negotiable.
- Automatic AI inbox categorization, automatic follow-up detection,
  Outlook support, native desktop app — all explicitly P2, deferred past
  v1 per §7, not owned by this phase or any phase in the current roadmap.
- Calendar integration — permanent v1 non-goal per §3, not revisited here
  regardless of feedback received.
- Reaching out to Superhuman before this project has a real track record —
  §12 is explicit about sequencing this last, not on day one.

## Dependencies
Phase 8's exit gate: a public repo with real traffic. This phase's actual
task list (which P1 features, in what order) is determined by feedback that
doesn't exist until launch has happened.

## Interfaces Touched
- Frontend/backend endpoints from Phases 2–3 (scheduling, manual split
  inbox, snippets) — extended, not rebuilt.
- GitHub Issues (response SLA).
- `docs/posts/` — weekly build-in-public posts.
- No new external service integrations implied by §12's task list for this
  phase.

## Exit Gate
N/A — this phase doesn't end; it's the maintenance mode that determines
whether Volt becomes a real credential or a repo that goes quiet after week
12 (§12). There is no single testable state to verify; the ongoing signal
is the 48-hour issue-response SLA and the weekly post cadence, both of
which can be checked at any point in time.

## Open Questions Carried Forward
- Unvalidated (§11): solo-builder capacity to maintain security
  patches/support once real users exist — this phase is where that
  capacity gets tested for real, on an ongoing basis, not just rehearsed
  once as in Phase 7.
- Unreviewed (§11): legal/ToS risk of operating a third-party Gmail client
  at scale — remains open and ongoing here, not resolved by launch.
- No PRD section defines what happens if the 48-hour SLA can't be sustained
  — worth deciding explicitly if/when it's missed, rather than letting the
  commitment quietly lapse.

## Build-in-Public Deliverable
Weekly "what I shipped this week" posts to LinkedIn/X — consistency over
intensity per §14; same cadence on Reddit but tied to real feature
releases, not a fixed schedule, to avoid oversaturating; ongoing GitHub
issue responses within the 48-hour SLA, with periodic Indie
Hackers/Discord check-ins (§14).

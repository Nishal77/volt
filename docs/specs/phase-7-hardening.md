# Phase 7 — Self-Host Hardening & Real User Test

## Status
Draft — depends on whether Google's OAuth verification for sensitive
scopes becomes a hard onboarding blocker at scale, which §11 lists as
"unresearched." This phase's clean-machine test is the first point that
question gets exercised against a real stranger rather than the builder.

## Source
`docs/volt_prd.pdf` §11 (Open Questions — solo-builder maintenance
capacity, OAuth verification at scale), §12 Phase 7 subsection. Advisor
Notes (p.2): BYO-OAuth-client friction, missing incident-response policy.
CLAUDE.md §3 (Non-negotiables — Phase 7's exit gate is one of the two gates,
with Phase 0, that "must not be skipped outright").

## Objective
Prove the builder's own dev machine is not a representative test of
onboarding, and fix that before launch, not after (§12). This is the
phase where Volt either survives contact with someone who isn't the
builder, or reveals exactly where it doesn't.

## In Scope
- Clean-machine test: wipe a VM, run only the public setup instructions,
  note every friction point (§12).
- Recruit at least one person who isn't the builder to self-host it from
  scratch, watch where they get stuck (§12).
- Fix the top 3–5 friction points found (§12).
- Write the actual README/setup docs a stranger needs — assume zero prior
  context (§12).

## Explicit Non-Scope
- Any new product feature — this phase fixes onboarding friction in what
  already exists (Phases 1–6's output), it doesn't add scope.
- WCAG audit, formal compliance work, penetration testing — still
  permanently deferred per §8, not pulled forward here even though this is
  a hardening-themed phase.
- Writing the incident-response/disclosure policy as a full formal
  document — not named as an explicit §12 task, but Advisor Notes (p.2)
  say a "one-paragraph 'if something goes wrong, here's what happens'
  policy costs little and matters if it ever gets used," and that it should
  exist "for a project handling real Gmail credentials from strangers by
  Phase 7." Treat as a small, explicitly-scoped addition to this phase's
  task list rather than silently skipping it or expanding it into a full
  compliance document.

## Dependencies
Phase 6's exit gate: a working MCP server, so the "someone else self-hosts
Volt" test in this phase reflects the full v1 feature set, not a partial
build. The [Guessing]-tagged BYO-OAuth-client-per-self-hoster friction
(§10, Advisor Notes p.2) is exactly what this phase's clean-machine test is
designed to surface and measure, not assume away.

## Interfaces Touched
- `deploy/` (Docker Compose, Dockerfiles) — fixes to whatever friction the
  clean-machine test surfaces.
- `scripts/clean-machine-test.sh` — named explicitly in CLAUDE.md §5 repo
  structure and §10 commands as this phase's real output.
- `docs/SELF_HOSTING.md`, `docs/TROUBLESHOOTING.md` — per CLAUDE.md §5,
  these are stated as growing directly out of this phase.
- No new backend/frontend/MCP interfaces — this phase touches deployment
  and documentation surfaces only.

## Exit Gate
Someone who is not the builder has successfully self-hosted Volt and
connected their own Gmail account without the builder's direct help (§12).
Run `./scripts/clean-machine-test.sh` and confirm via the recruited
non-builder tester, not by the builder's own dry run.

## Open Questions Carried Forward
- Unresearched (§11): whether Google's OAuth verification becomes a hard
  onboarding blocker at scale — this phase's stranger test is where that
  question gets a real answer for the first time, even though Advisor Notes
  recommended researching it back in Phase 1.
- [Guessing] (Advisor Notes, p.2): BYO-OAuth-client-per-self-hoster is real
  onboarding friction stacked on top of Docker Compose setup, encryption
  setup, and BYO-AI-key setup — "three separate 'go get your own
  credentials' steps... worth timing an honest onboarding run ... and being
  ready to cut scope (e.g., defer AI features to post-connect) if setup
  time runs past ~15 minutes." This phase is that timed run.
- [Likely] (Advisor Notes, p.2): no incident-response/disclosure process
  exists yet beyond `SECURITY.md` being present — worth writing before this
  phase puts a stranger's real credentials at stake (also echoed in
  CLAUDE.md §9).
- Unvalidated (§11): solo-builder capacity to maintain security
  patches/support once real users exist — this phase is the first rehearsal
  of what "supporting a stranger's install" actually requires.

## Build-in-Public Deliverable
Honest post: "I had someone else try to self-host Volt from scratch —
here's everything that broke," to LinkedIn/X — §14 notes this vulnerable,
unpolished style of post "typically outperforms polished demos" for
engagement; share in the same Discords/IH thread as a credibility-building
update ahead of launch.

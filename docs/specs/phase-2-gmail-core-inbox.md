# Phase 2 — Gmail Auth & Core Inbox

## Status
Confirmed.

## Source
`docs/volt_prd.pdf` §7 P0 table ("Connect Gmail via OAuth"), §8
(Non-Functional Requirements — Security), §9 (Primary User Flow, including
Edge cases), §12 Phase 2 subsection. CLAUDE.md §3 (Non-negotiables —
minimum-necessary OAuth scopes, credential encryption, zero-incident bar
starts this phase).

## Objective
Ship the unglamorous, load-bearing feature nothing else works without:
a real Gmail account connected via OAuth, with a working inbox — read,
archive, reply — end to end, with no AI involved yet. This is also the
point at which real Gmail credentials first exist in the system, which is
why CLAUDE.md's "zero critical security incidents" bar goes live starting
this phase (§3).

## In Scope
- Google OAuth2 consent flow, minimum-necessary scopes (readonly + send +
  modify labels) (§12, §8).
- Store tokens encrypted, never logged (§12, §8).
- Initial inbox sync — recent-N-messages-first recommended over full
  history (§12).
- Inbox list view: subject, sender, snippet, read/unread state (§12).
- Open/read a full email thread; basic actions: archive, reply, mark
  read/unread (§12).
- Handle error states: OAuth failure, revoked token, rate limits (§12, §9
  Edge cases: OAuth consent denied/fails with clear retry path and no
  partial state; Gmail API rate limit during sync with graceful degrade;
  externally revoked Gmail access detected on next sync, prompts
  reconnection).

## Explicit Non-Scope
- Keyboard shortcuts, Command Palette, snippets — owned by Phase 3.
- AI Summarize, AI Draft, natural-language search — owned by Phase 4.
- Client-side (zero-knowledge) encryption verification — this phase stores
  tokens encrypted at rest at minimum per §8's NFR ("client-side encryption
  preferred (P0)"); the independently-verified, ciphertext-confirmed
  version of that claim is Phase 5's exit gate, not this phase's.
- Calendar integration — permanent v1 non-goal (§3), not deferred to any
  phase.
- Multiple Gmail accounts — permanent v1 non-goal (§3); single account only.
- Very-large-inbox (100k+ messages) sync strategy — explicitly an open
  question in §9 Edge cases, not decided or built here.

## Dependencies
Phase 1's exit gate: `docker compose up` produces a running, empty,
healthy app. The Google Cloud OAuth client created in Phase 1 must exist
before this phase's consent flow can be built against it.

## Interfaces Touched
- Gmail API (OAuth2 consent, initial sync, thread read, archive, reply,
  label modify) — google.golang.org/api/gmail/v1 per §4 Tech Stack.
- New Postgres table(s) for encrypted OAuth tokens.
- Backend endpoints for inbox list, thread read, archive, reply, mark
  read/unread (exact routes not yet specified in the PRD — defined during
  implementation).

## Exit Gate
Connect your own test Gmail account, see your inbox, read an email, archive
it, reply to it — end to end, no AI (§12; reply included per CLAUDE.md §7's
fuller restatement of this same gate — the PRD's own boxed exit-gate
sentence names read/archive but reply is listed as an in-scope task
immediately above it, so it's included here for consistency. See root
`docs/specs/README.md` and this file's Source line — worth tightening in
the PRD itself if it's revised).

## Open Questions Carried Forward
- [Inference] (§10): Google's OAuth verification for sensitive scopes
  likely requires app review beyond a small test-user allowlist — the
  consent flow built in this phase is where that requirement would first
  bite in practice, even though Advisor Notes recommend researching it back
  in Phase 1.
- [Founder-confirmed, not engineer-validated] (§10): each self-hoster
  provides their own OAuth client rather than Volt shipping a shared one —
  avoids the maintainer being a quota/liability bottleneck, but real setup
  friction; this phase is where that friction first becomes concrete and
  testable (formally exercised by a stranger in Phase 7).
- CLAUDE.md's "zero critical security incidents" bar and the "no
  incident-response/disclosure process exists yet" gap (CLAUDE.md §9, PRD
  §11 Advisor Notes) both become live risks starting this phase, since real
  Gmail credentials exist from here on.

## Build-in-Public Deliverable
Short screen recording: "Volt can now read and act on a real Gmail inbox.
No AI yet — making sure the foundation is solid first," posted to
LinkedIn/X (§14).

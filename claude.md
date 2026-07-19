> This file is read by Claude Code at the start of every session in this repo. Keep it
> current and lean. Durable operating rules and live status belong here. Full detail
> belongs in `docs/PRD.md`, `docs/decisions/`, `docs/prompts/`, and `docs/posts/` —
> reference those, don't duplicate them here.

# Volt — Project Memory

## 1. One-liner

Open-source, self-hostable, keyboard-first Gmail client with BYO-AI-key features and a
native MCP server. Learn-in-public solo project — the primary deliverable is documented
technical decision-making plus 8+ real build-in-public posts, not a finished company.
Completing every phase is a bonus outcome, not the bar for success. Full PRD: `docs/PRD.md`.

## 2. Current Status — update this every session, keep it short

```
Phase:          7 — Self-Host Hardening & Real User Test (started; docs/
                scripts scaffolding in place, real non-builder test still
                outstanding — owner-only step)
Last updated:   2026-07-19
Phase 1:        Owner confirms docker compose up on a clean machine now
                works (Docker Desktop issue from prior session resolved).
                Taking owner's word per their own verification — not
                re-run by me this session.
Phase 4:        Exit gate MET. Tested live with a real OpenAI key:
                summarize produced an accurate 3-sentence summary of a
                real Stripe security-alert thread, draft reply was
                contextually correct and never auto-sent, natural-language
                search ("anything about my account security") correctly
                found the Stripe thread via semantic match, not keyword
                match. Fixed the silent-failure gap flagged last session:
                summarize/draft/search now show a visible error banner
                (not just console) on failure, tested for both
                ai_not_configured and provider-call-failed paths.
Phase 5 built:  Real zero-knowledge vault, not just "verify current
                encryption" — owner explicitly chose the harder path.
                backend/internal/vault: Argon2id derives the AES-256 key
                from a passphrase (golang.org/x/crypto, already an
                indirect dep — no new library). Key lives in server
                process memory only, never disk/env/DB. Every restart
                requires POST /api/vault/unlock again; a stored verifier
                ciphertext (not real credentials) checks the passphrase is
                right before anything touches actual data. All
                credential-touching endpoints (Gmail OAuth save, inbox
                actions, AI settings/summarize/draft/search) now 423
                vault_locked until unlocked. Frontend /unlock page
                auto-redirects from /inbox on 423. TOKEN_ENCRYPTION_KEY
                env var removed entirely — replaced, not layered on top.
                README.md created (didn't exist before) with the security
                section this phase's spec explicitly requires. ADR 0002
                (AI provider: stdlib HTTP, no SDK) and ADR 0003
                (zero-knowledge vault design) written.
Verified today: Full live cycle via curl + Playwright: locked before
                setup (423), setup, wrong passphrase rejected (401),
                correct passphrase unlocks, restarted the actual process
                to confirm the key is really gone from memory (not just
                simulated) — confirmed locked again, unlocked again,
                AI key re-saved and confirmed encrypted via direct psql
                read (not plaintext). /unlock UI tested end-to-end:
                auto-redirect on lock, wrong-passphrase error shown,
                correct passphrase redirects to /inbox.
Phase 6:        Exit gate MET, verified retroactively this session (was
                code-complete per commit 5f2b037 but CLAUDE.md hadn't been
                updated — caught and corrected). mcp-server/ exposes
                list_inbox, get_thread, search_inbox, draft_reply as MCP
                tools. Verified live via an actual MCP client (this
                session) calling list_inbox against the real connected
                Gmail account and summarizing real unread threads — not a
                mocked response. draft_reply confirmed to only return text
                for human review; no send/auto-send tool exists, per
                non-negotiable §3.
Phase 7 built:  scripts/clean-machine-test.sh (wipes docker state, rebuilds,
                polls /health, checks frontend) — this only verifies the
                builder's own machine, not the real exit gate.
                docs/SELF_HOSTING.md written (zero-prior-context install
                guide: Google OAuth client creation, .env, vault unlock,
                Gmail connect, optional AI key, optional MCP connect).
                docs/TROUBLESHOOTING.md seeded with known friction points
                (OAuth redirect mismatch, relock-on-restart-is-expected,
                ai_not_configured) — expected to grow from the real
                non-builder test, not exhaustive yet.
                SECURITY.md created (didn't exist before) with the
                one-paragraph incident-response note Advisor Notes flagged
                as needed before Phase 7 puts a stranger's credentials at
                stake.
Blocking on:    The actual exit gate — a real person who isn't the builder
                self-hosting Volt unaided and connecting their own Gmail.
                That recruitment + observation is an owner-only step I
                can't perform. Everything I can build ahead of that test
                (script, docs, security policy) is done; the top 3–5
                friction points still can't be identified or fixed until
                that real run happens.
Next action:    Owner runs scripts/clean-machine-test.sh once to confirm
                it passes on this machine, then recruits a non-builder
                tester per §12 and records what breaks.
```

This block is the first thing to read and the last thing to update before ending a
session. If it's stale, nothing else in this file can be trusted either.

## 3. Non-negotiables — do not violate without explicit owner sign-off

- Self-host only. No hosted/managed Volt cloud service, ever, in any phase.
- Single Gmail account per instance. No multi-account, no multi-tenant architecture.
- Gmail only for v1. No Outlook/Microsoft Graph.
- Web app only. No native desktop or mobile app.
- AI drafting is on-demand only. Never auto-send, never automatic without an explicit
  user click, in any phase including post-launch.
- BYO-AI-key architecture. Never absorb inference cost. Keys encrypted at rest, never
  logged, never included in error reports or crash dumps.
- Minimum-necessary Gmail OAuth scopes only — no requesting broader scopes for
  convenience.
- Client-side encryption is a claimed structural differentiator. It must be
  independently verified against the actual Postgres data (inspect the DB directly),
  not assumed true from code review alone. This gate belongs to Phase 5 but the
  standard applies retroactively to anything touching credentials before then.
- No read receipts / open tracking, ever. This is a deliberate privacy position, not a
  deferred feature.
- Zero critical security incidents involving real Gmail credentials. This bar is live
  starting Phase 2, the moment real OAuth tokens exist — not just at launch.

## 4. Tech stack — locked decisions, rationale lives in `docs/decisions/`

| Layer | Choice | Notes |
|---|---|---|
| Backend | Go (Gin or Echo) | Pick one in Phase 1, record in ADR 0001. Don't revisit later without a new ADR. |
| Database | PostgreSQL via **pgx** | sqlc deferred to Phase 2 (ADR 0002) — no real queries exist yet in Phase 1, don't scaffold it early. |
| Frontend | Next.js | Package manager is **Bun only** — never npm, pnpm, or yarn, no mixed lockfiles, no exceptions. |
| MCP server | TypeScript, official MCP SDK | Bun-managed. Go has no official MCP SDK (ADR 0003) — this is why it's not Go like the backend. |
| Real-time sync | Gmail Pub/Sub push | Not polling — polling burns API quota and feels laggy. |
| Encryption | age or libsodium, client-side | Zero-knowledge pattern, same approach Bitwarden uses. |
| Deployment | Docker Compose | This is the self-host story — treat as production code, not a dev convenience. |
| CI | GitHub Actions | `oven-sh/setup-bun` for JS/TS jobs, standard Go toolchain for the backend job. |

## 5. Repository structure

This is a public open-source repo — the doc set below is sized for that, not just for
you. Every file has exactly one job; don't let content duplicate across two of them.

```
volt/
├── README.md                 # public front door only — badges, 60-second pitch, quickstart,
│                              #   screenshot/GIF, links out to docs/. Keep it short; depth
│                              #   lives in docs/, not here.
├── LICENSE                   # Apache 2.0
├── CHANGELOG.md              # Keep a Changelog format + semver. Updated every phase, not
│                              #   reconstructed retroactively before launch.
├── CONTRIBUTING.md           # dev setup, branch/PR flow, coding standards, how to file an ADR
├── CODE_OF_CONDUCT.md        # Contributor Covenant — standard, don't hand-write one
├── SECURITY.md               # vulnerability disclosure process + supported-versions table
├── CLAUDE.md
├── package.json              # root Bun workspaces
├── bunfig.toml
├── .github/
│   ├── CODEOWNERS            # even a solo maintainer benefits from this being explicit
│   ├── FUNDING.yml            # optional — GitHub Sponsors, if wanted
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── config.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/ci.yml
├── docs/
│   ├── PRD.md                 # ⚠ decide public vs. private before Phase 8 — see §9
│   ├── ROADMAP.md             # public-facing phase plan (trimmed of internal hedging/advisor notes)
│   ├── ARCHITECTURE.md        # system diagram + component overview, for contributors
│   ├── SELF_HOSTING.md        # the actual install guide a stranger follows — Phase 7's real output
│   ├── CONFIGURATION.md       # every env var: what it does, required vs. optional, default
│   ├── TROUBLESHOOTING.md     # common self-host failure modes + fixes, grows out of Phase 7
│   ├── API.md                 # REST/MCP endpoints, once stable enough to document
│   ├── architecture/
│   ├── decisions/              # ADRs — 0001, 0002, ... sequential, written same day as the decision
│   ├── prompts/                 # single source of truth for AI prompts — the APP LOADS FROM
│   │                            #   these files at runtime, it does not keep a separate copy in
│   │                            #   code. If code and docs/prompts/ can drift apart, the
│   │                            #   transparency claim is just marketing.
│   └── posts/                   # drafted build-in-public posts, one per phase
├── backend/                   # Go — cmd/, internal/{api,auth,db,gmail,crypto,config}, migrations/
├── frontend/                  # Next.js, Bun-managed
├── mcp-server/                # TypeScript, Bun-managed, official MCP SDK
├── packages/                  # only created when frontend + mcp-server actually need shared types
├── deploy/                    # docker-compose.yml, .env.example, Dockerfiles
└── scripts/                   # clean-machine-test.sh (Phase 7), setup-oauth.sh
```

## 6. Conventions

- Tests are colocated (`*_test.go`, `*.test.ts`) next to the code they test. No
  top-level `/tests` directory.
- One ADR per non-trivial decision, in `docs/decisions/NNNN-short-title.md`, written the
  same day as the decision — not reconstructed retroactively before a launch post.
- Commits: `type(scope): summary` — `feat`, `fix`, `docs`, `chore`, `test`. Scope can be
  a phase tag, e.g. `feat(phase2): gmail oauth consent flow`.
- Every phase produces a draft post in `docs/posts/` before being marked done. This is a
  real deliverable per the PRD's success metrics, not optional polish.
- Never commit a real `.env`. Only `.env.example` is checked in, under `deploy/`.
- Prompt templates used by the app are loaded FROM `docs/prompts/` at runtime — the app
  has no separate copy of prompt strings in code. One source of truth, not two things
  that can drift apart. This is a stated differentiator (auditable AI, not a black box);
  it only holds if it's structurally true, not just documented as true.
- `CHANGELOG.md` gets a new entry as part of every phase's "done" checklist — same
  moment you write the ADR and the build-in-public post draft, not reconstructed later.
- Every public-facing doc (`README.md`, `docs/ROADMAP.md`, `docs/SELF_HOSTING.md`, etc.)
  has exactly one job. If you're about to add architecture detail to the README or
  installation steps to CONTRIBUTING.md, stop — it belongs in `docs/ARCHITECTURE.md` or
  `docs/SELF_HOSTING.md` instead. Duplication across docs is how they silently go stale.

## 7. Phase Roadmap — condensed. Full tasks in `docs/PRD.md` §12.

| Phase | Weeks | Exit gate |
|---|---|---|
| 0 — Validation | 1 | Real signal that people want this — not zero response. |
| 1 — Foundation | 1–2 | `docker compose up` on a wiped clean state → healthcheck passes. |
| 2 — Gmail Auth & Core Inbox | 2–4 | Real Gmail account: connect, read, archive, reply — end to end, no AI. |
| 3 — Speed Layer | 4 | Entire inbox operable without touching the mouse. |
| 4 — AI Layer | 5–6 | Summarize + on-demand draft reliable on real threads; search returns relevant results. |
| 5 — Encryption | 7 | Inspect the Postgres DB directly — confirm ciphertext-only, not assumed. |
| 6 — MCP Server | 8 | Ask Claude via MCP to act on the live inbox and get a real answer. |
| 7 — Hardening | 9 | Someone who is NOT the builder self-hosts it unaided. |
| 8 — Launch | 10 | Public repo, Show HN / Reddit posts live, real traffic. |
| 9 — Post-launch | 11+ | Ongoing — no exit gate. 48hr issue response SLA, weekly posts. |

**Rule:** don't start a phase's tasks until the previous phase's exit gate is actually
verified — run the test, don't take your own word for it. Phase 0 and Phase 7 are the
two gates that must not be skipped outright; every other phase can compress or extend.

## 8. Scope discipline

Before writing code for whatever phase is in progress: does this task appear in that
phase's task list in `docs/PRD.md` §12? If not, it's scope creep — flag it instead of
building it. The most common failure mode here is pulling a later phase's feature
forward because it seems convenient mid-task (e.g., wiring up sqlc during Phase 1,
or building automatic AI actions before even the on-demand version in Phase 4 exists).
Stopping to ask "is this in scope for the current phase" costs one sentence. Building
the wrong thing costs a rewrite.

## 9. Known open questions — carried from `docs/PRD.md` §11. Do not silently resolve these.

- Real switching-demand population size — unvalidated, no waitlist/survey data as of
  Phase 0.
- Whether Google's OAuth verification becomes a hard onboarding blocker at scale —
  unresearched.
- Timeline: source docs disagreed (6–10 wks vs. ~10–11 wks). Working number is 11 weeks,
  budget for slippage, not compression.
- AI quality with a general-purpose model vs. Superhuman's purpose-built pipeline —
  unbenchmarked.
- Legal/ToS risk of operating a third-party Gmail client at scale — unreviewed.
- No incident-response/disclosure policy exists yet beyond `SECURITY.md` being present —
  write the actual policy before Phase 7 puts a stranger's real credentials at stake.
- `docs/PRD.md` visibility: this repo is public. The PRD as written is an internal
  working doc with deliberate hedging ("unvalidated," "unresearched," candid Advisor
  Notes about the plan's own weak points). Decide explicitly, before Phase 8, whether
  it ships as-is (arguably reinforces the transparency positioning), gets trimmed into
  `docs/ROADMAP.md` for public consumption while the raw PRD stays out of the repo, or
  something in between. Don't let this get decided by default because the folder
  already existed.

## 10. Commands

```bash
# Backend (Go)
cd backend && go run ./cmd/server
go test ./...
golangci-lint run

# Frontend (Next.js, Bun only)
cd frontend && bun install
bun run dev
bun run build
bun run lint

# MCP server (TypeScript, Bun only)
cd mcp-server && bun install
bun run dev

# Root (Bun workspaces — installs everything JS/TS side at once)
bun install

# Docker Compose (the self-host path — test this like a stranger would)
cd deploy && docker compose up --build
docker compose down -v          # wipe state before re-testing the exit gate
docker compose logs -f

# Phase 7 hardening
./scripts/clean-machine-test.sh
```

## 11. Definition of Done (v1)

- All P0 stories shipped and working end-to-end on a real Gmail account.
- Docker Compose self-host path tested by someone other than the builder.
- Client-side encryption actually implemented and independently verified, not silently
  deferred.
- At least 8 build-in-public posts published documenting real decisions, including at
  least one about something that broke or went wrong.

## 12. Changelog — append-only, newest entry on top

- `[YYYY-MM-DD]` — CLAUDE.md created. Phase 0 not started. No code written yet.
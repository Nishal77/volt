# Phase 0 — Why I'm Building Volt

Starting a new build-in-public project: Volt — an open-source,
self-hostable, keyboard-first Gmail client with BYO-AI-key features and a
native MCP server. Think "Superhuman, but you own it and your inbox data
never leaves your own infra."

The real deliverable here isn't a company — it's documented technical
decision-making, in public, including the parts that go wrong. If it
ships as a fully working v1, that's a bonus outcome, not the bar for
success.

Non-negotiables going in: self-host only, single Gmail account, no
auto-send AI ever, BYO-AI-key (I never touch inference cost), and
client-side encryption I'll independently verify against the actual
Postgres data — not just claim from code review.

Following along here as it's built, phase by phase.

#buildinpublic #opensource #gmail

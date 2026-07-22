# Phase 2 — Gmail Auth & Core Inbox

Volt (self-hosted, open-source Gmail client) can now do the basics, end
to end, on a real Gmail account: connect via OAuth, read your inbox,
archive, reply. No AI yet — that's deliberately next, not now.

Minimum-necessary OAuth scopes only, on purpose — not requesting broader
Gmail access for convenience I don't need yet. Tokens are encrypted at
rest from day one, not bolted on later as a security phase.

This is the phase where Volt stops being a scaffold and starts being an
actual email client. Everything after this (speed, AI, encryption
hardening, MCP) builds on real inbox read/write, not a mock.

#buildinpublic #opensource #gmail #oauth

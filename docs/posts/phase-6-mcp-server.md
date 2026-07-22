# Phase 6 — Connected Claude to My Own Inbox via MCP

I connected Claude to my own open-source email client via MCP — here's
what that actually looks like.

Volt is a self-hosted Gmail client I've been building in public. It now
ships a native MCP server exposing three tools: list_inbox, get_thread,
search_inbox, and a fourth, draft_reply, that returns a draft as text —
it never sends anything. Sending is a human clicking a button in the
Volt UI, full stop, no exceptions, no matter what an MCP client asks for.

I asked Claude Code, connected live to my own running instance, to
"summarize my last 5 unread emails." It called list_inbox and
get_thread against my real Gmail account and gave me back real
summaries — a Boot.dev coupon reminder, a Redis inactivity notice, an
actual Google security alert about the OAuth grant, etc. Not a demo, not
mocked data — my actual inbox, my actual AI client, talking over MCP.

Setup instructions for pointing your own Claude/Cursor at your own
self-hosted Volt: `mcp-server/README.md`.

#buildinpublic #opensource #MCP #AI #gmail

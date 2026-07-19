# Architecture

## Components

- **Frontend** — Next.js, Bun-managed. Keyboard-first inbox UI, served to the
  user's browser. Runs in Docker Compose.
- **Backend** — Go (Gin). Owns Gmail OAuth, Postgres access via pgx, the
  crypto gateway for client-side encryption, and on-demand AI calls using the
  user's own key. Runs in Docker Compose.
- **Postgres** — encrypted at rest. Runs in Docker Compose.
- **MCP server** — TypeScript, Bun-managed, official MCP SDK. Exposes the
  live inbox to external AI clients (e.g. Claude Desktop). Runs in Docker
  Compose.
- **Gmail API** — external. OAuth2 + Pub/Sub push for real-time sync, not
  polling.
- **AI provider** — external. BYO key; Volt never absorbs inference cost,
  never sees the key beyond passing it through.

## Request flow

1. User's browser loads the self-hosted Next.js frontend.
2. Frontend calls the Go backend for inbox data, actions (archive/reply),
   and on-demand AI (summarize/draft — never auto-sent).
3. Backend reads/writes Postgres, syncs with Gmail via Pub/Sub push, and
   calls the AI provider only when the user explicitly asks.
4. The MCP server talks to the backend so an external AI client (e.g. Claude
   Desktop) can act on the real inbox — same trust boundary, no separate
   credentials path.

## Trust boundary

Everything inside Docker Compose (frontend, backend, Postgres, MCP server)
is self-hosted — no Volt cloud, ever. Gmail API, the AI provider, and the
end user's own browser/AI client sit outside that boundary.

## Diagram

See the system architecture diagram generated in-session (frontend →
backend → {Postgres, Gmail API, AI provider, MCP server}, external AI
client → MCP server).

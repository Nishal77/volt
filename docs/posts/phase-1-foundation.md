# Phase 1 — Foundation

Volt (self-hosted, open-source Gmail client) now boots from nothing.

`docker compose up` on a completely wiped machine brings up Go backend +
Next.js frontend + Postgres, and the healthcheck passes — the actual exit
gate for this phase, not "it works on my machine right now."

Stack decisions, locked and written down as ADRs instead of just living
in my head: Go backend, Postgres via pgx (sqlc deferred — no real queries
exist yet, so scaffolding it now would just be premature structure),
Next.js frontend on Bun only, Docker Compose as the actual self-host
story, not a dev convenience.

Boring foundation, on purpose — the interesting parts (speed, AI,
encryption, MCP) all sit on top of this.

#buildinpublic #opensource #golang #nextjs

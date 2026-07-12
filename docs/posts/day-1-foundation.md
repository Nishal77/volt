# Day 1 of building in public

Repo is live. Here's the stack, and why I picked Go over Node for the
backend.

- **Backend**: Go + Gin. Goroutines handle concurrent Gmail webhook/sync
  fan-out more cleanly than Node's event loop or Python's asyncio for this
  workload, and a single static binary keeps self-hosting simple — no
  runtime to install on the box someone's self-hosting Volt on.
- **Database**: Postgres via pgx, raw queries for now. sqlc comes in Phase 2
  once there are real queries worth generating types from — didn't want to
  wire up a codegen pipeline against a database with no schema yet.
- **Frontend**: Next.js, Bun-managed. One package manager, no mixed
  lockfiles.
- **Deploy**: Docker Compose — this is the actual self-host story, not a
  dev convenience, so it's built and tested like production from day one.

Today's output: `docker compose up` on a clean machine gives a running,
empty app with a health check passing. No Gmail connection yet, no AI, no
UI beyond a placeholder — that's Phase 2 onward. Phase 1 is just making
sure the boring infrastructure doesn't need revisiting later.

[GIF of `docker compose up` succeeding, and screenshot of the CI badge —
attach before posting.]

Repo: [link]

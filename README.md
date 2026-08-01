# Volt

[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

A Gmail client you run yourself. Your inbox, your server, your AI key —
Volt never sees your credentials in the clear, never touches your inference
bill, and never sends an email without you clicking send.

![Volt demo](docs/demo.gif)

## Why this exists

Every fast, AI-powered email client on the market asks you to hand your
inbox to someone else's cloud. Volt doesn't. It's a single Docker Compose
stack you run on your own machine: Postgres, a Go backend, a Next.js
frontend. Your Gmail token and AI key are encrypted with a passphrase only
you know — not stored anywhere, not recoverable if you lose it, gone from
memory the moment the process restarts.

If that sounds like more responsibility than a hosted inbox, it is. That's
the trade this project makes on purpose.

## What you actually get

- **Keyboard-first.** `j`/`k` to move, `x` to archive, `s` to star, `z` to
  undo, `/` to search, `⌘K` for everything else. Press `?` any time for the
  full list.
- **Bring your own AI key.** Claude, OpenAI, Gemini, Groq, Kimi, or
  OpenRouter — pick one, paste a key, it's verified against the provider
  before it's ever saved. Summarize a thread, draft a reply, search your
  inbox in plain English, or just ask the sidebar chat what's going on —
  it can see your recent inbox, not just your last message.
- **Send later, split inbox, follow-up nudges.** Newsletters sort
  themselves out of your primary view automatically. Threads you sent and
  never heard back on resurface after a few days. None of this needs AI —
  it's just paying attention to headers Gmail already gives you.
- **Real attachments.** View what people sent you, attach files to your
  own replies, both go over actual MIME — not a workaround.
- **A native MCP server.** Point Claude Code or Cursor at your own running
  instance and ask it to read, search, organize, or draft in your real
  inbox. There is no send tool. There has never been a send tool. That's
  not a missing feature, it's the whole point.
- **No read receipts.** Not deferred, not on a roadmap — Volt doesn't do
  open tracking, full stop.

## See exactly what it sends your AI

Every prompt Volt uses — for summarizing, drafting, searching, chatting —
lives in [`docs/prompts/`](docs/prompts/) as plain text files, loaded from
disk at runtime. Not a string buried in code, not a black box: open
`/prompts` in the running app and read the exact words your AI provider
receives before you send it anything.

## Install

One command, one machine, nothing else to manage:

```bash
curl -fsSL https://get.volt.dev | bash
```

No GitHub clone, no manual `.env` editing, no existing Docker install
required. The script detects your OS, installs Docker if it's missing,
pulls the latest release into `~/.volt`, walks you through creating a
Google OAuth client, and opens `localhost:3000` once it's healthy.

Rather read it first before piping it into `bash` — reasonable instinct:

```bash
curl -fsSL https://get.volt.dev -o install.sh
less install.sh
bash install.sh
```

**Update:** `volt update` — pulls the latest release, rebuilds, restarts.
Your data and passphrase are untouched.

**Uninstall:** `volt uninstall` — stops the stack, removes `~/.volt`.
Nothing else was touched on your system.

### Prefer to run it by hand?

```bash
git clone https://github.com/Nishal77/volt && cd volt/deploy
cp .env.example .env   # add your own Google OAuth client
docker compose up --build
```

Full walkthrough: [`docs/SELF_HOSTING.md`](docs/SELF_HOSTING.md).
Something broke? [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md).

## How the security actually works

Your Gmail token and AI key are encrypted with AES-256-GCM. The key that
encrypts them is never written anywhere — not the database, not an env
var, not disk.

Instead, it's derived from a passphrase you choose on first run, using
Argon2id (the same memory-hard KDF libsodium uses for this exact job), and
held only in the server process's memory for as long as that process
lives. Restart the container and the key is gone. You unlock again with
your passphrase before Gmail or AI features work — every time, no
exceptions, no backdoor.

Practically: someone with your database dump *and* your server still can't
read your credentials. The key only ever existed in your head and briefly
in memory. If you lose the passphrase, there's no recovery — that's not a
bug, it's what "zero-knowledge" actually has to mean.

Full writeup: [`docs/decisions/0003-zero-knowledge-vault.md`](docs/decisions/0003-zero-knowledge-vault.md).

## MCP server

```
list_inbox · get_thread · search_inbox · draft_reply
archive_thread · star_thread · mark_thread_read
```

Seven tools, all read/organize/draft. No `send_email` tool exists in this
codebase, on purpose — an AI can help you triage and write, but a human
being clicks send. Setup: [`mcp-server/README.md`](mcp-server/README.md).

## Built with

Go (Gin) on the backend, Next.js on the frontend, Postgres for storage,
Docker Compose to run it all. Every architecture decision that mattered
enough to argue about is written down in
[`docs/decisions/`](docs/decisions/) — not after the fact, the same day it
was made.

## Contributing

Issues and PRs welcome. There's no separate contributing guide yet — for
now, open an issue before a big PR so the direction's agreed on first.

## License

Apache 2.0 — see [`LICENSE`](LICENSE).

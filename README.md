# Volt

[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

Open-source, self-hostable, keyboard-first Gmail client with BYO-AI-key
features and a native MCP server.

Your inbox, your server, your AI key. Volt is free, self-hosted, and
encrypts your credentials with a key only you hold — see [Security](#security)
below.

Screenshots/GIF still pending — added once Phase 7's real self-host test
is done and there's something worth showing off.

## Install

One command, one machine, no separate infra to manage:

```bash
curl -fsSL https://get.volt.dev | bash
```

This installs Volt as a local service on your machine — no GitHub clone,
no manual `.env` editing, no existing Docker install required. The script:

1. Detects your OS (macOS / Linux) and installs Docker Engine if it isn't
   already present.
2. Pulls the latest tagged release of Volt into `~/.volt`.
3. Walks you through creating a Google OAuth client (opens the Google Cloud
   Console step for you, prompts for the client ID/secret).
4. Generates your `.env` and starts the stack.
5. Opens `http://localhost:3000` in your browser once the health check
   passes.

Prefer to read the script before running it (recommended for anything
piped into `bash`)? Download it first:

```bash
curl -fsSL https://get.volt.dev -o install.sh
less install.sh        # review it
bash install.sh
```

### Updating

Volt checks for new releases on startup. To update to the latest version
manually:

```bash
volt update
```

This pulls the newest release, rebuilds the containers, and restarts the
stack — your data and vault passphrase are untouched.

### Uninstalling

```bash
volt uninstall
```

Stops the stack and removes `~/.volt`. Nothing is left running or installed
system-wide beyond Docker itself.

### Manual install (no installer script)

If you'd rather manage it yourself:

```bash
git clone https://github.com/your-repo/volt && cd volt/deploy
cp .env.example .env   # add your own Google OAuth client
docker compose up --build
```

Full walkthrough: [`docs/SELF_HOSTING.md`](docs/SELF_HOSTING.md).
Something broke? [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md).

## Security

Volt encrypts your Gmail OAuth token and AI provider key with AES-256-GCM.
The encryption key itself is never stored anywhere — not in the database,
not in an env var, not on disk.

Instead, the key is derived from a passphrase you set on first run
(Argon2id — the same class of memory-hard KDF libsodium uses) and held in
server process memory only, for that process's lifetime. Restart the
server and it's gone; you unlock again with your passphrase before Gmail
or AI features work.

This means a stolen database dump plus a compromised server is still not
enough to read your credentials — the key exists only where you put it: in
your head, and briefly in memory while unlocked. There is no recovery
mechanism if you lose the passphrase, by design.

Details: [`docs/decisions/0003-zero-knowledge-vault.md`](docs/decisions/0003-zero-knowledge-vault.md).

## MCP Server

Point Claude Code or Cursor at your own running instance and ask it to
read, search, or draft in your real inbox. Sending always stays a human
clicking a button — no send tool exists. Setup: [`mcp-server/README.md`](mcp-server/README.md).

## Self-hosting

See [`docs/SELF_HOSTING.md`](docs/SELF_HOSTING.md), or
`deploy/docker-compose.yml` / `deploy/.env.example` directly.

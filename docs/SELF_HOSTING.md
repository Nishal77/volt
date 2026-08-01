# Self-Hosting Volt

Assumes zero prior context. If a step is unclear, that's a bug — file an
issue.

## 1. Prerequisites

- Docker + Docker Compose
- A Google Cloud project with an OAuth 2.0 Client ID (you create this
  yourself — Volt never holds a shared client)

## 2. Create your Google OAuth client

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) →
   APIs & Services → Credentials.
2. Create an OAuth 2.0 Client ID, application type **Web application**.
3. Add an authorized redirect URI matching `GOOGLE_REDIRECT_URL` below —
   for a local run, `http://localhost:8080/auth/google/callback`.
4. Under OAuth consent screen, add only the Gmail scopes Volt requests
   (minimum-necessary — no broader scopes). Copy the resulting Client ID
   and Client Secret.

## 3. Configure

```bash
cd deploy
cp .env.example .env
```

Leave `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` blank — you'll paste
those into the running app in step 6 instead, no text editor required.
(If you'd rather set them here directly, that still works too.) Leave the
encryption key fields alone — there are none. Volt derives its encryption
key from a passphrase you set on first run, not from anything in `.env`.
See
[`docs/decisions/0003-zero-knowledge-vault.md`](decisions/0003-zero-knowledge-vault.md).

## 4. Run

```bash
docker compose up --build
```

Wait for the backend to report healthy (`curl http://localhost:8080/health`),
then open `http://localhost:3000`.

## 5. Unlock the vault

First run redirects you to `/unlock`. Set a passphrase — this derives your
encryption key. There is no recovery if you lose it; Volt never stores it.
Every backend restart requires unlocking again.

## 6. Add your OAuth client, then connect Gmail

If you left `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` blank, the inbox
screen now asks for them, paste in the Client ID and Client Secret from
step 2, no restart needed. Then connect your Google account through the
OAuth flow.

## 7. (Optional) Add an AI provider key

Settings → AI. Bring your own API key (OpenAI-compatible). Volt never
absorbs inference cost and never sends your key anywhere but the provider
you configure.

## 8. (Optional) Connect an MCP client

See `mcp-server/README.md` for wiring Claude Code or Cursor to your running
instance.

## Troubleshooting

See [`docs/TROUBLESHOOTING.md`](TROUBLESHOOTING.md).

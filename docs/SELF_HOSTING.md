# Self-Hosting Volt

## 1. Create a Google Cloud OAuth client

Each self-hoster brings their own OAuth client — Volt does not ship a shared
one. This avoids the maintainer being a quota or liability bottleneck for
every self-hosted instance.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and
   create a new project (or reuse one).
2. Enable the **Gmail API** for that project.
3. Go to **APIs & Services → OAuth consent screen**, set it to External,
   and add yourself as a test user.
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth
   client ID**, application type **Web application**.
5. Add `http://localhost:3000/oauth/callback` as an authorized redirect URI
   (adjust for your deployment's actual host).
6. Copy the generated **Client ID** and **Client Secret**.

## 2. Configure Volt

Copy `deploy/.env.example` to `deploy/.env` and fill in `DATABASE_URL` and
`PORT`. Gmail OAuth client ID/secret fields will be added when the consent
flow ships (Phase 2) — this phase only gets the client itself created.

## 3. Run it

```bash
cd deploy
docker compose up --build
```

Backend health check: `curl http://localhost:8080/health`
Frontend: `http://localhost:3000`

## Known limitation

Google's OAuth verification requirements for sensitive Gmail scopes
(readonly + send + modify) have not been researched in depth yet. If you
hit an "unverified app" warning beyond the small test-user allowlist, that
is a known open question, not a bug — see `docs/specs/phase-1-foundation.md`
Open Questions.

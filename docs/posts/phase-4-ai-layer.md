# Phase 4 — AI Layer

Volt (self-hosted, open-source Gmail client) now summarizes threads,
drafts replies, and searches your inbox in plain English.

The catch, on purpose: you bring your own AI key. I never see it, never
touch inference cost, and it's encrypted at rest — not stored plaintext
anywhere.

Tested it live on a real Stripe security-alert thread today: 3-sentence
summary, accurate. Asked it "anything about my account security" —
correctly found that same thread by meaning, not keyword match. Drafted a
reply that was contextually right and sat there waiting for me to
actually click send — Volt never auto-sends, anywhere, ever.

The part I actually care about: every prompt Volt sends to your AI
provider is a plain file in the repo, not a string buried in code. If you
don't trust what it's asking your model to do, go read it yourself:
`docs/prompts/`. Transparency isn't a slide, it's a directory you can
open.

#buildinpublic #opensource #AI #gmail

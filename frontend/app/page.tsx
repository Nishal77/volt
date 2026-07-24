"use client";

import { useState } from "react";

const QUICKSTART = `git clone https://github.com/your-repo/volt && cd volt/deploy
cp .env.example .env   # add your own Google OAuth client
docker compose up --build`;

const MOCK_INBOX = [
  { from: "Stripe", subject: "Unusual sign-in detected", snippet: "We noticed a new sign-in to your account from a new device…", unread: true },
  { from: "GitHub", subject: "[volt] New star from a contributor", snippet: "Someone just starred your repository nishal77/volt", unread: true },
  { from: "Linear", subject: "Weekly digest — 3 issues closed", snippet: "Here's what shipped on your team this week…", unread: false },
];

const FEATURES = [
  {
    title: "Keyboard-first, start to finish",
    body: "Archive, reply, navigate threads, command palette, snippets — the entire inbox, zero mouse required.",
  },
  {
    title: "Bring your own AI key",
    body: "Summarize, draft, and search in plain English. Your key, your provider, your inference cost — we never see it.",
  },
  {
    title: "Zero-knowledge encryption",
    body: "Your encryption key exists only in your head and briefly in server memory. Not in the database. Not in an env var. Not on disk, anywhere.",
  },
  {
    title: "Native MCP server",
    body: "Point Claude Code or Cursor at your own running instance. Read, search, and draft — sending stays a human clicking a button.",
  },
];

const COMPARISON = [
  {
    who: "Superhuman",
    detail: "$30/month, forever, and your inbox lives on their servers. Volt is free, MIT-licensed, and lives on yours.",
  },
  {
    who: "AI email add-ons",
    detail: "Your key routed through their proxy, their logs. Volt calls your AI provider directly — we never see it, never log it.",
  },
  {
    who: "Gmail itself",
    detail: "No keyboard-first speed layer, no BYO-AI drafting, no encryption you can verify yourself in your own Postgres.",
  },
];

export default function Home() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(QUICKSTART);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="bg-canvas text-ink">
      {/* Nav */}
      <nav className="sticky top-0 z-30 h-16 flex items-center justify-between px-6 sm:px-10 bg-canvas/80 backdrop-blur border-b border-hairline">
        <div className="text-lg font-semibold tracking-tight">Volt</div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/your-repo/blob/main/docs/SELF_HOSTING.md"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline text-sm text-body hover:text-ink transition-colors"
          >
            Docs
          </a>
          <a
            href="https://github.com/your-repo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center h-10 px-5 rounded-pill bg-primary text-white text-sm font-semibold hover:bg-primary-active transition-colors"
          >
            Star on GitHub
          </a>
        </div>
      </nav>

      {/* Hero — dark editorial band */}
      <section className="relative bg-surface-dark text-white px-6 sm:px-10 pt-24 sm:pt-32 pb-32 sm:pb-40 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(600px circle at 50% 0%, rgba(0,82,255,0.25), transparent 60%)",
          }}
        />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <span className="inline-block px-3 py-1 rounded-pill bg-white/10 text-xs font-semibold tracking-wide uppercase mb-8">
            Open source · Self-hosted · Your keys
          </span>
          <h1 className="text-[42px] sm:text-7xl font-normal tracking-tight leading-[1.03]">
            Your inbox.
            <br />
            Your server. Your AI key.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-xl mx-auto leading-relaxed">
            Superhuman-fast email, minus the $30/month and minus handing your
            inbox to someone else&apos;s cloud. Volt runs on your own
            machine, encrypts your data with a key only you hold, and never
            sends a single email without you clicking send.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/your-repo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center h-14 px-8 rounded-pill bg-primary text-white font-semibold hover:bg-primary-active transition-colors"
            >
              View on GitHub
            </a>
            <a
              href="#quickstart"
              className="inline-flex items-center h-14 px-8 rounded-pill border border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              Self-host in 5 minutes
            </a>
          </div>
        </div>

        {/* Product mockup — generic three-pane email layout (sidebar / list / reading pane),
            structurally the same shape as Gmail or Superhuman, styled entirely in Volt's own
            tokens — no borrowed branding, colors, or logos. */}
        <div className="relative mt-24 max-w-4xl mx-auto hidden md:block">
          <div className="rounded-xl bg-black border border-white/10 shadow-2xl overflow-hidden rotate-[-0.5deg] flex h-[380px]">
            {/* Sidebar */}
            <div className="w-48 shrink-0 border-r border-white/10 p-4 flex flex-col gap-1">
              <div className="mb-4 h-9 rounded-lg bg-primary text-white text-sm font-semibold flex items-center justify-center">
                Compose
              </div>
              {["Inbox", "Snippets", "Settings"].map((label, i) => (
                <div
                  key={label}
                  className={`px-3 py-2 rounded-lg text-sm ${i === 0 ? "bg-white/10 text-white font-medium" : "text-gray-400"}`}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* List pane */}
            <div className="w-72 shrink-0 border-r border-white/10 flex flex-col">
              <div className="px-4 pt-4 pb-3 border-b border-white/10">
                <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-500">
                  Search inbox… (/ to focus)
                </div>
              </div>
              <ul className="divide-y divide-white/10 overflow-hidden">
                {MOCK_INBOX.map((m, i) => (
                  <li key={m.from} className={`px-4 py-3 ${i === 0 ? "bg-white/10" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={m.unread ? "font-semibold text-white" : "text-gray-300"}>
                        {m.from}
                      </span>
                      {m.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-[#c2ee2c]" />}
                    </div>
                    <div className={m.unread ? "font-semibold text-white" : "text-gray-200"}>{m.subject}</div>
                    <div className="text-sm text-gray-500 truncate">{m.snippet}</div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Reading pane */}
            <div className="flex-1 p-6">
              <div className="text-lg font-semibold text-white">{MOCK_INBOX[0].subject}</div>
              <div className="text-sm text-gray-500 mt-1">{MOCK_INBOX[0].from}</div>
              <div className="mt-6 space-y-3">
                <div className="h-2.5 w-full rounded bg-white/10" />
                <div className="h-2.5 w-5/6 rounded bg-white/10" />
                <div className="h-2.5 w-2/3 rounded bg-white/10" />
              </div>
              <div className="mt-6 inline-flex items-center h-9 px-4 rounded-pill bg-primary text-white text-sm font-semibold">
                Draft reply
              </div>
            </div>
          </div>
          <div className="absolute -bottom-8 -right-6 w-56 rounded-xl bg-surface-dark-elevated border border-white/10 p-5 rotate-[2deg] shadow-2xl">
            <div className="text-xs text-semantic-up font-mono">Vault unlocked</div>
            <div className="h-2 w-3/4 rounded bg-white/10 mt-3" />
            <div className="h-2 w-1/2 rounded bg-white/10 mt-2" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 sm:px-10 py-24 max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-normal tracking-tight text-center max-w-xl mx-auto">
          Everything a fast inbox needs. Nothing that reads your mail to sell you ads.
        </h2>
        <div className="mt-16 grid sm:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-hairline p-8">
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-3 text-body leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="px-6 sm:px-10 py-24 bg-surface-soft">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-normal tracking-tight text-center max-w-2xl mx-auto">
            Every other fast inbox asks you to trust someone else.
          </h2>
          <div className="mt-14 grid sm:grid-cols-3 gap-6">
            {COMPARISON.map((c) => (
              <div key={c.who} className="rounded-xl bg-canvas border border-hairline p-8">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
                  {c.who}
                </div>
                <p className="text-body leading-relaxed">{c.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quickstart */}
      <section id="quickstart" className="px-6 sm:px-10 py-24">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-normal tracking-tight">
            Running in about 5 minutes.
          </h2>
          <p className="mt-4 text-body">
            Full walkthrough, including your own Google OAuth client, in{" "}
            <a
              href="https://github.com/your-repo/blob/main/docs/SELF_HOSTING.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              docs/SELF_HOSTING.md
            </a>
            .
          </p>
          <div className="mt-8 text-left rounded-xl bg-surface-dark text-white/90 p-6 font-mono text-sm relative">
            <button
              type="button"
              onClick={handleCopy}
              className="absolute top-4 right-4 text-xs px-3 py-1 rounded-pill bg-white/10 hover:bg-white/20 transition-colors"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <pre className="whitespace-pre-wrap leading-relaxed">{QUICKSTART}</pre>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-surface-dark text-white px-6 sm:px-10 py-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-normal tracking-tight max-w-lg mx-auto">
          Take your inbox back.
        </h2>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://github.com/your-repo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center h-14 px-8 rounded-pill bg-primary text-white font-semibold hover:bg-primary-active transition-colors"
          >
            View on GitHub
          </a>
          <a
            href="https://github.com/your-repo/blob/main/docs/SELF_HOSTING.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center h-14 px-8 rounded-pill border border-white/30 font-semibold hover:bg-white/10 transition-colors"
          >
            Read the docs
          </a>
        </div>
      </section>

      <footer className="text-center py-10 text-sm text-muted">
        Everything&apos;s public — the wins, the bugs, the 3am commits →{" "}
        <a
          href="https://www.linkedin.com/in/nishal-poojary/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-ink"
        >
          LinkedIn
        </a>{" "}
        &{" "}
        <a
          href="https://x.com/nishalbuilds"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-ink"
        >
          X
        </a>
      </footer>
    </div>
  );
}

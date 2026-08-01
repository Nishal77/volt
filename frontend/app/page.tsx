"use client";

import { useState } from "react";

const REPO_URL = "https://github.com/Nishal77/volt";

const INSTALL_ONE_LINE = "curl -fsSL https://volt-xi-rust.vercel.app/install.sh | bash";

const MANUAL_INSTALL = `git clone ${REPO_URL} && cd volt/deploy
cp .env.example .env
docker compose up --build`;

const MOCK_INBOX = [
  { from: "Stripe", subject: "Unusual sign-in detected", snippet: "We noticed a new sign-in to your account from a new device…", unread: true },
  { from: "GitHub", subject: "[volt] New star from a contributor", snippet: "Someone just starred your repository nishal77/volt", unread: true },
  { from: "Linear", subject: "Weekly digest — 3 issues closed", snippet: "Here's what shipped on your team this week…", unread: false },
];

const FEATURES = [
  {
    title: "Keyboard-first, start to finish",
    body: "Archive, reply, navigate threads, command palette, snippets. The entire inbox, zero mouse required.",
  },
  {
    title: "Bring your own AI key",
    body: "Summarize, draft, and search in plain English. Your key, your provider, your inference cost. We never see it.",
  },
  {
    title: "Zero-knowledge encryption",
    body: "Your encryption key exists only in your head and briefly in server memory. Not in the database. Not in an env var. Not on disk, anywhere.",
  },
  {
    title: "Native MCP server",
    body: "Point Claude Code or Cursor at your own running instance. Read, search, and draft. Sending stays a human clicking a button.",
  },
  {
    title: "Auditable AI prompts",
    body: "Every prompt Volt sends is a plain text file, loaded fresh at runtime. Open /prompts and read exactly what your provider receives.",
  },
  {
    title: "No read receipts, ever",
    body: "Not deferred, not a setting to disable. Volt doesn't build open tracking into the product, full stop.",
  },
];

type ComparisonCell = true | false | string;

const COMPARISON_TABLE: {
  feature: string;
  volt: ComparisonCell;
  superhuman: ComparisonCell;
  gmail: ComparisonCell;
  hey: ComparisonCell;
}[] = [
  { feature: "Where your inbox actually runs", volt: "Your own server", superhuman: "Their cloud", gmail: "Google's cloud", hey: "Their cloud" },
  { feature: "Open source", volt: true, superhuman: false, gmail: false, hey: false },
  { feature: "Pricing", volt: "Free", superhuman: "$30/mo", gmail: "Free (ads) / Workspace", hey: "$99/yr" },
  { feature: "AI cost model", volt: "BYO key, $0 markup", superhuman: "Bundled subscription", gmail: "Bundled (Gemini)", hey: "Not offered" },
  { feature: "Encryption you can verify yourself", volt: true, superhuman: false, gmail: false, hey: false },
  { feature: "Keyboard-first, zero mouse required", volt: true, superhuman: true, gmail: "Basic shortcuts", hey: "Partial" },
  { feature: "Native MCP / AI agent integration", volt: true, superhuman: false, gmail: false, hey: false },
  { feature: "Read receipts / open tracking", volt: "Never", superhuman: "On by default", gmail: "No", hey: "No" },
  { feature: "Self-hostable", volt: true, superhuman: false, gmail: false, hey: false },
  { feature: "Single-account, no vendor lock-in", volt: true, superhuman: false, gmail: "Tied to Google", hey: "Own email required" },
];

function ComparisonCellValue({ value }: { value: ComparisonCell }) {
  if (value === true) return <span className="text-semantic-up font-semibold">✓</span>;
  if (value === false) return <span className="text-muted">—</span>;
  return <span className="text-body">{value}</span>;
}

function CopyBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="text-left rounded-xl bg-surface-dark text-white/90 p-6 font-mono text-sm relative">
      <div className="absolute top-4 left-6 text-[11px] uppercase tracking-wide text-white/40">{label}</div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute top-4 right-4 text-xs px-3 py-1 rounded-pill bg-white/10 hover:bg-white/20 transition-colors"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="whitespace-pre-wrap leading-relaxed mt-5">{code}</pre>
    </div>
  );
}

export default function Home() {
  return (
    <div className="bg-canvas text-ink">
      {/* Nav */}
      <nav className="sticky top-0 z-30 h-16 flex items-center justify-between px-6 sm:px-10 bg-canvas/80 backdrop-blur border-b border-hairline">
        <div className="text-lg font-semibold tracking-tight">Volt</div>
        <div className="flex items-center gap-3">
          <a href="#compare" className="hidden sm:inline text-sm text-body hover:text-ink transition-colors">
            Compare
          </a>
          <a href="/docs" className="hidden sm:inline text-sm text-body hover:text-ink transition-colors">
            Docs
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center h-10 px-5 rounded-pill bg-primary text-white text-sm font-semibold hover:bg-primary-active transition-colors"
          >
            Star on GitHub
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-surface-dark text-white px-6 sm:px-10 pt-24 sm:pt-32 pb-32 sm:pb-40 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background: "radial-gradient(600px circle at 50% 0%, rgba(0,82,255,0.25), transparent 60%)",
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
            inbox to someone else&apos;s cloud. Volt runs on your own machine,
            encrypts your data with a key only you hold, and never sends a
            single email without you clicking send.
          </p>

          <div className="mt-10 max-w-xl mx-auto">
            <div className="rounded-xl bg-black/40 border border-white/10 px-5 py-3.5 flex items-center gap-3 font-mono text-sm text-left overflow-x-auto">
              <span className="text-semantic-up shrink-0">$</span>
              <span className="text-white/90 whitespace-nowrap">{INSTALL_ONE_LINE}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(INSTALL_ONE_LINE)}
                className="ml-auto shrink-0 text-xs px-3 py-1 rounded-pill bg-white/10 hover:bg-white/20 transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="mt-2 text-xs text-white/40">
              Needs Docker installed and running. No Docker yet?{" "}
              <a href="https://docker.com/get-started" target="_blank" rel="noopener noreferrer" className="underline">
                Get it free
              </a>
              .
            </p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center h-14 px-8 rounded-pill bg-primary text-white font-semibold hover:bg-primary-active transition-colors"
            >
              View on GitHub
            </a>
            <a
              href="/docs"
              className="inline-flex items-center h-14 px-8 rounded-pill border border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              Read the docs
            </a>
          </div>
        </div>

        {/* Product mockup */}
        <div className="relative mt-24 max-w-4xl mx-auto hidden md:block">
          <div className="rounded-xl bg-black border border-white/10 shadow-2xl overflow-hidden rotate-[-0.5deg] flex h-[380px]">
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
                      <span className={m.unread ? "font-semibold text-white" : "text-gray-300"}>{m.from}</span>
                      {m.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-[#c2ee2c]" />}
                    </div>
                    <div className={m.unread ? "font-semibold text-white" : "text-gray-200"}>{m.subject}</div>
                    <div className="text-sm text-gray-500 truncate">{m.snippet}</div>
                  </li>
                ))}
              </ul>
            </div>

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

      {/* Proof strip */}
      <section className="px-6 sm:px-10 py-10 border-b border-hairline">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-muted">
          <span>MIT-licensed</span>
          <span className="h-1 w-1 rounded-full bg-hairline" />
          <span>Runs on your own hardware</span>
          <span className="h-1 w-1 rounded-full bg-hairline" />
          <span>No hosted Volt, ever</span>
          <span className="h-1 w-1 rounded-full bg-hairline" />
          <span>Argon2id + AES-256-GCM</span>
          <span className="h-1 w-1 rounded-full bg-hairline" />
          <span>Every AI prompt readable in-app</span>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 sm:px-10 py-24 max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-normal tracking-tight text-center max-w-xl mx-auto">
          Everything a fast inbox needs. Nothing that reads your mail to sell you ads.
        </h2>
        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-hairline p-8">
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-3 text-body leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security deep-dive */}
      <section className="px-6 sm:px-10 py-24 bg-surface-dark text-white">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-3 py-1 rounded-pill bg-white/10 text-xs font-semibold tracking-wide uppercase mb-6">
              Zero-knowledge, actually
            </span>
            <h2 className="text-3xl sm:text-4xl font-normal tracking-tight leading-tight">
              A stolen database is still useless without your passphrase.
            </h2>
            <p className="mt-6 text-white/70 leading-relaxed">
              Your Gmail token and AI key are encrypted with AES-256-GCM. The
              key that decrypts them is derived from a passphrase only you
              know, using Argon2id, and it lives only in server memory while
              the process runs. Not in the database. Not in an env var. Not
              on disk, anywhere. Restart the server and it&apos;s gone until you
              unlock it again.
            </p>
            <a href="/docs#security" className="mt-6 inline-block text-primary underline">
              Read the full writeup
            </a>
          </div>
          <div className="rounded-xl bg-surface-dark-elevated border border-white/10 p-6 font-mono text-sm">
            <div className="text-white/40 mb-4"># what a stolen DB dump actually contains</div>
            <div className="text-white/70">encrypted_token: <span className="text-white/40">0x8f3a...c91e</span></div>
            <div className="text-white/70 mt-2">encrypted_key: <span className="text-white/40">0x2b7d...44f0</span></div>
            <div className="mt-6 text-semantic-up">{"// decryption key: nowhere in this database"}</div>
            <div className="text-semantic-up">{"// exists only in your head + server memory"}</div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="px-6 sm:px-10 py-24 bg-surface-soft">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-normal tracking-tight text-center max-w-2xl mx-auto">
            Every other fast inbox asks you to trust someone else.
          </h2>
          <p className="mt-4 text-body text-center max-w-xl mx-auto">
            Superhuman, Gmail, and Hey are all excellent products. None of them let you run the whole thing yourself.
          </p>

          <div className="mt-14 overflow-x-auto rounded-xl border border-hairline bg-canvas">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="text-left font-medium text-muted px-6 py-4">Feature</th>
                  <th className="text-left font-semibold text-primary px-6 py-4 bg-primary/[0.04]">Volt</th>
                  <th className="text-left font-medium text-ink px-6 py-4">Superhuman</th>
                  <th className="text-left font-medium text-ink px-6 py-4">Gmail</th>
                  <th className="text-left font-medium text-ink px-6 py-4">Hey</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_TABLE.map((row) => (
                  <tr key={row.feature} className="border-b border-hairline last:border-0">
                    <td className="px-6 py-4 text-body">{row.feature}</td>
                    <td className="px-6 py-4 bg-primary/[0.04] font-medium">
                      <ComparisonCellValue value={row.volt} />
                    </td>
                    <td className="px-6 py-4">
                      <ComparisonCellValue value={row.superhuman} />
                    </td>
                    <td className="px-6 py-4">
                      <ComparisonCellValue value={row.gmail} />
                    </td>
                    <td className="px-6 py-4">
                      <ComparisonCellValue value={row.hey} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted text-center">
            Competitor details reflect public product positioning as of writing, verify against each vendor before quoting.
          </p>
        </div>
      </section>

      {/* MCP */}
      <section className="px-6 sm:px-10 py-24 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-normal tracking-tight">
          Your AI assistant can already read this page. Now it can read your inbox too.
        </h2>
        <p className="mt-6 text-body max-w-2xl mx-auto leading-relaxed">
          Volt ships a native MCP server. Point Claude Code or Cursor at your
          own running instance and ask it to triage, search, or draft in
          your real inbox, as part of a normal conversation.
        </p>
        <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-2 font-mono text-xs">
          {["list_inbox", "get_thread", "search_inbox", "draft_reply", "archive_thread", "star_thread", "mark_thread_read"].map((tool) => (
            <span key={tool} className="px-3 py-1.5 rounded-pill bg-surface-strong text-ink">
              {tool}
            </span>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">
          No <code className="text-ink">send_email</code> tool exists in this codebase. On purpose.
        </p>
      </section>

      {/* Quickstart */}
      <section id="quickstart" className="px-6 sm:px-10 py-24 bg-surface-soft">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-normal tracking-tight">Running in about 5 minutes.</h2>
          <p className="mt-4 text-body">
            One command if Docker&apos;s already installed. Full walkthrough, including your own Google
            OAuth client, in the{" "}
            <a href="/docs#getting-started" className="text-primary underline">
              docs
            </a>
            .
          </p>
          <div className="mt-8">
            <CopyBlock code={INSTALL_ONE_LINE} label="one line" />
          </div>
          <p className="mt-6 text-sm text-muted">Prefer to see every step yourself?</p>
          <div className="mt-3">
            <CopyBlock code={MANUAL_INSTALL} label="manual" />
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
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center h-14 px-8 rounded-pill bg-primary text-white font-semibold hover:bg-primary-active transition-colors"
          >
            View on GitHub
          </a>
          <a
            href="/docs"
            className="inline-flex items-center h-14 px-8 rounded-pill border border-white/30 font-semibold hover:bg-white/10 transition-colors"
          >
            Read the docs
          </a>
        </div>
      </section>

      <footer className="text-center py-10 text-sm text-muted">
        Everything&apos;s public, the wins, the bugs, the 3am commits →{" "}
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

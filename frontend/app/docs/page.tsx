"use client";

import { useEffect, useState, type ReactNode } from "react";

type NavItem = { id: string; label: string };
type NavGroup = { title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    title: "Start here",
    items: [
      { id: "what-is-volt", label: "What Volt actually is" },
      { id: "getting-started", label: "Installing it" },
      { id: "first-run", label: "First run: OAuth & the vault" },
    ],
  },
  {
    title: "Using it",
    items: [
      { id: "inbox", label: "The inbox" },
      { id: "shortcuts", label: "Keyboard shortcuts" },
      { id: "composing", label: "Writing & sending mail" },
    ],
  },
  {
    title: "AI features",
    items: [
      { id: "ai-key", label: "Bring your own key" },
      { id: "ai-features", label: "Summarize, draft, search, chat" },
      { id: "prompts", label: "Reading the actual prompts" },
    ],
  },
  {
    title: "Under the hood",
    items: [
      { id: "security", label: "How your credentials are protected" },
      { id: "mcp", label: "The MCP server" },
      { id: "self-hosting", label: "Updating & self-hosting" },
    ],
  },
  {
    title: "Help",
    items: [
      { id: "troubleshooting", label: "Troubleshooting" },
      { id: "faq", label: "FAQ" },
    ],
  },
];

const ALL_IDS = NAV.flatMap((g) => g.items.map((i) => i.id));

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-md bg-black/[0.05] border border-black/[0.08] text-[11.5px] font-medium text-gray-600">
      {children}
    </kbd>
  );
}

function Section({
  id,
  title,
  eyebrow,
  children,
}: {
  id: string;
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 py-12 border-b border-black/[0.06] last:border-b-0">
      {eyebrow && (
        <p className="text-[12px] font-semibold tracking-wide text-[#4f46e5] uppercase mb-2">{eyebrow}</p>
      )}
      <h2 className="text-[26px] font-bold tracking-tight text-[#1a1a1a] mb-5">{title}</h2>
      <div className="space-y-4 text-[15px] leading-[1.75] text-gray-600">{children}</div>
    </section>
  );
}

function Callout({ tone = "info", children }: { tone?: "info" | "warn"; children: ReactNode }) {
  const styles =
    tone === "warn"
      ? "bg-amber-50 border-amber-200 text-amber-900"
      : "bg-[#4f46e5]/[0.05] border-[#4f46e5]/20 text-[#1a1a1a]";
  return <div className={`rounded-xl border px-4 py-3.5 text-[14px] leading-relaxed ${styles}`}>{children}</div>;
}

function Code({ children }: { children: ReactNode }) {
  return (
    <pre className="rounded-xl bg-[#0a0b0d] text-[#e5e7eb] px-4 py-3.5 text-[13px] leading-[1.7] overflow-x-auto">
      <code>{children}</code>
    </pre>
  );
}

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded-md bg-black/[0.05] border border-black/[0.06] text-[13px] text-[#1a1a1a]">
      {children}
    </code>
  );
}

export default function DocsPage() {
  const [active, setActive] = useState(ALL_IDS[0]);

  useEffect(() => {
    function onScroll() {
      const threshold = window.innerHeight * 0.3;
      let current = ALL_IDS[0];
      for (const id of ALL_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= threshold) {
          current = id;
        }
      }
      setActive(current);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(79,70,229,0.06),transparent)]" />

      <div className="relative max-w-6xl mx-auto px-6 flex gap-14">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0 py-12">
          <nav className="sticky top-24 space-y-7">
            {NAV.map((group) => (
              <div key={group.title}>
                <p className="text-[11.5px] font-semibold tracking-wide text-gray-400 uppercase mb-2.5">
                  {group.title}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className={`block text-[13.5px] py-1.5 px-2.5 -mx-2.5 rounded-lg transition-colors ${
                          active === item.id
                            ? "bg-[#4f46e5]/[0.08] text-[#4f46e5] font-medium"
                            : "text-gray-500 hover:text-[#1a1a1a] hover:bg-black/[0.03]"
                        }`}
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 py-12 max-w-2xl">
          <div className="mb-4">
            <p className="text-[13px] font-semibold text-[#4f46e5] mb-3">Documentation</p>
            <h1 className="text-[42px] leading-[1.05] font-extrabold tracking-[-0.03em] bg-gradient-to-b from-[#161821] to-[#3a3d4d] bg-clip-text text-transparent mb-4">
              Everything about running Volt
            </h1>
            <p className="text-[16px] leading-relaxed text-gray-500">
              Written so you don&apos;t need to be a developer to follow it. If a section
              assumes something you don&apos;t know yet, that&apos;s a bug, so open an issue.
            </p>
          </div>

          <Section id="what-is-volt" title="What Volt actually is" eyebrow="Overview">
            <p>
              Volt is an email app for Gmail that you run on your own computer or server,
              instead of using something someone else hosts for you. Think of it less like
              &quot;another Gmail client&quot; and more like a piece of software you own outright,
              the same way you&apos;d own a copy of a text editor.
            </p>
            <p>
              That distinction matters because of what it means for your inbox. A hosted AI
              email tool sees every message you get, stores your Google login token on its
              own servers, and pays for its own AI usage by charging you a subscription or by
              using your data. Volt can&apos;t do any of that, because there is no Volt server
              out there anywhere. The only copy running is the one on your machine, so your
              email, your AI provider key, and your Google login all stay on hardware you
              control.
            </p>
            <p>
              In exchange for that, you take on a bit more setup than clicking &quot;sign in with
              Google&quot; on a website. This page walks through all of it.
            </p>
          </Section>

          <Section id="getting-started" title="Installing it" eyebrow="Setup">
            <p>
              Volt runs as a small stack of three things: a database, a backend server, and
              the web app you actually look at, all bundled together with Docker Compose so
              they start with one command.
            </p>
            <p className="font-semibold text-[#1a1a1a]">The fast way</p>
            <Code>{`curl -fsSL https://get.volt.dev | bash`}</Code>
            <p>
              This installs Docker if you don&apos;t already have it, downloads the latest
              release, walks you through creating a free Google OAuth client (needed so Volt
              is allowed to talk to your Gmail, more on that below), and opens the app in
              your browser once everything&apos;s healthy.
            </p>
            <p>Prefer to read the script before running it?</p>
            <Code>{`curl -fsSL https://get.volt.dev -o install.sh\nless install.sh\nbash install.sh`}</Code>
            <p className="font-semibold text-[#1a1a1a]">The manual way</p>
            <p>If you&apos;d rather clone the repo and see every step yourself:</p>
            <Code>{`git clone https://github.com/Nishal77/volt && cd volt/deploy\ncp .env.example .env   # then paste in your own Google OAuth client\ndocker compose up --build`}</Code>
            <Callout>
              Every environment variable Volt reads, what it does, whether it&apos;s required,
              and its default, is listed in <InlineCode>docs/CONFIGURATION.md</InlineCode> in
              the repo, and the full step-by-step (including the Google Cloud Console part) is
              in <InlineCode>docs/SELF_HOSTING.md</InlineCode>.
            </Callout>
          </Section>

          <Section id="first-run" title="First run: OAuth & the vault" eyebrow="Setup">
            <p>
              The first time Volt starts, two things happen before you can see a single
              email.
            </p>
            <p className="font-semibold text-[#1a1a1a]">1. Connect Gmail</p>
            <p>
              Volt asks Google for permission to read and act on your inbox, the same consent
              screen you&apos;ve seen on any &quot;sign in with Google&quot; button. It only asks for
              the minimum it needs to read mail, send mail, and organize your inbox, nothing
              broader. Google keeps the ability to revoke that access at any time from your
              own account settings, independent of Volt.
            </p>
            <p className="font-semibold text-[#1a1a1a]">2. Create a vault passphrase</p>
            <p>
              Before Volt will touch your Gmail token or an AI key, it asks you to choose a
              passphrase. This isn&apos;t a login password, it&apos;s the key that encrypts your
              credentials on disk. Volt never stores this passphrase anywhere. It exists only
              in your head and, briefly, in the server&apos;s memory while it&apos;s running.
            </p>
            <Callout tone="warn">
              There is no &quot;forgot password&quot; recovery for the vault passphrase, on purpose.
              If Volt could recover it for you, that would mean Volt (or whoever has access to
              its server) could unlock your data without you, which defeats the entire point.
              If you lose it, you reset the vault and reconnect Gmail; nothing else is
              recoverable.
            </Callout>
            <p>
              Every time the Volt server restarts, whether that&apos;s a reboot, an update, or a
              crash, that key is gone from memory and you&apos;ll be asked to unlock the vault
              again with your passphrase. That&apos;s expected behavior, not a bug.
            </p>
          </Section>

          <Section id="inbox" title="The inbox" eyebrow="Daily use">
            <p>
              Your inbox is split automatically into a few sections, without you having to set
              up filters:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-[#1a1a1a]">New for you.</strong> Unread mail from
                real people and services, the stuff you actually came here to read.
              </li>
              <li>
                <strong className="text-[#1a1a1a]">Needs a follow-up.</strong> Threads you
                sent and haven&apos;t heard back on after a few days. Volt notices this by
                reading who sent the last message and when, nothing more exotic than that.
              </li>
              <li>
                <strong className="text-[#1a1a1a]">Newsletters.</strong> Mail that looks like
                a mailing list, kept out of your main view so it doesn&apos;t bury real
                conversations.
              </li>
            </ul>
            <p>
              Hovering a row selects it. Clicking opens the thread. The star icon marks
              something you want to come back to, and archiving just removes it from your
              inbox view. Nothing is deleted.
            </p>
          </Section>

          <Section id="shortcuts" title="Keyboard shortcuts" eyebrow="Daily use">
            <p>
              Volt is built to be used without touching the mouse. Press <Kbd>?</Kbd> at any
              time inside the app to see this same list on screen.
            </p>
            <div className="rounded-2xl border border-black/[0.06] divide-y divide-black/[0.06] overflow-hidden">
              {[
                ["j / ↓", "Move to the next email"],
                ["k / ↑", "Move to the previous email"],
                ["Enter / o", "Open the selected email"],
                ["x", "Archive the selected email"],
                ["s", "Star or unstar the selected email"],
                ["z", "Undo the last archive"],
                ["/", "Search your inbox"],
                ["⌘K / Ctrl K", "Open the command palette and jump anywhere"],
                ["?", "Show this shortcut list"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between px-4 py-3">
                  <span className="text-[14px] text-gray-600">{desc}</span>
                  <div className="flex items-center gap-1">
                    {key.split(" / ").map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="composing" title="Writing & sending mail" eyebrow="Daily use">
            <p>
              Replies go through real MIME formatting, the same standard every email client
              uses, so attachments and formatting show up correctly for whoever you send to.
              It&apos;s not a plain-text workaround.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-[#1a1a1a]">Snippets.</strong> Save chunks of text you
                type often and drop them into a reply instead of retyping them. Manage these
                from <InlineCode>/snippets</InlineCode>.
              </li>
              <li>
                <strong className="text-[#1a1a1a]">Signature.</strong> Set once in{" "}
                <InlineCode>/settings</InlineCode>, appended automatically to what you write.
              </li>
              <li>
                <strong className="text-[#1a1a1a]">Send later.</strong> Write a reply now,
                schedule it to actually go out at a specific time. It sits in your outbox
                until then, and you can cancel it before it sends.
              </li>
              <li>
                <strong className="text-[#1a1a1a]">Attachments.</strong> Attach files to
                what you send, and view what other people attached to what they sent you.
              </li>
            </ul>
          </Section>

          <Section id="ai-key" title="Bring your own key" eyebrow="AI features">
            <p>
              Volt doesn&apos;t include AI access of its own. You connect an account you
              already have (or sign up free for one) from a provider, and Volt uses that key
              on your behalf. This is a deliberate choice: it means Volt never pays for your
              AI usage, never marks it up, and never sees a reason to look at what you&apos;re
              asking it.
            </p>
            <p>Supported providers, from <InlineCode>/settings</InlineCode>:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Anthropic (Claude)</li>
              <li>OpenAI</li>
              <li>Google (Gemini, has a free tier)</li>
              <li>Groq (free tier)</li>
              <li>Kimi (Moonshot AI)</li>
              <li>OpenRouter</li>
            </ul>
            <p>
              When you paste a key in, Volt checks it against the provider immediately before
              saving it, so you find out right away if it was copied wrong or has no credit
              left. Once saved, it&apos;s encrypted the same way your Gmail token is. See{" "}
              <a href="#security" className="text-[#4f46e5] underline">
                how your credentials are protected
              </a>
              .
            </p>
          </Section>

          <Section id="ai-features" title="Summarize, draft, search, chat" eyebrow="AI features">
            <p>These features only run when you ask for them. Nothing happens automatically.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-[#1a1a1a]">Summarize.</strong> Condenses a long
                thread into a few sentences so you can decide if it&apos;s worth reading in
                full.
              </li>
              <li>
                <strong className="text-[#1a1a1a]">Draft a reply.</strong> Writes a reply
                based on the thread&apos;s context. It only ever produces text sitting in the
                reply box for you to read, edit, and send yourself. There is no path in Volt
                that sends an email without you clicking send, not here, not anywhere else in
                the app.
              </li>
              <li>
                <strong className="text-[#1a1a1a]">Search in plain English.</strong> Instead
                of matching exact keywords, ask something like &quot;that email about my flight
                next week&quot; and it finds threads by what they&apos;re actually about.
              </li>
              <li>
                <strong className="text-[#1a1a1a]">Chat.</strong> A sidebar assistant that
                can see your recent inbox, so you can ask it things like &quot;what did Sarah
                want from me&quot; without opening the thread yourself.
              </li>
            </ul>
            <Callout>
              None of this works until you&apos;ve added an AI key in{" "}
              <InlineCode>/settings</InlineCode>. If you see an &quot;AI not configured&quot;
              message, that&apos;s why.
            </Callout>
          </Section>

          <Section id="prompts" title="Reading the actual prompts" eyebrow="AI features">
            <p>
              Most AI products keep the exact instructions they send to the model hidden.
              Volt doesn&apos;t. Every prompt it sends, for summarizing, drafting, searching, and
              chatting, is a plain text file in the app itself, loaded fresh every time it
              runs, not buried in compiled code.
            </p>
            <p>
              Open <InlineCode>/prompts</InlineCode> in the running app to read the exact
              wording your AI provider receives, in full, before you ever send it anything.
            </p>
          </Section>

          <Section id="security" title="How your credentials are protected" eyebrow="Under the hood">
            <p>
              Your Gmail token and AI key are stored encrypted with AES-256-GCM, a standard
              symmetric encryption algorithm. What makes it meaningful is where the encryption
              key itself lives: nowhere permanent.
            </p>
            <p>
              The key is derived from the vault passphrase you set on first run, using
              Argon2id, the same class of algorithm password managers like Bitwarden use for
              this exact job, deliberately slow to make guessing it computationally expensive.
              That derived key is held only in the server&apos;s memory while it&apos;s running.
              It&apos;s never written to the database, never saved to a file, never put in an
              environment variable.
            </p>
            <p>
              The practical effect: someone who gets a copy of your database, or even your
              whole server&apos;s disk, still can&apos;t read your Gmail token or AI key without
              your passphrase, because the encryption key was never stored anywhere they could
              find it. It only ever existed in your head and briefly in the running process&apos;s
              memory.
            </p>
            <p>Volt also doesn&apos;t do read receipts or open tracking. Not a missing feature. A deliberate decision not to build it.</p>
            <Callout>
              Full technical writeup, including why this design was chosen over the
              alternatives:{" "}
              <InlineCode>docs/decisions/0003-zero-knowledge-vault.md</InlineCode> in the repo.
            </Callout>
          </Section>

          <Section id="mcp" title="The MCP server" eyebrow="Under the hood">
            <p>
              MCP is a way for AI tools like Claude Code or Cursor to talk directly to another
              piece of software. Volt ships one, so you can point an AI coding assistant at
              your own running instance and have it read, search, organize, or draft mail in
              your real inbox as part of a conversation.
            </p>
            <p>It exposes exactly seven actions:</p>
            <Code>{`list_inbox · get_thread · search_inbox · draft_reply\narchive_thread · star_thread · mark_thread_read`}</Code>
            <p>
              Every one of those either reads something or organizes something. There is no
              action to send an email. That limitation is intentional and permanent, not an
              early-version gap. An AI assistant can help you triage and write, but a human
              being clicks send, always. Setup instructions live in{" "}
              <InlineCode>mcp-server/README.md</InlineCode>.
            </p>
          </Section>

          <Section id="self-hosting" title="Updating & self-hosting" eyebrow="Under the hood">
            <p>If you installed with the one-line script:</p>
            <Code>{`volt update      # pulls the latest release, rebuilds, restarts\nvolt uninstall   # stops the stack, removes ~/.volt, nothing else touched`}</Code>
            <p>
              Updating never touches your data or your vault passphrase. Only the application
              code changes.
            </p>
            <p>If you&apos;re running the Docker Compose stack by hand:</p>
            <Code>{`cd deploy\ndocker compose down       # stop it\ngit pull                  # get the latest code\ndocker compose up --build # rebuild and start again`}</Code>
            <Callout tone="warn">
              <InlineCode>docker compose down -v</InlineCode> (note the <InlineCode>-v</InlineCode>) deletes your
              database volume, meaning your local email cache and settings. Use plain{" "}
              <InlineCode>docker compose down</InlineCode> for a normal restart.
            </Callout>
          </Section>

          <Section id="troubleshooting" title="Troubleshooting" eyebrow="Help">
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-[#1a1a1a] mb-1">
                  Google shows an &quot;unverified app&quot; warning
                </p>
                <p>
                  Expected for a self-hosted OAuth client that hasn&apos;t gone through Google&apos;s
                  public app review, which only matters for apps used by strangers, not one
                  you registered yourself for your own account. Click &quot;Advanced&quot;, then
                  &quot;Go to (your app name), unsafe&quot;. You&apos;re approving your own client
                  talking to your own account.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#1a1a1a] mb-1">
                  It keeps sending me back to the unlock screen
                </p>
                <p>
                  That&apos;s expected any time the server process restarts. The encryption key
                  intentionally doesn&apos;t survive a restart. Enter your passphrase again and
                  it&apos;ll pick up right where it left off.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#1a1a1a] mb-1">
                  &quot;AI not configured&quot; when I try to summarize or search
                </p>
                <p>
                  No AI key has been saved yet, or it failed verification. Go to{" "}
                  <InlineCode>/settings</InlineCode> and add one. It&apos;ll tell you
                  immediately if the key doesn&apos;t work.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#1a1a1a] mb-1">
                  &quot;Failed to load thread: gmail_request_failed&quot;
                </p>
                <p>
                  Usually means the backend can&apos;t reach either Gmail&apos;s API or its own
                  database. Check that your containers are actually running with{" "}
                  <InlineCode>docker compose ps</InlineCode> before assuming it&apos;s a Gmail
                  problem.
                </p>
              </div>
            </div>
            <p className="pt-2">
              More scenarios as they come up: <InlineCode>docs/TROUBLESHOOTING.md</InlineCode>{" "}
              in the repo.
            </p>
          </Section>

          <Section id="faq" title="FAQ" eyebrow="Help">
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-[#1a1a1a] mb-1">Does this work with Outlook or other providers?</p>
                <p>Not yet. Volt is Gmail-only for now, by design, so the Gmail-specific parts can be built properly instead of built shallow across five providers.</p>
              </div>
              <div>
                <p className="font-semibold text-[#1a1a1a] mb-1">Can I connect more than one Gmail account?</p>
                <p>No, one Gmail account per running instance. If you need a second account, run a second instance of Volt.</p>
              </div>
              <div>
                <p className="font-semibold text-[#1a1a1a] mb-1">Is there a hosted version I can just sign up for?</p>
                <p>No, and there won&apos;t be. Self-hosting is the entire point. Volt existing as a hosted service would mean it holding your Gmail token, which is exactly what it&apos;s built to avoid.</p>
              </div>
              <div>
                <p className="font-semibold text-[#1a1a1a] mb-1">What happens if I lose my vault passphrase?</p>
                <p>Your stored Gmail token and AI key become permanently unreadable. You reset the vault, set a new passphrase, and reconnect Gmail. There is no backdoor recovery, because a backdoor would defeat the point of a zero-knowledge vault.</p>
              </div>
              <div>
                <p className="font-semibold text-[#1a1a1a] mb-1">Does Volt read my emails to train anything?</p>
                <p>No. Your mail only ever leaves your server when you explicitly trigger an AI feature, and it goes straight to the AI provider you configured, never to Volt itself, because there&apos;s no Volt server to send it to.</p>
              </div>
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}

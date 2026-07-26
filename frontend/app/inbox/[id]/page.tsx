"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCommandPalette, type Command } from "../../components/CommandPalette";
import { applyVariables, isTypingTarget, loadSnippets } from "../../lib/snippets";

type Message = {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  body_html: string;
  unread: boolean;
};

type Thread = {
  thread_id: string;
  messages: Message[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const HTML_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === "#") return String.fromCharCode(Number(code.slice(1)));
    return HTML_ENTITIES[code.toLowerCase()] ?? match;
  });
}

function senderName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*<?/);
  const name = match?.[1]?.trim();
  return name && name.length > 0 ? name : from.replace(/<.*>/, "").trim();
}

// Renders the email exactly as sent — original formatting, images, layout.
// Sandboxed iframe with scripts disabled but allow-same-origin kept so we
// can read scrollHeight to size it; no allow-scripts means nothing in the
// email can ever execute.
function EmailBody({ html, plainFallback }: { html: string; plainFallback: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(0);

  if (!html) {
    return (
      <div className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-[#2a2d34]">
        {plainFallback || <span className="text-gray-400 italic">(no readable content)</span>}
      </div>
    );
  }

  const srcDoc = `<style>body{margin:0;font-family:-apple-system,sans-serif;}</style>${html}`;

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      sandbox="allow-same-origin"
      title="Email content"
      className={`w-full border-0 ${height === 0 ? "min-h-[300px]" : ""}`}
      style={height > 0 ? { height } : undefined}
      onLoad={() => {
        const doc = iframeRef.current?.contentDocument;
        if (!doc) return;
        const measured = Math.max(doc.body?.scrollHeight ?? 0, doc.documentElement?.scrollHeight ?? 0);
        if (measured > 0) setHeight(measured);
      }}
    />
  );
}

async function aiErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  if (body.error === "ai_not_configured") return "No AI key configured — add one in AI settings.";
  return "AI request failed. Try again.";
}

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [thread, setThread] = useState<Thread | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/inbox/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "failed_to_load");
        }
        return res.json();
      })
      .then(setThread)
      .catch((err) => setError(err instanceof Error ? err.message : "failed_to_load"));
  }, [id]);

  useEffect(() => {
    if (error === "vault_locked") router.push("/unlock");
  }, [error, router]);

  async function archive() {
    await fetch(`${API_URL}/api/inbox/${id}/archive`, { method: "POST" });
    router.push("/inbox");
  }

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      await fetch(`${API_URL}/api/inbox/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody }),
      });
      router.push("/inbox");
    } finally {
      setSending(false);
    }
  }

  async function summarize() {
    setSummarizing(true);
    setAiError(null);
    try {
      const res = await fetch(`${API_URL}/api/inbox/${id}/summarize`, { method: "POST" });
      if (!res.ok) {
        setAiError(await aiErrorMessage(res));
        return;
      }
      const data = await res.json();
      setSummary(data.summary);
    } finally {
      setSummarizing(false);
    }
  }

  async function draftReply() {
    setDrafting(true);
    setAiError(null);
    try {
      const res = await fetch(`${API_URL}/api/inbox/${id}/draft`, { method: "POST" });
      if (!res.ok) {
        setAiError(await aiErrorMessage(res));
        return;
      }
      const data = await res.json();
      setReplyBody(data.draft);
      replyRef.current?.focus();
    } finally {
      setDrafting(false);
    }
  }

  function insertSnippet(body: string) {
    setReplyBody((prev) => prev + applyVariables(body));
    replyRef.current?.focus();
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          sendReply(e as unknown as FormEvent);
        }
        return;
      }
      if (e.key === "x") archive();
      else if (e.key === "r") {
        e.preventDefault();
        replyRef.current?.focus();
      } else if (e.key === "Escape") router.push("/inbox");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread, replyBody]);

  const commands: Command[] = [
    { id: "archive", label: "Archive thread", run: archive },
    { id: "reply", label: "Focus reply box", run: () => replyRef.current?.focus() },
    { id: "back", label: "Back to inbox", run: () => router.push("/inbox") },
    { id: "summarize", label: "AI: Summarize thread", run: summarize },
    { id: "draft", label: "AI: Draft reply", run: draftReply },
    ...loadSnippets().map((s) => ({ id: s.id, label: `Insert snippet: ${s.name}`, run: () => insertSnippet(s.body) })),
  ];
  const { palette } = useCommandPalette(commands);

  if (error === "not_connected" || error === "reconnect_required") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-[#1a1a1a]">
        {palette}
        <a href={`${API_URL}/auth/google`} className="px-6 py-3 rounded-xl bg-[#4f46e5] hover:bg-[#3c34c9] text-white text-sm font-medium transition-colors">
          Reconnect Gmail
        </a>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-[#1a1a1a]">
        {palette}
        Failed to load thread: {error}
      </div>
    );
  }
  if (!thread) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-[#1a1a1a]">{palette}Loading…</div>;
  }

  const subject = thread.messages[thread.messages.length - 1]?.subject;

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      {palette}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(79,70,229,0.06),transparent)]" />

      <div className="relative max-w-2xl mx-auto px-6 py-8">
        <Link href="/inbox" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#1a1a1a] transition-colors mb-6">
          ← Back to inbox
        </Link>

        {subject && (
          <h1 className="text-2xl font-bold tracking-[-0.01em] mb-6">{decodeEntities(subject)}</h1>
        )}

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={archive}
            className="px-4 py-2 rounded-xl bg-black/[0.04] hover:bg-black/[0.07] text-sm font-medium transition-colors"
          >
            Archive
          </button>
          <button
            type="button"
            onClick={summarize}
            disabled={summarizing}
            className="px-4 py-2 rounded-xl bg-black/[0.04] hover:bg-black/[0.07] disabled:opacity-60 text-sm font-medium transition-colors"
          >
            {summarizing ? "Summarizing…" : "AI Summarize"}
          </button>
          <button
            type="button"
            onClick={draftReply}
            disabled={drafting}
            className="px-4 py-2 rounded-xl bg-black/[0.04] hover:bg-black/[0.07] disabled:opacity-60 text-sm font-medium transition-colors"
          >
            {drafting ? "Drafting…" : "AI Draft reply"}
          </button>
        </div>

        {aiError && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
            {aiError}
          </div>
        )}

        {summary && (
          <div className="mb-6 rounded-xl border border-[#4f46e5]/15 bg-[#4f46e5]/5 p-4 text-sm text-[#1a1a1a] leading-relaxed">
            {summary}
          </div>
        )}

        <div className="divide-y divide-black/[0.06] mb-8">
          {thread.messages.map((m) => (
            <div key={m.id} className="py-5">
              <div className="flex items-baseline justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{senderName(m.from)}</div>
                  <div className="text-xs text-gray-400 truncate">{m.from} → {m.to}</div>
                </div>
                <div className="text-xs text-gray-400 shrink-0 tabular-nums">{m.date}</div>
              </div>
              <EmailBody html={m.body_html} plainFallback={decodeEntities(m.body)} />
            </div>
          ))}
        </div>

        <form onSubmit={sendReply}>
          <textarea
            ref={replyRef}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Reply… (r to focus, ⌘/Ctrl+Enter to send)"
            rows={4}
            className="w-full rounded-xl bg-black/[0.03] border border-black/[0.06] p-3.5 text-sm placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5]/30 transition-shadow"
          />
          <button
            type="submit"
            disabled={sending || !replyBody.trim()}
            className="mt-3 px-6 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#3c34c9] disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {sending ? "Sending…" : "Send reply"}
          </button>
        </form>
      </div>
    </div>
  );
}

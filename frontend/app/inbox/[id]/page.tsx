"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
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
  unread: boolean;
};

type Thread = {
  thread_id: string;
  messages: Message[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

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
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        {palette}
        <a href={`${API_URL}/auth/google`} className="px-6 py-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-sm">
          Reconnect Gmail
        </a>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        {palette}
        Failed to load thread: {error}
      </div>
    );
  }
  if (!thread) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">{palette}Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {palette}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={archive}
            className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-sm"
          >
            Archive
          </button>
          <button
            type="button"
            onClick={summarize}
            disabled={summarizing}
            className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-60 text-sm"
          >
            {summarizing ? "Summarizing…" : "AI Summarize"}
          </button>
          <button
            type="button"
            onClick={draftReply}
            disabled={drafting}
            className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-60 text-sm"
          >
            {drafting ? "Drafting…" : "AI Draft reply"}
          </button>
        </div>

        {aiError && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {aiError}
          </div>
        )}

        {summary && (
          <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">
            {summary}
          </div>
        )}

        <div className="space-y-4">
          {thread.messages.map((m) => (
            <div key={m.id} className="border border-white/10 rounded-xl p-4">
              <div className="text-sm text-gray-400">
                {m.from} → {m.to}
              </div>
              <div className="text-xs text-gray-500">{m.date}</div>
              <div className="mt-2 whitespace-pre-wrap">{m.body}</div>
            </div>
          ))}
        </div>

        <form onSubmit={sendReply} className="mt-6">
          <textarea
            ref={replyRef}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Reply… (r to focus, ⌘/Ctrl+Enter to send)"
            rows={4}
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-white"
          />
          <button
            type="submit"
            disabled={sending}
            className="mt-2 px-6 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-60 text-sm"
          >
            {sending ? "Sending…" : "Send reply"}
          </button>
        </form>
      </div>
    </div>
  );
}

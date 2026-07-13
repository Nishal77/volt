"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";

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

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [thread, setThread] = useState<Thread | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

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

  if (error === "not_connected" || error === "reconnect_required") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <a href={`${API_URL}/auth/google`} className="px-6 py-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-sm">
          Reconnect Gmail
        </a>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Failed to load thread: {error}
      </div>
    );
  }
  if (!thread) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          type="button"
          onClick={archive}
          className="mb-4 px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-sm"
        >
          Archive
        </button>

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
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Reply…"
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

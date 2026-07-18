"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCommandPalette, type Command } from "../components/CommandPalette";
import { isTypingTarget } from "../lib/snippets";

type Message = {
  thread_id: string;
  subject: string;
  from: string;
  snippet: string;
  unread: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function ConnectGmail({ reason }: { reason?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-black text-white">
      {reason && <p className="text-sm text-gray-400">Connection failed: {reason}</p>}
      <a
        href={`${API_URL}/auth/google`}
        className="px-6 py-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] transition-colors text-sm font-medium"
      >
        Connect Gmail
      </a>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black text-white">Loading…</div>}>
      <InboxContent />
    </Suspense>
  );
}

function InboxContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const oauthError = searchParams.get("error");

  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);

  function load() {
    fetch(`${API_URL}/api/inbox`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "failed_to_load");
        }
        return res.json();
      })
      .then((data) => setMessages(data.messages))
      .catch((err) => setError(err instanceof Error ? err.message : "failed_to_load"));
  }

  useEffect(() => {
    if (oauthError) return;
    load();
  }, [oauthError]);

  function archive(threadId: string) {
    fetch(`${API_URL}/api/inbox/${threadId}/archive`, { method: "POST" });
    setMessages((prev) => (prev ? prev.filter((m) => m.thread_id !== threadId) : prev));
  }

  function open(threadId: string) {
    router.push(`/inbox/${threadId}`);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target) || !messages || messages.length === 0) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((i) => Math.min(i + 1, messages.length - 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "o") {
        open(messages[selected].thread_id);
      } else if (e.key === "x") {
        archive(messages[selected].thread_id);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, selected]);

  const commands: Command[] = [
    { id: "reload", label: "Reload inbox", run: load },
    { id: "snippets", label: "Manage snippets", run: () => router.push("/snippets") },
    ...(messages && messages[selected]
      ? [
          { id: "open", label: "Open selected thread", run: () => open(messages[selected].thread_id) },
          { id: "archive", label: "Archive selected thread", run: () => archive(messages[selected].thread_id) },
        ]
      : []),
  ];
  const { palette } = useCommandPalette(commands);

  if (oauthError) return <>{palette}<ConnectGmail reason={oauthError} /></>;
  if (error === "not_connected" || error === "reconnect_required") return <>{palette}<ConnectGmail reason={error} /></>;
  if (error === "rate_limited") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        {palette}
        Gmail is rate-limiting requests right now — try again in a minute.
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        {palette}
        Failed to load inbox: {error}
      </div>
    );
  }
  if (!messages) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">{palette}Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {palette}
      <ul className="max-w-2xl mx-auto divide-y divide-white/10">
        {messages.length === 0 && (
          <li className="px-4 py-8 text-center text-gray-400">Inbox zero.</li>
        )}
        {messages.map((m, i) => (
          <li key={m.thread_id}>
            <Link
              href={`/inbox/${m.thread_id}`}
              onMouseEnter={() => setSelected(i)}
              className={`block px-4 py-3 hover:bg-white/5 ${i === selected ? "bg-white/10" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`truncate ${m.unread ? "font-semibold" : "text-gray-300"}`}>{m.from}</span>
                {m.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-[#c2ee2c]" />}
              </div>
              <div className={m.unread ? "font-semibold" : "text-gray-200"}>{m.subject}</div>
              <div className="text-sm text-gray-500 truncate">{m.snippet}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

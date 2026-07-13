"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
  const oauthError = searchParams.get("error");

  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (oauthError) return;
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
  }, [oauthError]);

  if (oauthError) return <ConnectGmail reason={oauthError} />;
  if (error === "not_connected" || error === "reconnect_required") return <ConnectGmail reason={error} />;
  if (error === "rate_limited") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Gmail is rate-limiting requests right now — try again in a minute.
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Failed to load inbox: {error}
      </div>
    );
  }
  if (!messages) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <ul className="max-w-2xl mx-auto divide-y divide-white/10">
        {messages.length === 0 && (
          <li className="px-4 py-8 text-center text-gray-400">Inbox zero.</li>
        )}
        {messages.map((m) => (
          <li key={m.thread_id}>
            <Link href={`/inbox/${m.thread_id}`} className="block px-4 py-3 hover:bg-white/5">
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

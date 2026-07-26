"use client";

import { useEffect, useState, type FormEvent } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type ChatMessage = { role: "user" | "assistant"; text: string };
type AiStatus = { configured: boolean; provider?: "anthropic" | "openai" };

// Toggle button — render next to "AI settings" in the inbox header.
export function AiChatToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-sm text-gray-400 hover:text-[#1a1a1a] whitespace-nowrap transition-colors"
    >
      {open ? "Close chat" : "Open chat"}
    </button>
  );
}

// Slide-in panel — render once at the page root, controlled by `open`.
export function AiChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch(`${API_URL}/api/settings/ai-key`)
      .then((res) => res.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [open]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          body.error === "ai_not_configured" ? "No AI key configured — pick a provider below." : "Chat failed. Try again."
        );
        return;
      }
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch {
      setError("Chat failed. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className={`shrink-0 overflow-hidden border-l border-black/[0.06] transition-[width] duration-200 ${
        open ? "w-[320px]" : "w-0 border-l-0"
      }`}
    >
    <div className="w-[320px] h-screen overflow-hidden bg-white flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06]">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${status?.configured ? "bg-emerald-500" : "bg-gray-300"}`} />
          <span className="text-[11px] font-bold tracking-[0.1em] text-gray-500 uppercase">
            {status?.configured ? "Connected" : "Not connected"}
          </span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close chat" className="text-gray-400 hover:text-[#1a1a1a] text-lg leading-none">
          ×
        </button>
      </div>

      <div className="flex-1 px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-[13.5px] text-gray-400">Ask anything — this isn&apos;t tied to your inbox.</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
              m.role === "user" ? "ml-auto bg-[#4f46e5] text-white" : "bg-gray-100 text-[#1a1a1a]"
            }`}
          >
            {m.text}
          </div>
        ))}
        {error && <p className="text-[13.5px] text-red-600">{error}</p>}
      </div>

      <div className="border-t border-black/[0.06] p-3.5 space-y-2.5">
        <form onSubmit={send} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything…"
            className="flex-1 min-w-0 rounded-xl bg-black/[0.03] border border-black/[0.06] px-3 py-2 text-[13.5px] placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#4f46e5]/20"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="shrink-0 px-3.5 rounded-xl bg-[#4f46e5] text-white text-[13.5px] font-medium disabled:opacity-50"
          >
            {sending ? "…" : "Send"}
          </button>
        </form>
        <ProviderSelect status={status} onSaved={setStatus} />
      </div>
    </div>
    </div>
  );
}

// Same provider+key form as /settings, in miniature — lets you configure
// or switch providers without leaving the chat panel.
function ProviderSelect({ status, onSaved }: { status: AiStatus | null; onSaved: (s: AiStatus) => void }) {
  const [provider, setProvider] = useState<"anthropic" | "openai">(status?.provider ?? "anthropic");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status?.provider) setProvider(status.provider);
  }, [status?.provider]);

  async function save() {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/settings/ai-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, api_key: apiKey }),
      });
      onSaved({ configured: true, provider });
      setApiKey("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as "anthropic" | "openai")}
          className="shrink-0 rounded-lg bg-black/[0.03] border border-black/[0.06] pl-2 pr-1 py-1.5 text-[11px] text-gray-600"
        >
          <option value="anthropic">Anthropic</option>
          <option value="openai">OpenAI</option>
        </select>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={status?.configured ? "New API key…" : "API key…"}
          className="flex-1 min-w-0 rounded-lg bg-black/[0.03] border border-black/[0.06] px-2 py-1.5 text-[11px] placeholder:text-gray-400"
        />
      </div>
      <button
        type="button"
        onClick={save}
        disabled={saving || !apiKey.trim()}
        className="w-full rounded-lg bg-gray-900 text-white text-[11px] font-medium py-1.5 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

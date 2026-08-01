"use client";

import {
  AiMail01Icon,
  ArrowDown01Icon,
  Search01Icon,
  Cancel01Icon,
  Add01Icon,
  FolderEditIcon,
  DeleteThrowIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { Overlay } from "./CommandPalette";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const MAX_ATTACHMENT_BYTES = 20_000;
const HISTORY_STORAGE_KEY = "volt.chatSessions";

type ChatMessage = { role: "user" | "assistant"; text: string; at: number };
type ChatSession = { id: string; messages: ChatMessage[]; updatedAt: number };
type ProviderId = "anthropic" | "openai" | "google" | "groq" | "openrouter" | "kimi";
type AiStatus = { configured: boolean; provider?: ProviderId };
type Attachment = { name: string; content: string };

// ponytail: localStorage only, this device/browser only — not synced
// anywhere, not tied to a backend table. Move server-side if history needs
// to survive a browser wipe or show up on another device.
function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSession(id: string, messages: ChatMessage[]) {
  const sessions = loadSessions().filter((s) => s.id !== id);
  sessions.unshift({ id, messages, updatedAt: Date.now() });
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(sessions.slice(0, 50)));
}

function deleteSession(id: string) {
  const sessions = loadSessions().filter((s) => s.id !== id);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(sessions));
  return sessions;
}

// Today: time ("10:42 AM"). Older: short weekday ("Mon").
function formatWhen(at: number): string {
  const d = new Date(at);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString([], { weekday: "short" });
}

function GmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 34.5 26.9 35.5 24 35.5c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.8l6.6 5.6C39.9 37.5 44 31.5 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

// Provider marks — simple monochrome glyphs (currentColor), not brand
// colors, per the "gray, not candy-colored circles" design call.
const PROVIDER_ICONS: Record<ProviderId, ReactNode> = {
  openai: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="5.5" r="1.6" />
      <circle cx="12" cy="18.5" r="1.6" />
      <circle cx="6.4" cy="8.75" r="1.6" />
      <circle cx="17.6" cy="8.75" r="1.6" />
      <circle cx="6.4" cy="15.25" r="1.6" />
      <circle cx="17.6" cy="15.25" r="1.6" />
    </svg>
  ),
  anthropic: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M12 3v6M12 15v6M6.3 6.3l4.2 4.2M17.7 17.7l-4.2-4.2M3 12h6M15 12h6M6.3 17.7l4.2-4.2M17.7 6.3l-4.2 4.2" />
    </svg>
  ),
  google: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2c.6 3.9 2.4 5.9 6 6.5-3.6.6-5.4 2.6-6 6.5-.6-3.9-2.4-5.9-6-6.5 3.6-.6 5.4-2.6 6-6.5z" />
      <path d="M19 15c.3 1.9 1.1 2.8 3 3-1.9.3-2.7 1.1-3 3-.3-1.9-1.1-2.8-3-3 1.9-.2 2.7-1.1 3-3z" />
    </svg>
  ),
  groq: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  ),
  openrouter: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M7 12h4m0 0 6-4.5M11 12l6 4.5" />
    </svg>
  ),
  kimi: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 3.5a8.5 8.5 0 1 0 0 17c-1.6-1.5-2.5-4-2.5-8.5s.9-7 2.5-8.5z" />
    </svg>
  ),
};

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
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, error]);

  useEffect(() => {
    if (!open) return;
    fetch(`${API_URL}/api/settings/ai-key`)
      .then((res) => res.json())
      .then(setStatus)
      .catch(() => setStatus(null));
    fetch(`${API_URL}/api/gmail/status`)
      .then((res) => res.json())
      .then((data) => setGmailConnected(Boolean(data.connected)))
      .catch(() => setGmailConnected(false));
  }, [open]);

  // ponytail: text files only, read straight into the prompt as context —
  // no image/PDF understanding, that needs per-provider multimodal wiring.
  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAttachError(null);
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachError(`${file.name} is too large — keep attachments under ${MAX_ATTACHMENT_BYTES / 1000}KB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAttachment({ name: file.name, content: String(reader.result ?? "") });
    reader.onerror = () => setAttachError(`Couldn't read ${file.name}.`);
    reader.readAsText(file);
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    const id = sessionId ?? crypto.randomUUID();
    if (!sessionId) setSessionId(id);
    const messageForAI = attachment ? `Attached file "${attachment.name}":\n\n${attachment.content}\n\n${text}` : text;
    const withUser = [
      ...messages,
      { role: "user" as const, text: attachment ? `📎 ${attachment.name}\n${text}` : text, at: Date.now() },
    ];
    setMessages(withUser);
    saveSession(id, withUser);
    setInput("");
    setAttachment(null);
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageForAI }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const messages: Record<string, string> = {
          ai_not_configured: "No AI key configured — pick a provider below.",
          ai_invalid_key: "Your AI key was rejected by the provider — check it in AI settings.",
          ai_rate_limited: "Your AI provider is rate-limiting requests — try again in a moment.",
        };
        setError(messages[body.error] ?? "Chat failed. Try again.");
        return;
      }
      const data = await res.json();
      const withReply = [...withUser, { role: "assistant" as const, text: data.reply, at: Date.now() }];
      setMessages(withReply);
      saveSession(id, withReply);
    } catch {
      setError("Chat failed. Try again.");
    } finally {
      setSending(false);
    }
  }

  function openHistory() {
    setSessions(loadSessions());
    setHistoryOpen(true);
  }

  function selectSession(s: ChatSession) {
    setMessages(s.messages);
    setSessionId(s.id);
    setHistoryOpen(false);
  }

  function newChat() {
    setMessages([]);
    setSessionId(null);
    setInput("");
    setAttachment(null);
    setAttachError(null);
    setError(null);
    setHistoryOpen(false);
  }

  function removeSession(id: string, e: MouseEvent) {
    e.stopPropagation();
    setSessions(deleteSession(id));
    if (id === sessionId) {
      setMessages([]);
      setSessionId(null);
    }
  }

  const empty = messages.length === 0;

  return (
    <div
      className="shrink-0 overflow-hidden border-l border-black/[0.06] transition-[width] duration-200 flex"
      style={{ width: open ? (historyOpen ? 380 + 260 : 380) : 0 }}
    >
      {historyOpen && (
        <ChatHistoryPanel
          sessions={sessions}
          activeId={sessionId}
          onSelect={selectSession}
          onDelete={removeSession}
          onClose={() => setHistoryOpen(false)}
        />
      )}
      <div className="w-[380px] shrink-0 h-screen overflow-hidden bg-white flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06]">
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${status?.configured ? "bg-emerald-500" : "bg-gray-300"}`} />
            <span className="text-[11px] font-semibold tracking-tight text-gray-500 uppercase">
              {status?.configured ? "Connected" : "Not connected"}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close chat" className="text-gray-400 hover:text-[#1a1a1a] text-lg leading-none">
            ×
          </button>
        </div>

        <div className={`flex-1 min-h-0 overflow-y-auto px-5 pt-4 pb-2 flex flex-col ${empty ? "justify-end" : "justify-start"}`}>
          {empty ? (
            <div className="mb-1">
              <p className="text-[19px] font-semibold tracking-tight text-[#1a1a1a] mb-3">Volt, how can I help?</p>
              <button
                type="button"
                onClick={() => setInput("What can you help me with?")}
                className="inline-flex items-center gap-2 rounded-xl border border-black/[0.08] bg-black/[0.02] hover:bg-black/[0.04] px-3.5 py-2.5 text-[13.5px] font-medium text-[#1a1a1a] transition-colors"
              >
                <span className="h-5 w-5 shrink-0 rounded-md bg-[#4f46e5]/10 flex items-center justify-center text-[#4f46e5] text-[11px] font-bold">
                  <HugeiconsIcon icon={AiMail01Icon} />
                </span>

                I can summarize this email for you.
              </button>
              <p className="text-[12px] text-gray-400 mt-3">
                Sees your recent inbox (subjects, senders, snippets) — open a thread and use its AI Summarize for full email content.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`max-w-[88%] ${m.role === "user" ? "ml-auto" : ""}`}>
                  <div
                    className={`rounded-xl px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap break-words ${m.role === "user" ? "bg-[#4f46e5] text-white" : "bg-gray-100 text-[#1a1a1a]"
                      }`}
                  >
                    {m.text}
                  </div>
                  <div className={`text-[11px] text-gray-400 mt-1 ${m.role === "user" ? "text-right" : ""}`}>
                    {formatWhen(m.at)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && <p className="text-[13.5px] text-red-600 mt-2">{error}</p>}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-black/[0.06] p-3.5 space-y-2.5">
          {attachError && <p className="text-[12px] text-red-600">{attachError}</p>}
          <form onSubmit={send} className="rounded-2xl border border-black/[0.08] bg-black/[0.015] p-2.5 focus-within:ring-2 focus-within:ring-[#4f46e5]/20 transition-shadow">
            {attachment && (
              <div className="flex items-center gap-2.5 mb-2 px-2 py-1.5 rounded-xl border border-black/[0.06] bg-white">
                <span className="h-7 w-7 shrink-0 rounded-md bg-black/[0.04] flex items-center justify-center text-[13px]">📄</span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[#1a1a1a]">{attachment.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  aria-label="Remove attachment"
                  className="shrink-0 text-gray-300 hover:text-gray-600 text-base leading-none"
                >
                  ×
                </button>
              </div>
            )}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(e);
                }
              }}
              placeholder="Ask anything…"
              rows={2}
              className="w-full resize-none bg-transparent px-2 py-1 text-[13.5px] placeholder:text-gray-400 outline-none"
            />
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-3 pl-1">
                <input ref={fileInputRef} type="file" onChange={handleFile} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach a file"
                  className="text-gray-400 hover:text-[#1a1a1a] text-lg leading-none transition-colors"
                >
                  +
                </button>
                <span className="flex items-center gap-1.5 text-[12px] text-gray-500">
                  <GmailIcon className="h-4 w-4" />
                  {gmailConnected === null ? "…" : gmailConnected ? "Connected" : "Not connected"}
                </span>
              </div>
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Send"
                className="shrink-0 h-8 w-8 rounded-full bg-[#4f46e5] text-white flex items-center justify-center disabled:opacity-40 transition-opacity"
              >
                {sending ? (
                  <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ) : (
                  "↑"
                )}
              </button>
            </div>
          </form>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ProviderTrigger status={status} onSaved={setStatus} />
              <button
                type="button"
                onClick={newChat}
                disabled={empty}
                aria-label="New chat"
                className="shrink-0 flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-[#1a1a1a] disabled:opacity-40 transition-colors"
              >
                <HugeiconsIcon icon={Add01Icon} size={16} />
                New chat
              </button>
            </div>
            <button
              type="button"
              onClick={() => (historyOpen ? setHistoryOpen(false) : openHistory())}
              aria-label="Chat history"
              className={`shrink-0 flex items-center gap-1.5 text-[13px] font-medium transition-colors ${
                historyOpen ? "text-[#4f46e5]" : "text-gray-500 hover:text-[#1a1a1a]"
              }`}
            >
              <HugeiconsIcon icon={FolderEditIcon} size={16} />
              History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const PROVIDERS: Record<ProviderId, {
  name: string;
  tagline: string;
  description: string;
  keyLabel: string;
  keyURL: string;
}> = {
  groq: {
    name: "Groq",
    tagline: "Free tier, fastest inference around",
    description:
      "Groq runs open models (Llama 3.3) on custom hardware — a genuinely free tier and very low latency. Powers summarize, draft reply, search, and this chat.",
    keyLabel: "Groq API key",
    keyURL: "https://console.groq.com/keys",
  },
  google: {
    name: "Google",
    tagline: "Gemini models, generous free quota",
    description:
      "Google's Gemini models have a genuinely free tier for everyday use. Powers summarize, draft reply, search, and this chat.",
    keyLabel: "Google AI API key",
    keyURL: "https://aistudio.google.com/apikey",
  },
  kimi: {
    name: "Kimi",
    tagline: "Moonshot AI's long-context models",
    description:
      "Kimi (Moonshot AI) models handle very long context well. Powers summarize, draft reply, search, and this chat.",
    keyLabel: "Kimi API key",
    keyURL: "https://platform.moonshot.ai/console/api-keys",
  },
  anthropic: {
    name: "Anthropic",
    tagline: "Direct access to Claude models",
    description:
      "Anthropic's Claude models power summarize, draft reply, search, and this chat. Volt never absorbs inference cost — your key, your usage, your bill.",
    keyLabel: "Anthropic API key",
    keyURL: "https://console.anthropic.com/settings/keys",
  },
  openai: {
    name: "OpenAI",
    tagline: "GPT models for fast, general AI tasks",
    description:
      "OpenAI's GPT models power summarize, draft reply, search, and this chat. Volt never absorbs inference cost — your key, your usage, your bill.",
    keyLabel: "OpenAI API key",
    keyURL: "https://platform.openai.com/api-keys",
  },
  openrouter: {
    name: "OpenRouter",
    tagline: "One key, many models",
    description:
      "OpenRouter is a gateway to many models (Claude, GPT, Llama, and more) behind a single key — some free, some paid per model. Powers summarize, draft reply, search, and this chat.",
    keyLabel: "OpenRouter API key",
    keyURL: "https://openrouter.ai/keys",
  },
};

// Left-of-chat history list — same height as the chat panel, own fixed
// width so it doesn't reflow when it opens.
function ChatHistoryPanel({
  sessions,
  activeId,
  onSelect,
  onDelete,
  onClose,
}: {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (s: ChatSession) => void;
  onDelete: (id: string, e: MouseEvent) => void;
  onClose: () => void;
}) {
  return (
    <div className="w-[260px] shrink-0 h-screen overflow-y-auto bg-white border-r border-black/[0.06] p-3">
      <div className="flex items-center justify-between px-2 pt-1 pb-3">
        <p className="text-[11px] font-semibold tracking-tight text-gray-400 uppercase">History</p>
        <button type="button" onClick={onClose} aria-label="Close history" className="text-gray-400 hover:text-[#1a1a1a] text-lg leading-none">
          ×
        </button>
      </div>
      {sessions.length === 0 && (
        <p className="text-[13px] text-gray-400 px-2 py-4">No past conversations yet.</p>
      )}
      <div className="space-y-1">
        {sessions.map((s) => {
          const preview = s.messages.find((m) => m.role === "user")?.text ?? "New chat";
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s)}
              className={`group w-full flex items-center gap-2 text-left px-2.5 py-2.5 rounded-xl transition-colors ${
                s.id === activeId ? "bg-white shadow-sm" : "hover:bg-white/70"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-[#1a1a1a]">{preview}</div>
                <div className="text-[11px] text-gray-400">{formatWhen(s.updatedAt)}</div>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => onDelete(s.id, e)}
                aria-label="Delete conversation"
                className="shrink-0 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <HugeiconsIcon icon={DeleteThrowIcon} size={16} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProviderBadge({ id, size = 28 }: { id: ProviderId; size?: number }) {
  return (
    <span
      className="shrink-0 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600"
      style={{ height: size, width: size, padding: size * 0.22 }}
    >
      {PROVIDER_ICONS[id]}
    </span>
  );
}

// Trigger — single line in the panel; opens the full connect-provider flow
// instead of an inline dropdown+key form.
function ProviderTrigger({ status, onSaved }: { status: AiStatus | null; onSaved: (s: AiStatus) => void }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="shrink-0 flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-[#1a1a1a] transition-colors"
      >
        {status?.configured && status.provider && <ProviderBadge id={status.provider} size={20} />}
        {status?.configured && status.provider ? PROVIDERS[status.provider].name : "Select provider"}
        <HugeiconsIcon icon={ArrowDown01Icon} size={16} />
      </button>
      {modalOpen && (
        <ProviderModal
          status={status}
          onSaved={(s) => {
            onSaved(s);
            setModalOpen(false);
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

function ProviderModal({
  status,
  onSaved,
  onClose,
}: {
  status: AiStatus | null;
  onSaved: (s: AiStatus) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<ProviderId | null>(null);
  const [query, setQuery] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const providerList = (Object.keys(PROVIDERS) as ProviderId[]).filter((id) =>
    (PROVIDERS[id].name + PROVIDERS[id].tagline).toLowerCase().includes(query.toLowerCase())
  );

  async function save() {
    if (!selected || !apiKey.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${API_URL}/api/settings/ai-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selected, api_key: apiKey }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSaveError(
          body.error === "ai_invalid_key"
            ? "That key was rejected by the provider — double-check it."
            : body.error === "ai_rate_limited"
              ? "The provider is rate-limiting right now — try again in a moment."
              : "Couldn't verify that key. Try again."
        );
        return;
      }
      onSaved({ configured: true, provider: selected });
    } finally {
      setSaving(false);
    }
  }

  if (selected) {
    const p = PROVIDERS[selected];
    return (
      <Overlay onClose={onClose} solid>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <ProviderBadge id={selected} size={36} />
              <h2 className="text-[18px] font-semibold tracking-tight text-[#1a1a1a]">Connect {p.name}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-gray-400 hover:text-[#1a1a1a] text-lg leading-none transition-colors"
            >
              ×
            </button>
          </div>
          <p className="text-[13.5px] leading-relaxed text-gray-500 mb-5">{p.description}</p>
          <a
            href={p.keyURL}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-[13px] font-medium text-[#4f46e5] hover:text-[#3c34c9] underline-none mb-5"
          >
            Get your API key
          </a>
          <label className="block text-[12px] font-medium text-gray-500 mb-1.5">{p.keyLabel}</label>
          <input
            autoFocus
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={status?.configured && status.provider === selected ? "New API key…" : "API key…"}
            className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-3.5 py-2.5 text-[14px] placeholder:text-gray-400 outline-none focus:ring focus:ring-[#000]/60 mb-5"
          />
          <button
            type="button"
            onClick={save}
            disabled={saving || !apiKey.trim()}
            className="w-full rounded-xl bg-[#111214] hover:bg-black text-white text-[14px] font-semibold py-3 shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_20px_rgba(0,0,0,0.18)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.35),0_10px_28px_rgba(0,0,0,0.28)] hover:-translate-y-px active:translate-y-0 disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 transition-all"
          >
            {saving ? "Verifying key…" : "Continue"}
          </button>
          {saveError && <p className="text-[13px] text-red-600 mt-3">{saveError}</p>}
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose} solid>
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h2 className="text-[18px] font-medium tracking-tight text-[#1a1a1a]">Connect provider</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-[#1a1a1a] transition-colors">
          <HugeiconsIcon icon={Cancel01Icon} size={20} />
        </button>
      </div>
      <div className="px-6 pb-3">
        <div className="relative">
          <HugeiconsIcon icon={Search01Icon} size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search providers"
            className="w-full rounded-xl bg-black/[0.04] pl-10 pr-3.5 py-2.5 text-[14px] placeholder:text-gray-400 outline-none"
          />
        </div>
      </div>
      <div className="px-3 pb-4">
        {providerList.length === 0 && (
          <p className="px-3 py-6 text-center text-[13.5px] text-gray-400">No matching providers.</p>
        )}
        {providerList.map((id) => {
          const p = PROVIDERS[id];
          const isCurrent = status?.configured && status.provider === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className="group w-full flex items-center gap-3 text-left px-3 py-3 rounded-xl hover:bg-black/[0.035] transition-colors"
            >
              <ProviderBadge id={id} size={22} />
              <span className="text-[14.5px] font-semibold text-[#1a1a1a] shrink-0">{p.name}</span>
              <span className="text-[13.5px] text-gray-400 truncate">{p.tagline}</span>
              <span className="ml-auto shrink-0 flex items-center gap-1.5">
                {isCurrent && (
                  <span className="text-[10.5px] font-semibold uppercase tracking-wide text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                    Connected
                  </span>
                )}
                <HugeiconsIcon
                  icon={Add01Icon}
                  size={18}
                  className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </span>
            </button>
          );
        })}
      </div>
    </Overlay>
  );
}

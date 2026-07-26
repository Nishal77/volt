"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCommandPalette, Overlay, KeyHint, type Command } from "../components/CommandPalette";
import { AiChat, AiChatToggle } from "../components/AiChat";
import { useReplyLater, SelectionToolbar, ReplyLaterStack } from "../components/ReplyLater";
import { isTypingTarget } from "../lib/snippets";

type Message = {
  thread_id: string;
  subject: string;
  from: string;
  snippet: string;
  unread: boolean;
  date: string;
  message_count: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const NEW_FOR_YOU_LIMIT = 7;

const AVATAR_FG = "#111214";
const AVATAR_COLORS = [
  { bg: "#b8a6ff", fg: AVATAR_FG },
  { bg: "#7fd4a3", fg: AVATAR_FG },
  { bg: "#ffa8bd", fg: AVATAR_FG },
  { bg: "#7fc4e0", fg: AVATAR_FG },
  { bg: "#ffc373", fg: AVATAR_FG },
  { bg: "#8de0bb", fg: AVATAR_FG },
];

function senderName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*<?/);
  const name = match?.[1]?.trim();
  return name && name.length > 0 ? name : from.replace(/<.*>/, "").trim();
}

function initials(from: string): string {
  const name = senderName(from);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === "#") return String.fromCharCode(Number(code.slice(1)));
    return HTML_ENTITIES[code.toLowerCase()] ?? match;
  });
}

function emailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).trim().toLowerCase();
}

// Gravatar accepts a SHA-256 hash of the email (their newer, non-MD5
// option) — native Web Crypto covers this, no hashing library needed.
// d=404 makes it 404 instead of a default silhouette when no photo is
// registered, so <img onError> can cleanly fall back to initials.
const gravatarCache = new Map<string, Promise<string>>();

async function gravatarURL(email: string): Promise<string> {
  if (!gravatarCache.has(email)) {
    const promise = (async () => {
      const bytes = new TextEncoder().encode(email);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
      return `https://www.gravatar.com/avatar/${hex}?d=404&s=80`;
    })();
    gravatarCache.set(email, promise);
  }
  return gravatarCache.get(email)!;
}

function avatarColor(from: string) {
  let hash = 0;
  for (let i = 0; i < from.length; i++) hash = (hash * 31 + from.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// BIMI is a real per-domain sender logo (a DNS TXT record verified brands
// publish, e.g. Adzuna) — separate from Gravatar's per-person photo, and
// resolved server-side since browsers can't do DNS lookups.
const bimiCache = new Map<string, Promise<string | null>>();

async function bimiLogoURL(domain: string): Promise<string | null> {
  if (!bimiCache.has(domain)) {
    const promise = fetch(`${API_URL}/api/avatar?domain=${encodeURIComponent(domain)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.url ?? null)
      .catch(() => null);
    bimiCache.set(domain, promise);
  }
  return bimiCache.get(domain)!;
}

// Tries the sender's brand logo (BIMI) first, then their personal photo
// (Gravatar) — first one that actually exists wins; <img onError> in Row
// advances through whatever came back.
async function avatarCandidates(from: string): Promise<string[]> {
  const email = emailAddress(from);
  const domain = email.split("@")[1] ?? "";
  const [bimi, gravatar] = await Promise.all([bimiLogoURL(domain), gravatarURL(email)]);
  return [bimi, gravatar].filter((u): u is string => Boolean(u));
}

const CONNECT_ERROR_MESSAGES: Record<string, string> = {
  reconnect_required: "Your Gmail connection expired — reconnect to continue.",
  oauth_denied: "Gmail connection was cancelled.",
  oauth_failed: "Something went wrong connecting Gmail. Try again.",
  save_failed: "Couldn't save your connection. Try again.",
};

function Row({
  m,
  isSelected,
  isChecked,
  onHover,
  onToggleCheck,
}: {
  m: Message;
  isSelected: boolean;
  isChecked: boolean;
  onHover: () => void;
  onToggleCheck: () => void;
}) {
  const color = avatarColor(m.from);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setCandidates([]);
    setCandidateIndex(0);
    avatarCandidates(m.from).then((urls) => {
      if (!cancelled) setCandidates(urls);
    });
    return () => {
      cancelled = true;
    };
  }, [m.from]);

  const avatarSrc = candidates[candidateIndex];
  const showPhoto = Boolean(avatarSrc);

  return (
    <Link
      href={`/inbox/${m.thread_id}`}
      onMouseEnter={onHover}
      className={`group flex items-center gap-4 -mx-3 px-3 py-4 rounded-lg transition-colors duration-150 ${
        isSelected ? "bg-gray-100" : "hover:bg-gray-100"
      }`}
    >
      {m.unread ? (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#f5a623] shadow-[0_0_0_3px_rgba(245,166,35,0.15)]" />
      ) : (
        <span className="h-1.5 w-1.5 shrink-0" />
      )}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleCheck();
        }}
        aria-label={isChecked ? "Deselect" : "Select"}
        className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-[13px] font-semibold ring-1 ring-black/[0.04] relative overflow-hidden"
        style={showPhoto ? undefined : { backgroundColor: color.bg, color: color.fg }}
      >
        {showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarSrc}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover ${isChecked ? "opacity-0" : "opacity-100 group-hover:opacity-0 transition-opacity"}`}
            onError={() => setCandidateIndex((i) => i + 1)}
          />
        ) : (
          <span className={isChecked ? "opacity-0" : "opacity-100 group-hover:opacity-0 transition-opacity"}>
            {initials(m.from)}
          </span>
        )}
        <span
          className={`absolute inset-0 rounded-full flex items-center justify-center bg-[#4f46e5] text-white transition-opacity ${
            isChecked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {isChecked ? "✓" : ""}
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className={`truncate text-[17px] tracking-tight font-semibold ${m.unread ? "text-[#111214]" : "text-[#5a5d64]"}`}>
            {decodeEntities(m.subject) || "(no subject)"}
          </span>
          {m.message_count > 1 && (
            <span className="text-[12.5px] font-medium text-gray-400 shrink-0">({m.message_count})</span>
          )}
        </div>
        <div className="truncate text-[13.5px] text-gray-500 mt-0.5">
          <span className={m.unread ? "text-gray-700" : ""}>{senderName(m.from)}</span>
          <span className="text-gray-300 mx-1">—</span>
          {decodeEntities(m.snippet)}
        </div>
      </div>
      <span className="text-[13px] text-gray-400 shrink-0 pl-4 tabular-nums">{m.date}</span>
    </Link>
  );
}

function ConnectGmail({ reason }: { reason?: string }) {
  const message = reason ? CONNECT_ERROR_MESSAGES[reason] : undefined;
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-white text-[#1a1a1a] px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(50%_100%_at_50%_0%,rgba(79,70,229,0.07),transparent)]" />

      <div className="relative flex flex-col items-center text-center max-w-sm w-full">
        <span className="text-2xl font-extrabold tracking-[-0.02em] mb-2">Volt</span>
        <p className="text-sm text-gray-500 mb-10">
          Your inbox, your server, your AI key.
        </p>

        {message && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2 mb-6">
            {message}
          </p>
        )}

        <a
          href={`${API_URL}/auth/google`}
          aria-label="Connect Gmail"
          title="Connect Gmail"
          className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-white ring-1 ring-black/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 active:translate-y-0"
        >
          <svg width="28" height="28" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 34.5 26.9 35.5 24 35.5c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.6 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.8l6.6 5.6C39.9 37.5 44 31.5 44 24c0-1.3-.1-2.7-.4-3.5z"/>
          </svg>
        </a>
        <p className="text-xs text-gray-400 mt-4">Connect Gmail to continue</p>
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white text-[#1a1a1a]">Loading…</div>}>
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
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAllUnread, setShowAllUnread] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const replyLater = useReplyLater();

  function toggleChecked(threadId: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
  }

  function moveCheckedToReplyLater() {
    if (!messages) return;
    const entries = messages
      .filter((m) => checkedIds.has(m.thread_id))
      .map((m) => ({ thread_id: m.thread_id, subject: m.subject, from: m.from }));
    replyLater.add(entries);
    setCheckedIds(new Set());
  }

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

  useEffect(() => {
    if (error === "vault_locked") router.push("/unlock");
  }, [error, router]);

  function archive(threadId: string) {
    fetch(`${API_URL}/api/inbox/${threadId}/archive`, { method: "POST" });
    setMessages((prev) => (prev ? prev.filter((m) => m.thread_id !== threadId) : prev));
  }

  function open(threadId: string) {
    router.push(`/inbox/${threadId}`);
  }

  async function runSearch(e?: FormEvent) {
    e?.preventDefault();
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSearchError(
          body.error === "ai_not_configured" ? "No AI key configured — add one in AI settings." : "Search failed. Try again."
        );
        return;
      }
      const data = await res.json();
      setSearchResults(data.messages);
      setSelected(0);
    } finally {
      setSearching(false);
    }
  }

  const visibleMessages = searchResults ?? messages;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (!visibleMessages || visibleMessages.length === 0) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((i) => Math.min(i + 1, visibleMessages.length - 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "o") {
        open(visibleMessages[selected].thread_id);
      } else if (e.key === "x") {
        archive(visibleMessages[selected].thread_id);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleMessages, selected]);

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
      <div className="min-h-screen flex items-center justify-center bg-white text-[#1a1a1a]">
        {palette}
        Gmail is rate-limiting requests right now — try again in a minute.
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-[#1a1a1a]">
        {palette}
        Failed to load inbox: {error}
      </div>
    );
  }
  if (!messages) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-[#1a1a1a]">{palette}Loading…</div>;
  }

  const visible = searchResults ?? messages;
  const allUnread = visible.filter((m) => m.unread);
  const readItems = visible.filter((m) => !m.unread);
  const unreadItems = showAllUnread ? allUnread : allUnread.slice(0, NEW_FOR_YOU_LIMIT);
  const hiddenUnreadCount = allUnread.length - unreadItems.length;
  const ordered = [...unreadItems, ...readItems];

  function rowIndex(m: Message) {
    return ordered.indexOf(m);
  }

  return (
    <div className="h-screen overflow-hidden bg-white text-[#1a1a1a] flex">
      {palette}

      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(79,70,229,0.06),transparent)]" />

      <div className="relative flex-1 min-w-0 h-screen overflow-y-auto">
      <div className="max-w-4xl mx-auto px-7">
        <h1 className="text-center text-[56px] leading-none font-extrabold tracking-[-0.03em] mt-10 mb-10 bg-gradient-to-b from-[#161821] to-[#3a3d4d] bg-clip-text text-transparent">
          Inbox
        </h1>

        <div className="flex items-center gap-3 mb-1">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex-1 flex items-center gap-2 rounded-xl bg-black/[0.03] border border-black/[0.06] px-3.5 py-2.5 text-sm text-left text-gray-400 hover:bg-black/[0.045] transition-colors"
          >
            <span className="flex-1 truncate">{searchResults ? decodeEntities(query) : "Search inbox · ⌘K"}</span>
            <kbd className="px-1.5 py-0.5 rounded-md bg-black/[0.05] border border-black/[0.06] text-[11px] font-medium text-gray-500">/</kbd>
          </button>
          {searchResults && (
            <button
              type="button"
              onClick={() => { setSearchResults(null); setQuery(""); }}
              className="px-3.5 py-2 rounded-xl bg-black/[0.04] hover:bg-black/[0.07] text-sm font-medium transition-colors"
            >
              Clear
            </button>
          )}
          <Link href="/settings" className="text-sm text-gray-400 hover:text-[#1a1a1a] whitespace-nowrap transition-colors">
            AI settings
          </Link>
          <AiChatToggle open={chatOpen} onToggle={() => setChatOpen((v) => !v)} />
        </div>

        <div className="mt-8 pb-20">
          <SelectionToolbar
            count={checkedIds.size}
            onReplyLater={moveCheckedToReplyLater}
            onClear={() => setCheckedIds(new Set())}
          />
          {ordered.length === 0 && (
            <div className="px-6 py-24 text-center text-gray-400 text-[15px]">
              {searchResults ? "No matches." : "Inbox zero."}
            </div>
          )}

          {unreadItems.length > 0 && (
            <div>
              <div className="flex items-center gap-3 px-1 pb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4f46e5]" />
                <span className="text-[12px] font-bold tracking-tight text-gray-600">NEW FOR YOU</span>
                <span className="h-px flex-1 bg-gradient-to-r from-black/[0.08] to-transparent" />
                <button type="button" className="text-[13px] font-medium text-[#4f46e5] hover:text-[#3c34c9] transition-colors">
                  Read Together
                </button>
              </div>
              <div className="divide-y divide-black/[0.045]">
                {unreadItems.map((m) => (
                  <Row
                    key={m.thread_id}
                    m={m}
                    isSelected={rowIndex(m) === selected}
                    isChecked={checkedIds.has(m.thread_id)}
                    onHover={() => setSelected(rowIndex(m))}
                    onToggleCheck={() => toggleChecked(m.thread_id)}
                  />
                ))}
              </div>
              {hiddenUnreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllUnread(true)}
                  className="w-full text-center text-[13px] font-medium text-gray-400 hover:text-[#4f46e5] py-3 transition-colors"
                >
                  {hiddenUnreadCount} more
                </button>
              )}
            </div>
          )}

          {readItems.length > 0 && (
            <div className={unreadItems.length > 0 ? "mt-10" : ""}>
              <div className="flex items-center gap-3 px-1 pb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                <span className="text-[12px] font-bold tracking-tight text-gray-600">PREVIOUSLY SEEN</span>
                <span className="h-px flex-1 bg-gradient-to-r from-black/[0.08] to-transparent" />
              </div>
              <div className="divide-y divide-black/[0.045]">
                {readItems.map((m) => (
                  <Row
                    key={m.thread_id}
                    m={m}
                    isSelected={rowIndex(m) === selected}
                    isChecked={checkedIds.has(m.thread_id)}
                    onHover={() => setSelected(rowIndex(m))}
                    onToggleCheck={() => toggleChecked(m.thread_id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {searchOpen && (
        <Overlay
          onClose={() => setSearchOpen(false)}
          footer={
            <>
              <KeyHint keys="↵" label="Search with AI" />
              <KeyHint keys="esc" label="Close" />
            </>
          }
        >
          <form onSubmit={runSearch}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchOpen(false);
              }}
              placeholder="Search inbox…"
              className="w-full px-5 py-4 bg-transparent text-[15px] text-[#1a1a1a] placeholder:text-gray-400 outline-none"
            />
          </form>
          <div className="max-h-96 overflow-y-auto px-2 pb-2">
            {searching && <div className="px-3 py-6 text-center text-sm text-gray-400">Searching…</div>}
            {searchError && <div className="px-3 py-3 text-sm text-red-600">{searchError}</div>}
            {!searching && !searchError && searchResults && searchResults.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-gray-400">No matches.</div>
            )}
            {!searching &&
              searchResults?.map((m) => {
                const color = avatarColor(m.from);
                return (
                  <button
                    key={m.thread_id}
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      open(m.thread_id);
                    }}
                    className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl hover:bg-black/[0.04] transition-colors"
                  >
                    <span
                      className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[12px] font-semibold"
                      style={{ backgroundColor: color.bg, color: color.fg }}
                    >
                      {initials(m.from)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium text-[#1a1a1a]">
                        {decodeEntities(m.subject) || "(no subject)"}
                      </div>
                      <div className="truncate text-[12.5px] text-gray-400">{senderName(m.from)}</div>
                    </div>
                  </button>
                );
              })}
            {!searching && !searchError && !searchResults && (
              <div className="px-3 py-6 text-center text-sm text-gray-400">Press Enter to search with AI.</div>
            )}
          </div>
        </Overlay>
      )}

      <AiChat open={chatOpen} onClose={() => setChatOpen(false)} />
      <ReplyLaterStack items={replyLater.items} onRemove={replyLater.remove} />
    </div>
  );
}

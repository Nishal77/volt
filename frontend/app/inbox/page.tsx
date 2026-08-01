"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCommandPalette, type Command } from "../components/CommandPalette";
import { AiChat, AiChatToggle } from "../components/AiChat";
import { useReplyLater, SelectionToolbar, ReplyLaterStack } from "../components/ReplyLater";
import { LoaderScreen } from "../components/Loader";
import { useScheduledSends, ScheduledOutboxToggle, ScheduledOutbox } from "../components/ScheduledOutbox";
import { ShortcutHelp } from "../components/ShortcutHelp";
import { isTypingTarget } from "../lib/snippets";
import { ConnectGmail } from "./ConnectGmail";
import { Row } from "./Row";
import { SearchOverlay } from "./SearchOverlay";
import { decodeEntities } from "./utils";
import type { Message } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const NEW_FOR_YOU_LIMIT = 7;

export default function InboxPage() {
  return (
    <Suspense fallback={<LoaderScreen className="bg-white text-[#1a1a1a]" />}>
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
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAllUnread, setShowAllUnread] = useState(false);
  const [showNewsletters, setShowNewsletters] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [lastArchived, setLastArchived] = useState<Message | null>(null);
  const [outboxOpen, setOutboxOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const replyLater = useReplyLater();
  const scheduledSends = useScheduledSends();

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
    setMessages((prev) => {
      if (!prev) return prev;
      const archived = prev.find((m) => m.thread_id === threadId) ?? null;
      setLastArchived(archived);
      return prev.filter((m) => m.thread_id !== threadId);
    });
  }

  function archiveMany(threadIds: Set<string>) {
    threadIds.forEach((id) => fetch(`${API_URL}/api/inbox/${id}/archive`, { method: "POST" }));
    setMessages((prev) => (prev ? prev.filter((m) => !threadIds.has(m.thread_id)) : prev));
    setLastArchived(null); // bulk undo isn't supported, avoid a misleading single-item undo prompt
    setCheckedIds(new Set());
  }

  function undoArchive() {
    if (!lastArchived) return;
    fetch(`${API_URL}/api/inbox/${lastArchived.thread_id}/unarchive`, { method: "POST" });
    setMessages((prev) => (prev ? [lastArchived, ...prev] : prev));
    setLastArchived(null);
  }

  function markRead(threadId: string) {
    fetch(`${API_URL}/api/inbox/${threadId}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    setMessages((prev) => (prev ? prev.map((m) => (m.thread_id === threadId ? { ...m, unread: false } : m)) : prev));
  }

  function toggleStarred(threadId: string) {
    const next = !messages?.find((m) => m.thread_id === threadId)?.starred;
    fetch(`${API_URL}/api/inbox/${threadId}/star`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starred: next }),
    });
    setMessages((prev) => (prev ? prev.map((m) => (m.thread_id === threadId ? { ...m, starred: next } : m)) : prev));
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
      setSelected(data.messages[0]?.thread_id ?? null);
    } finally {
      setSearching(false);
    }
  }

  const visibleMessages = searchResults ?? messages;

  // Single source of truth for both display order and keyboard nav — every
  // row a "j/k" press or an isSelected check can land on comes from here,
  // keyed by thread_id, not array position. An index would silently point
  // at the wrong row whenever a background inbox refetch reorders the
  // underlying array between a hover and the next keypress.
  const newsletterItems = (visibleMessages ?? []).filter((m) => m.newsletter);
  const primary = (visibleMessages ?? []).filter((m) => !m.newsletter);
  const allUnread = primary.filter((m) => m.unread);
  const followUpItems = primary.filter((m) => !m.unread && m.awaiting_reply);
  const readItems = primary.filter((m) => !m.unread && !m.awaiting_reply);
  const unreadItems = showAllUnread ? allUnread : allUnread.slice(0, NEW_FOR_YOU_LIMIT);
  const hiddenUnreadCount = allUnread.length - unreadItems.length;
  const ordered = [...unreadItems, ...followUpItems, ...readItems, ...(showNewsletters ? newsletterItems : [])];

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (e.key === "z") {
        undoArchive();
        return;
      }
      if (ordered.length === 0) return;
      const idx = ordered.findIndex((m) => m.thread_id === selected);
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelected(ordered[Math.min(idx + 1, ordered.length - 1)].thread_id);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelected(ordered[Math.max(idx - 1, 0)].thread_id);
      } else if (idx === -1) {
        return; // nothing selected yet — only nav keys pick an initial row
      } else if (e.key === "Enter" || e.key === "o") {
        open(ordered[idx].thread_id);
      } else if (e.key === "x") {
        archive(ordered[idx].thread_id);
      } else if (e.key === "s") {
        toggleStarred(ordered[idx].thread_id);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordered, selected, lastArchived]);

  useEffect(() => {
    if (!lastArchived) return;
    const t = setTimeout(() => setLastArchived(null), 6000);
    return () => clearTimeout(t);
  }, [lastArchived]);

  const selectedMessage = messages?.find((m) => m.thread_id === selected) ?? null;

  const commands: Command[] = [
    { id: "reload", label: "Reload inbox", run: load },
    { id: "search", label: "Search inbox with AI", run: () => setSearchOpen(true) },
    { id: "chat", label: "Open AI chat", run: () => setChatOpen(true) },
    { id: "settings", label: "AI settings", run: () => router.push("/settings") },
    { id: "prompts", label: "View AI prompts", run: () => router.push("/prompts") },
    { id: "snippets", label: "Manage snippets", run: () => router.push("/snippets") },
    { id: "shortcuts", label: "Show keyboard shortcuts", run: () => setHelpOpen(true) },
    ...(selectedMessage
      ? [
          { id: "open", label: "Open selected thread", run: () => open(selectedMessage.thread_id) },
          { id: "archive", label: "Archive selected thread", run: () => archive(selectedMessage.thread_id) },
          { id: "mark-read", label: "Mark selected as read", run: () => markRead(selectedMessage.thread_id) },
          {
            id: "reply-later",
            label: "Reply later — selected thread",
            run: () => {
              replyLater.add([{ thread_id: selectedMessage.thread_id, subject: selectedMessage.subject, from: selectedMessage.from }]);
            },
          },
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
        Gmail is rate-limiting requests right now, try again in a minute.
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-[#1a1a1a]">
        {palette}
        {error === "db_unreachable"
          ? "Can't reach the database — check that it's running and reload."
          : `Failed to load inbox: ${error}`}
      </div>
    );
  }
  if (!messages) {
    return <>{palette}<LoaderScreen className="bg-white text-[#1a1a1a]" /></>;
  }

  // ponytail: string-compares against the backend's "Jan 2" date label (no
  // year) — matches today correctly except right at a year boundary.
  const todayLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const todayCount = (visibleMessages ?? []).filter((m) => m.date === todayLabel && !m.newsletter).length;

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
            <ScheduledOutboxToggle count={scheduledSends.items.length} onClick={() => setOutboxOpen(true)} />
            <AiChatToggle open={chatOpen} onToggle={() => setChatOpen((v) => !v)} />
          </div>

          <div className="mt-8 pb-20">
            <SelectionToolbar
              count={checkedIds.size}
              onReplyLater={moveCheckedToReplyLater}
              onArchive={() => archiveMany(checkedIds)}
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
                  <span className="h-px flex-1 bg-black/10" />
                  <span className="text-[13px] font-medium text-[#4f46e5]">{todayCount} today</span>
                </div>
                <div className="divide-y divide-black/[0.045]">
                  {unreadItems.map((m) => (
                    <Row
                      key={m.thread_id}
                      m={m}
                      isSelected={m.thread_id === selected}
                      isChecked={checkedIds.has(m.thread_id)}
                      onHover={() => setSelected(m.thread_id)}
                      onToggleCheck={() => toggleChecked(m.thread_id)}
                      onToggleStar={() => toggleStarred(m.thread_id)}
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

            {followUpItems.length > 0 && (
              <div className={unreadItems.length > 0 ? "mt-10" : ""}>
                <div className="flex items-center gap-3 px-1 pb-4">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                  <span className="text-[12px] font-bold tracking-tight text-gray-600">AWAITING REPLY</span>
                  <span className="h-px flex-1 bg-black/10" />
                  <span className="text-[13px] font-medium text-[#f59e0b]">{followUpItems.length}</span>
                </div>
                <div className="divide-y divide-black/[0.045]">
                  {followUpItems.map((m) => (
                    <Row
                      key={m.thread_id}
                      m={m}
                      isSelected={m.thread_id === selected}
                      isChecked={checkedIds.has(m.thread_id)}
                      onHover={() => setSelected(m.thread_id)}
                      onToggleCheck={() => toggleChecked(m.thread_id)}
                      onToggleStar={() => toggleStarred(m.thread_id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {readItems.length > 0 && (
              <div className={unreadItems.length > 0 || followUpItems.length > 0 ? "mt-10" : ""}>
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
                      isSelected={m.thread_id === selected}
                      isChecked={checkedIds.has(m.thread_id)}
                      onHover={() => setSelected(m.thread_id)}
                      onToggleCheck={() => toggleChecked(m.thread_id)}
                      onToggleStar={() => toggleStarred(m.thread_id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {newsletterItems.length > 0 && (
              <div className={ordered.length > 0 ? "mt-10" : ""}>
                <button
                  type="button"
                  onClick={() => setShowNewsletters((v) => !v)}
                  className="w-full flex items-center gap-3 px-1 pb-4"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                  <span className="text-[12px] font-bold tracking-tight text-gray-600">
                    NEWSLETTERS ({newsletterItems.length})
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-r from-black/[0.08] to-transparent" />
                  <span className="text-[13px] font-medium text-gray-400">{showNewsletters ? "Hide" : "Show"}</span>
                </button>
                {showNewsletters && (
                  <div className="divide-y divide-black/[0.045]">
                    {newsletterItems.map((m) => (
                      <Row
                        key={m.thread_id}
                        m={m}
                        isSelected={m.thread_id === selected}
                        isChecked={checkedIds.has(m.thread_id)}
                        onHover={() => setSelected(m.thread_id)}
                        onToggleCheck={() => toggleChecked(m.thread_id)}
                        onToggleStar={() => toggleStarred(m.thread_id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {searchOpen && (
        <SearchOverlay
          query={query}
          setQuery={setQuery}
          searching={searching}
          searchError={searchError}
          searchResults={searchResults}
          onSubmit={runSearch}
          onSelect={(threadId) => {
            setSearchOpen(false);
            open(threadId);
          }}
          onClose={() => setSearchOpen(false)}
        />
      )}

      <AiChat open={chatOpen} onClose={() => setChatOpen(false)} />
      <ReplyLaterStack items={replyLater.items} onRemove={replyLater.remove} />
      {lastArchived && (
        <div className="fixed bottom-6 right-6 z-30 flex items-center gap-3 rounded-xl bg-[#111214] px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
          <span>Archived</span>
          <button type="button" onClick={undoArchive} className="text-[#818cf8] hover:text-white transition-colors">
            Undo (z)
          </button>
        </div>
      )}
      {outboxOpen && (
        <ScheduledOutbox
          items={scheduledSends.items}
          onCancel={scheduledSends.cancel}
          onClose={() => setOutboxOpen(false)}
        />
      )}
      {helpOpen && <ShortcutHelp onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

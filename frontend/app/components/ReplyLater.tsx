"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatedCardStack } from "./ui/animated-card-stack";
import { Overlay } from "./CommandPalette";
import { SenderAvatar } from "./SenderAvatar";

const STORAGE_KEY = "volt.replyLater";

export type ReplyLaterItem = {
  thread_id: string;
  subject: string;
  from: string;
  addedAt: number;
};

// ponytail: localStorage only, not synced to Gmail (no label, no server
// state) — this is a personal reminder stack, not a real inbox view.
// Move to a Gmail label if it needs to survive a browser wipe or show up
// on another device.
export function useReplyLater() {
  const [items, setItems] = useState<ReplyLaterItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = (JSON.parse(raw) as ReplyLaterItem[]).filter((i) => i.thread_id);
      setItems(parsed);
      // Older builds could persist an entry with an empty thread_id — write
      // the cleaned list back so it doesn't collide again on next load.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // ignore corrupt storage
    }
  }, []);

  function persist(next: ReplyLaterItem[]) {
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function add(entries: Omit<ReplyLaterItem, "addedAt">[]) {
    const existingIds = new Set(items.map((i) => i.thread_id));
    const fresh = entries
      .filter((e) => e.thread_id && !existingIds.has(e.thread_id))
      .map((e) => ({ ...e, addedAt: Date.now() }));
    if (fresh.length > 0) persist([...items, ...fresh]);
  }

  function remove(threadId: string) {
    persist(items.filter((i) => i.thread_id !== threadId));
  }

  return { items, add, remove };
}

// Toolbar shown above the list once at least one row is checked.
export function SelectionToolbar({
  count,
  onReplyLater,
  onArchive,
  onClear,
}: {
  count: number;
  onReplyLater: () => void;
  onArchive: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl bg-[#4f46e5]/[0.06] border border-[#4f46e5]/15">
      <span className="text-[13px] font-medium text-[#4f46e5]">{count} selected</span>
      <button
        type="button"
        onClick={onArchive}
        className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1a1a1a] bg-white border border-black/[0.08] hover:bg-black/[0.03] rounded-lg px-3 py-1.5 transition-colors"
      >
        Archive
      </button>
      <button
        type="button"
        onClick={onReplyLater}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white bg-[#4f46e5] hover:bg-[#3c34c9] rounded-lg px-3 py-1.5 transition-colors"
      >
        ↩ Reply Later
      </button>
      <button
        type="button"
        onClick={onClear}
        className="text-[13px] font-medium text-gray-400 hover:text-[#1a1a1a] transition-colors"
      >
        Clear
      </button>
    </div>
  );
}

function ReplyLaterCard({ item, onRemove }: { item: ReplyLaterItem; onRemove: (threadId: string) => void }) {
  return (
    <div className="relative flex h-full items-center gap-4 px-5">
      <button
        type="button"
        onClick={() => onRemove(item.thread_id)}
        aria-label="Remove from reply later"
        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border border-black/[0.08] shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-700 text-[13px] leading-none transition-colors"
      >
        ×
      </button>
      <SenderAvatar from={item.from} size={44} className="ring-1 ring-black/[0.04]" />
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-[#1a1a1a] truncate leading-tight">{item.subject || "(no subject)"}</div>
        <div className="text-[13px] text-gray-500 truncate mt-0.5">{item.from.match(/^"?([^"<]+)"?/)?.[1]?.trim() ?? item.from}</div>
      </div>
      <Link
        href={`/inbox/${item.thread_id}`}
        className="shrink-0 flex items-center gap-0.5 h-9 rounded-full bg-[#111214] hover:bg-black pl-4 pr-3 text-[13px] font-medium text-white transition-colors"
      >
        Open
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
          <path d="M9.5 18L15.5 12L9.5 6" />
        </svg>
      </Link>
    </div>
  );
}

// Bottom-left stack of "reply later" cards — render once at the page root.
// Uses the shared AnimatedCardStack primitive (framer-motion spring
// transitions ported from the shadcn/21st.dev card-stack pattern) fed with
// real reply-later data — no demo images, no placeholder content.
export function ReplyLaterStack({
  items,
  onRemove,
}: {
  items: ReplyLaterItem[];
  onRemove: (threadId: string) => void;
}) {
  const [viewAllOpen, setViewAllOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-30 flex flex-col items-start gap-3">
      <AnimatedCardStack
        items={items.map((item) => ({ ...item, id: item.thread_id }))}
        maxVisible={3}
        cardWidth={320}
        cardHeight={80}
        renderCard={(item) => <ReplyLaterCard item={item} onRemove={onRemove} />}
      />
      <button
        type="button"
        onClick={() => setViewAllOpen(true)}
        className="self-center rounded-lg border border-black/[0.08] bg-white hover:bg-black/[0.02] px-3.5 py-1.5 text-[13px] font-medium text-[#1a1a1a] transition-colors"
      >
        View Reply Later{items.length > 3 ? ` (${items.length})` : ""}
      </button>
      {viewAllOpen && (
        <Overlay onClose={() => setViewAllOpen(false)} solid>
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <h2 className="text-[18px] font-semibold tracking-tight text-[#1a1a1a]">Reply later ({items.length})</h2>
            <button type="button" onClick={() => setViewAllOpen(false)} aria-label="Close" className="text-gray-400 hover:text-[#1a1a1a] text-lg leading-none transition-colors">
              ×
            </button>
          </div>
          <div className="px-3 pb-4 max-h-[60vh] overflow-y-auto">
            {items.map((item) => {
              return (
                <Link
                  key={item.thread_id}
                  href={`/inbox/${item.thread_id}`}
                  onClick={() => setViewAllOpen(false)}
                  className="group flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-black/[0.03] transition-colors"
                >
                  <SenderAvatar from={item.from} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-[#1a1a1a] truncate">{item.subject || "(no subject)"}</div>
                    <div className="text-[12.5px] text-gray-400 truncate">{item.from.match(/^"?([^"<]+)"?/)?.[1]?.trim() ?? item.from}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onRemove(item.thread_id);
                    }}
                    aria-label="Remove from reply later"
                    className="shrink-0 text-gray-300 hover:text-gray-600 text-lg leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </Link>
              );
            })}
          </div>
        </Overlay>
      )}
    </div>
  );
}
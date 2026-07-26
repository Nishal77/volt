"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
      if (raw) setItems(JSON.parse(raw));
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
      .filter((e) => !existingIds.has(e.thread_id))
      .map((e) => ({ ...e, addedAt: Date.now() }));
    if (fresh.length > 0) persist([...fresh, ...items]);
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
  onClear,
}: {
  count: number;
  onReplyLater: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl bg-[#4f46e5]/[0.06] border border-[#4f46e5]/15">
      <span className="text-[13px] font-medium text-[#4f46e5]">{count} selected</span>
      <button
        type="button"
        onClick={onReplyLater}
        className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-white bg-[#4f46e5] hover:bg-[#3c34c9] rounded-lg px-3 py-1.5 transition-colors"
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

// Bottom-left stack of "reply later" cards — render once at the page root.
export function ReplyLaterStack({
  items,
  onRemove,
}: {
  items: ReplyLaterItem[];
  onRemove: (threadId: string) => void;
}) {
  if (items.length === 0) return null;
  const visible = items.slice(0, 3);

  return (
    <div className="fixed bottom-5 left-5 z-30 w-72 h-[60px]">
      {visible.map((item, i) => (
        <div
          key={item.thread_id}
          className="absolute inset-x-0 bottom-0 rounded-xl bg-white border border-black/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
          style={{
            transform: `translateY(${-i * 6}px) scale(${1 - i * 0.03})`,
            zIndex: visible.length - i,
          }}
        >
          {i === 0 && (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-gray-400 shrink-0">↩</span>
              <Link href={`/inbox/${item.thread_id}`} className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium truncate">{item.subject || "(no subject)"}</div>
                <div className="text-[12px] text-gray-400 truncate">{item.from}</div>
              </Link>
              <button
                type="button"
                onClick={() => onRemove(item.thread_id)}
                aria-label="Remove from reply later"
                className="shrink-0 text-gray-300 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>
          )}
        </div>
      ))}
      {items.length > 1 && (
        <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[#4f46e5] text-white text-[11px] font-semibold flex items-center justify-center">
          {items.length}
        </div>
      )}
    </div>
  );
}

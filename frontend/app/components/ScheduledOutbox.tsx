"use client";

import { useEffect, useState } from "react";
import { Overlay } from "./CommandPalette";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type ScheduledSend = { id: number; thread_id: string; body: string; send_at: string };

export function useScheduledSends() {
  const [items, setItems] = useState<ScheduledSend[]>([]);

  function load() {
    fetch(`${API_URL}/api/scheduled`)
      .then((res) => (res.ok ? res.json() : { scheduled: [] }))
      .then((data) => setItems(data.scheduled ?? []))
      .catch(() => {});
  }

  useEffect(load, []);

  function cancel(id: number) {
    fetch(`${API_URL}/api/scheduled/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((s) => s.id !== id));
  }

  return { items, load, cancel };
}

export function ScheduledOutboxToggle({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3.5 py-2 rounded-xl bg-black/[0.03] border border-black/[0.06] text-sm font-medium text-gray-500 hover:bg-black/[0.045] transition-colors"
    >
      Scheduled ({count})
    </button>
  );
}

export function ScheduledOutbox({
  items,
  onCancel,
  onClose,
}: {
  items: ScheduledSend[];
  onCancel: (id: number) => void;
  onClose: () => void;
}) {
  return (
    <Overlay onClose={onClose} solid>
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h2 className="text-[18px] font-semibold tracking-tight text-[#1a1a1a]">Scheduled sends ({items.length})</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-[#1a1a1a] text-lg leading-none transition-colors">
          ×
        </button>
      </div>
      <div className="px-3 pb-4 max-h-[60vh] overflow-y-auto">
        {items.length === 0 && <div className="px-3 py-6 text-center text-sm text-gray-400">Nothing scheduled.</div>}
        {items.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-black/[0.03] transition-colors">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-gray-400">{new Date(s.send_at).toLocaleString()}</div>
              <div className="text-[14px] text-[#1a1a1a] truncate">{s.body}</div>
            </div>
            <button
              type="button"
              onClick={() => onCancel(s.id)}
              className="shrink-0 text-[13px] font-medium text-gray-400 hover:text-[#f43f5e] transition-colors"
            >
              Cancel
            </button>
          </div>
        ))}
      </div>
    </Overlay>
  );
}

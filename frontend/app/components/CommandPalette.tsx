"use client";

import { useEffect, useState } from "react";

export type Command = { id: string; label: string; run: () => void };

export function useCommandPalette(commands: Command[]) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return {
    open,
    close: () => setOpen(false),
    palette: open ? <CommandPalette commands={commands} onClose={() => setOpen(false)} /> : null,
  };
}

function CommandPalette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-32" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-[#0F172A] border border-white/10 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command…"
          className="w-full px-4 py-3 bg-transparent text-white outline-none border-b border-white/10"
        />
        <ul className="max-h-72 overflow-y-auto">
          {filtered.length === 0 && <li className="px-4 py-3 text-sm text-gray-500">No matching commands.</li>}
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                onClick={() => {
                  c.run();
                  onClose();
                }}
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

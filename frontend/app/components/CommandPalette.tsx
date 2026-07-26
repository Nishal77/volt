"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

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

// Shared glass overlay shell — the command palette and the inbox search
// overlay both sit inside this, so they read as one design language
// instead of two different modals.
export function Overlay({
  onClose,
  children,
  footer,
  solid = false,
}: {
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  solid?: boolean;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center pt-[16vh] ${solid ? "bg-black/30" : "bg-black/25 backdrop-blur-[2px]"}`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl mx-4 rounded-2xl border shadow-[0_8px_30px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)] overflow-hidden ${
          solid ? "bg-white border-black/[0.08]" : "bg-white/80 backdrop-blur-2xl border-white/60"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        {footer && (
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-black/[0.06] bg-black/[0.015]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function KeyHint({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[12px] text-gray-500">
      <kbd className="px-1.5 py-0.5 rounded-md bg-black/[0.05] border border-black/[0.06] font-sans text-[11px] font-medium text-gray-600">
        {keys}
      </kbd>
      {label}
    </span>
  );
}

function CommandIcon() {
  return (
    <span className="h-6 w-6 shrink-0 rounded-md bg-[#4f46e5]/10 flex items-center justify-center text-[#4f46e5] text-[13px] font-semibold">
      ⌘
    </span>
  );
}

function CommandPalette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => setActive(0), [query]);

  function run(c: Command) {
    c.run();
    onClose();
  }

  return (
    <Overlay
      onClose={onClose}
      footer={
        <>
          <KeyHint keys="↑↓" label="Navigate" />
          <KeyHint keys="↵" label="Run" />
          <KeyHint keys="esc" label="Close" />
        </>
      }
    >
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && filtered[active]) {
            run(filtered[active]);
          }
        }}
        placeholder="Type a command…"
        className="w-full px-5 py-4 bg-transparent text-[15px] text-[#1a1a1a] placeholder:text-gray-400 outline-none"
      />
      <ul ref={listRef} className="max-h-80 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-gray-400">No matching commands.</li>
        )}
        {filtered.map((c, i) => (
          <li key={c.id}>
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => run(c)}
              className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl text-[14px] font-medium text-[#1a1a1a] transition-colors ${
                i === active ? "bg-[#4f46e5]/[0.08]" : ""
              }`}
            >
              <CommandIcon />
              {c.label}
            </button>
          </li>
        ))}
      </ul>
    </Overlay>
  );
}

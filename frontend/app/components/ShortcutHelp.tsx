"use client";

import { Overlay, KeyHint } from "./CommandPalette";

const GROUPS: { title: string; shortcuts: { keys: string; label: string }[] }[] = [
  {
    title: "Everywhere",
    shortcuts: [
      { keys: "⌘K", label: "Command palette" },
      { keys: "?", label: "Show this cheatsheet" },
    ],
  },
  {
    title: "Inbox",
    shortcuts: [
      { keys: "/", label: "Search" },
      { keys: "j / ↓", label: "Next email" },
      { keys: "k / ↑", label: "Previous email" },
      { keys: "Enter / o", label: "Open selected" },
      { keys: "x", label: "Archive" },
      { keys: "z", label: "Undo last archive" },
      { keys: "s", label: "Star / unstar" },
    ],
  },
  {
    title: "Reading a thread",
    shortcuts: [
      { keys: "r", label: "Focus reply box" },
      { keys: "⌘/Ctrl + Enter", label: "Send reply" },
      { keys: "x", label: "Archive" },
      { keys: "esc", label: "Back to inbox" },
    ],
  },
];

export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  return (
    <Overlay onClose={onClose} solid footer={<KeyHint keys="esc" label="Close" />}>
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h2 className="text-[18px] font-semibold tracking-tight text-[#1a1a1a]">Keyboard shortcuts</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-[#1a1a1a] text-lg leading-none transition-colors">
          ×
        </button>
      </div>
      <div className="px-6 pb-6 grid gap-6 sm:grid-cols-3">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <div className="text-[12px] font-bold tracking-tight text-gray-400 mb-3">{group.title.toUpperCase()}</div>
            <div className="flex flex-col gap-2.5">
              {group.shortcuts.map((s) => (
                <div key={s.keys + s.label} className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-[#1a1a1a]">{s.label}</span>
                  <kbd className="shrink-0 px-1.5 py-0.5 rounded-md bg-black/[0.05] border border-black/[0.06] font-sans text-[11px] font-medium text-gray-600 whitespace-nowrap">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Overlay>
  );
}

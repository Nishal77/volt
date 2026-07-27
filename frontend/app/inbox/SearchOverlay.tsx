"use client";

import { type FormEvent } from "react";
import { Overlay, KeyHint } from "../components/CommandPalette";
import { SenderAvatar } from "../components/SenderAvatar";
import { senderName } from "../lib/avatar";
import { decodeEntities } from "./utils";
import type { Message } from "./types";

export function SearchOverlay({
  query,
  setQuery,
  searching,
  searchError,
  searchResults,
  onSubmit,
  onSelect,
  onClose,
}: {
  query: string;
  setQuery: (q: string) => void;
  searching: boolean;
  searchError: string | null;
  searchResults: Message[] | null;
  onSubmit: (e: FormEvent) => void;
  onSelect: (threadId: string) => void;
  onClose: () => void;
}) {
  return (
    <Overlay
      onClose={onClose}
      footer={
        <>
          <KeyHint keys="↵" label="Search with AI" />
          <KeyHint keys="esc" label="Close" />
        </>
      }
    >
      <form onSubmit={onSubmit}>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
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
          searchResults?.map((m) => (
            <button
              key={m.thread_id}
              type="button"
              onClick={() => onSelect(m.thread_id)}
              className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl hover:bg-black/[0.04] transition-colors"
            >
              <SenderAvatar from={m.from} size={32} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium text-[#1a1a1a]">
                  {decodeEntities(m.subject) || "(no subject)"}
                </div>
                <div className="truncate text-[12.5px] text-gray-400">{senderName(m.from)}</div>
              </div>
            </button>
          ))}
        {!searching && !searchError && !searchResults && (
          <div className="px-3 py-6 text-center text-sm text-gray-400">Press Enter to search with AI.</div>
        )}
      </div>
    </Overlay>
  );
}

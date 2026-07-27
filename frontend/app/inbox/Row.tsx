"use client";

import Link from "next/link";
import { SenderAvatar } from "../components/SenderAvatar";
import { senderName } from "../lib/avatar";
import { decodeEntities } from "./utils";
import type { Message } from "./types";

export function Row({
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
  return (
    <Link
      href={`/inbox/${m.thread_id}`}
      onMouseEnter={onHover}
      className={`group flex items-center gap-4 -mx-3 px-3 py-4 rounded-lg transition-colors duration-150 ${
        isSelected ? "bg-gray-100" : "hover:bg-gray-100"
      }`}
    >
      {m.unread ? (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#f43f5e]" />
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
        className="h-10 w-10 shrink-0 relative"
      >
        <SenderAvatar
          from={m.from}
          size={40}
          className="ring-1 ring-black/[0.04]"
          contentClassName={isChecked ? "opacity-0" : "opacity-100 group-hover:opacity-0 transition-opacity"}
        />
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
          <span className="text-gray-400">, </span>
          {decodeEntities(m.snippet)}
        </div>
      </div>
      <span className="text-[13px] text-gray-400 shrink-0 pl-4 tabular-nums">{m.date}</span>
    </Link>
  );
}

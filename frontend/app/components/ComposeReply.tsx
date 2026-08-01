"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { FileDiffIcon } from "@hugeicons/core-free-icons";
import { applyVariables, loadSnippets } from "../lib/snippets";
import { withSignature } from "../lib/signature";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // matches backend maxAttachmentBytes

type OutgoingAttachment = { filename: string; mime_type: string; data: string };

/**
 * Everything a reply needs to go out — body, snippet expansion, signature,
 * attachments, send-now-or-schedule — as one module. Previously inlined in
 * the thread page; a second caller (reply-from-inbox-list) can now import
 * this instead of copy-pasting it.
 */
export function useComposeReply(threadId: string, onSent: () => void) {
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduled, setScheduled] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [minScheduleAt] = useState(() => new Date(Date.now() + 60000).toISOString().slice(0, 16));
  const [outgoing, setOutgoing] = useState<OutgoingAttachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

  function handleAttach(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAttachError(null);
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachError(`${file.name} is too large — keep attachments under 10MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      setOutgoing((prev) => [...prev, { filename: file.name, mime_type: file.type || "application/octet-stream", data: base64 }]);
    };
    reader.onerror = () => setAttachError(`Couldn't read ${file.name}.`);
    reader.readAsDataURL(file);
  }

  function removeOutgoing(filename: string) {
    setOutgoing((prev) => prev.filter((a) => a.filename !== filename));
  }

  // Types ";shortcut" then a space/newline to expand a snippet by name
  // (spaces stripped, case-insensitive) — mirrors the command-palette
  // "Insert snippet" entries, just without leaving the compose box.
  function handleReplyChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    const cursor = e.target.selectionStart ?? value.length;
    const justTyped = value[cursor - 1];
    if (justTyped !== " " && justTyped !== "\n") {
      setReplyBody(value);
      return;
    }
    const before = value.slice(0, cursor - 1);
    const match = before.match(/(?:^|\s);(\w+)$/);
    if (!match) {
      setReplyBody(value);
      return;
    }
    const shortcut = match[1].toLowerCase();
    const snippet = loadSnippets().find((s) => s.name.toLowerCase().replace(/\s+/g, "") === shortcut);
    if (!snippet) {
      setReplyBody(value);
      return;
    }
    const triggerStart = cursor - 1 - match[1].length - 1;
    setReplyBody(value.slice(0, triggerStart) + applyVariables(snippet.body) + value.slice(cursor - 1));
  }

  function insertSnippet(body: string) {
    setReplyBody((prev) => prev + applyVariables(body));
    replyRef.current?.focus();
  }

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/inbox/${threadId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: withSignature(replyBody), attachments: outgoing }),
      });
      if (!res.ok) {
        setAttachError("Couldn't send — check your attachments and try again.");
        return;
      }
      onSent();
    } finally {
      setSending(false);
    }
  }

  async function sendLater(e: FormEvent) {
    e.preventDefault();
    if (!replyBody.trim() || !scheduleAt) return;
    const sendAt = new Date(scheduleAt);
    if (sendAt.getTime() <= Date.now()) {
      setScheduleError("Pick a time in the future.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/inbox/${threadId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: withSignature(replyBody), send_at: sendAt.toISOString() }),
      });
      if (!res.ok) {
        setScheduleError("Couldn't schedule the send. Try again.");
        return;
      }
      setScheduled(sendAt.toLocaleString());
      setScheduling(false);
      setReplyBody("");
    } finally {
      setSending(false);
    }
  }

  return {
    replyBody, setReplyBody, replyRef, attachInputRef,
    sending, scheduling, setScheduling, scheduleAt, setScheduleAt, minScheduleAt, scheduled, scheduleError,
    outgoing, attachError,
    handleAttach, removeOutgoing, handleReplyChange, insertSnippet,
    sendReply, sendLater,
  };
}

export type ComposeReplyState = ReturnType<typeof useComposeReply>;

export function ComposeReplyForm(compose: ComposeReplyState) {
  const {
    replyBody, replyRef, attachInputRef, sending, scheduling, setScheduling, scheduleAt, setScheduleAt,
    minScheduleAt, scheduled, scheduleError, outgoing, attachError,
    handleAttach, removeOutgoing, handleReplyChange, sendReply, sendLater,
  } = compose;

  return (
    <>
      {scheduled && (
        <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-[#4f46e5]/[0.06] border border-[#4f46e5]/15 text-sm text-[#4f46e5]">
          Scheduled to send {scheduled}.
        </div>
      )}

      <form onSubmit={scheduling ? sendLater : sendReply}>
        <textarea
          ref={replyRef}
          value={replyBody}
          onChange={handleReplyChange}
          placeholder="Reply… (r to focus, ;snippet-name + space to expand, ⌘/Ctrl+Enter to send)"
          rows={4}
          className="w-full rounded-xl bg-black/[0.03] border border-black/[0.06] p-3.5 text-sm placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5]/30 transition-shadow"
        />
        {scheduling && (
          <input
            type="datetime-local"
            value={scheduleAt}
            onChange={(e) => setScheduleAt(e.target.value)}
            min={minScheduleAt}
            className="mt-3 rounded-xl bg-black/[0.03] border border-black/[0.06] px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4f46e5]/20"
          />
        )}
        {scheduleError && <p className="mt-2 text-[13px] text-red-600">{scheduleError}</p>}
        {attachError && <p className="mt-2 text-[13px] text-red-600">{attachError}</p>}
        {outgoing.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {outgoing.map((a) => (
              <span
                key={a.filename}
                className="flex items-center gap-2 rounded-lg border border-black/[0.08] bg-black/[0.02] px-3 py-1.5 text-[13px] text-[#1a1a1a]"
              >
                <HugeiconsIcon icon={FileDiffIcon} size={15} />
                <span className="truncate max-w-[160px]">{a.filename}</span>
                <button type="button" onClick={() => removeOutgoing(a.filename)} className="text-gray-400 hover:text-red-500 leading-none">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-2">
          {!scheduling && (
            <>
              <input ref={attachInputRef} type="file" onChange={handleAttach} className="hidden" />
              <button
                type="button"
                onClick={() => attachInputRef.current?.click()}
                aria-label="Attach a file"
                className="px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-[#1a1a1a] transition-colors"
              >
                <HugeiconsIcon icon={FileDiffIcon} size={17} />
              </button>
            </>
          )}
          {scheduling ? (
            <>
              <button
                type="submit"
                disabled={sending || !replyBody.trim() || !scheduleAt}
                className="px-6 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#3c34c9] disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {sending ? "Scheduling…" : "Schedule send"}
              </button>
              <button
                type="button"
                onClick={() => setScheduling(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-[#1a1a1a] transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="submit"
                disabled={sending || !replyBody.trim()}
                className="px-6 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#3c34c9] disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {sending ? "Sending…" : "Send reply"}
              </button>
              <button
                type="button"
                onClick={() => setScheduling(true)}
                disabled={!replyBody.trim()}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-[#1a1a1a] disabled:opacity-40 transition-colors"
              >
                Send later
              </button>
            </>
          )}
        </div>
      </form>
    </>
  );
}

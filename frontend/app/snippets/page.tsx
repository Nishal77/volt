"use client";

import { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { saveSnippets, useSnippets } from "../lib/snippets";

export default function SnippetsPage() {
  const snippets = useSnippets();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");

  function add() {
    if (!name.trim() || !body.trim()) return;
    saveSnippets([...snippets, { id: crypto.randomUUID(), name, body }]);
    setName("");
    setBody("");
  }

  function remove(id: string) {
    saveSnippets(snippets.filter((s) => s.id !== id));
  }

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(79,70,229,0.06),transparent)]" />
      <div className="relative max-w-2xl mx-auto px-6 py-10">
        <Link
          href="/inbox"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-[#1a1a1a] transition-colors mb-8"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Inbox
        </Link>

        <h1 className="text-[28px] font-extrabold tracking-[-0.02em] mb-1">Snippets</h1>
        <p className="text-[13.5px] text-gray-500 mb-10">
          Type <code className="px-1 py-0.5 rounded bg-black/[0.05] text-[#1a1a1a] text-[12.5px]">;name</code> then a space
          while replying to expand one. Use <code className="px-1 py-0.5 rounded bg-black/[0.05] text-[#1a1a1a] text-[12.5px]">{"{{variable}}"}</code> for
          values filled in on insert.
        </p>

        <section className="rounded-2xl border border-black/[0.06] bg-black/[0.015] p-6 mb-8">
          <h2 className="text-[15px] font-semibold tracking-tight mb-5">New snippet</h2>
          <div className="space-y-2.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Snippet name, e.g. thanks"
              className="w-full rounded-xl bg-white border border-black/[0.08] px-3.5 py-2.5 text-[14px] placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5]/30 transition-shadow"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Body, e.g. Hi {{name}}, thanks for reaching out…"
              rows={3}
              className="w-full resize-none rounded-xl bg-white border border-black/[0.08] px-3.5 py-2.5 text-[14px] placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5]/30 transition-shadow"
            />
            <button
              type="button"
              onClick={add}
              disabled={!name.trim() || !body.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#3c34c9] disabled:opacity-50 text-white text-[13.5px] font-medium transition-colors"
            >
              Add snippet
            </button>
          </div>
        </section>

        <div className="space-y-2.5">
          {snippets.map((s) => (
            <div
              key={s.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-black/[0.06] bg-black/[0.015] p-4"
            >
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-[14px] font-semibold text-[#1a1a1a]">{s.name}</span>
                  <span className="text-[11.5px] text-gray-400">;{s.name.toLowerCase().replace(/\s+/g, "")}</span>
                </div>
                <div className="text-[13px] text-gray-500 whitespace-pre-wrap leading-relaxed">{s.body}</div>
              </div>
              <button
                type="button"
                onClick={() => remove(s.id)}
                className="shrink-0 text-[12.5px] font-medium text-gray-400 hover:text-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
          {snippets.length === 0 && (
            <div className="px-6 py-16 text-center text-[13.5px] text-gray-400 rounded-2xl border border-dashed border-black/[0.08]">
              No snippets yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

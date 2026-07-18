"use client";

import { useState } from "react";
import Link from "next/link";
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
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link href="/inbox" className="text-sm text-gray-400 hover:text-white">← Back to inbox</Link>
        <h1 className="text-xl font-semibold mt-4 mb-2">Snippets</h1>
        <p className="text-sm text-gray-500 mb-6">
          Use <code className="text-gray-300">{"{{variable}}"}</code> for values filled in when inserted.
        </p>

        <div className="space-y-2 mb-8">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Snippet name"
            className="w-full rounded-xl bg-white/5 border border-white/10 p-2 text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Body, e.g. Hi {{name}}, thanks for reaching out…"
            rows={3}
            className="w-full rounded-xl bg-white/5 border border-white/10 p-2 text-sm"
          />
          <button
            type="button"
            onClick={add}
            className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-sm"
          >
            Add snippet
          </button>
        </div>

        <ul className="space-y-2">
          {snippets.map((s) => (
            <li key={s.id} className="border border-white/10 rounded-xl p-3 flex justify-between items-start gap-2">
              <div>
                <div className="font-medium text-sm">{s.name}</div>
                <div className="text-xs text-gray-500 whitespace-pre-wrap">{s.body}</div>
              </div>
              <button type="button" onClick={() => remove(s.id)} className="text-xs text-gray-500 hover:text-red-400">
                Delete
              </button>
            </li>
          ))}
          {snippets.length === 0 && <li className="text-sm text-gray-500">No snippets yet.</li>}
        </ul>
      </div>
    </div>
  );
}

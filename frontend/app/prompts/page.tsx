"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type PromptFile = { name: string; content: string };

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptFile[] | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/prompts`)
      .then((res) => res.json())
      .then((data) => setPrompts(data.prompts ?? []))
      .catch(() => setPrompts([]));
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link href="/inbox" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Back to inbox
        </Link>
        <h1 className="text-xl font-semibold mt-4 mb-2">AI prompts</h1>
        <p className="text-sm text-gray-500 mb-6">
          Exactly what Volt sends your AI provider before your message — read straight from disk, not a
          separate copy kept in code. Edit the files in <code className="text-gray-300">docs/prompts/</code> to change them.
        </p>

        {prompts === null && <p className="text-sm text-gray-500">Loading…</p>}
        {prompts?.length === 0 && <p className="text-sm text-gray-500">No prompt files found.</p>}

        <div className="space-y-6">
          {prompts?.map((p) => (
            <div key={p.name}>
              <h2 className="text-sm font-semibold text-gray-300 mb-1.5 capitalize">{p.name}</h2>
              <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-400 bg-white/5 border border-white/10 rounded-xl p-4">
                {p.content}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

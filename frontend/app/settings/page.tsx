"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function SettingsPage() {
  const [provider, setProvider] = useState<"anthropic" | "openai" | "google" | "groq" | "openrouter" | "kimi">("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<{ configured: boolean; provider?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/settings/ai-key`)
      .then((res) => res.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  async function save() {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/settings/ai-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, api_key: apiKey }),
      });
      setStatus({ configured: true, provider });
      setApiKey("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link href="/inbox" className="text-sm text-gray-400 hover:text-white">← Back to inbox</Link>
        <h1 className="text-xl font-semibold mt-4 mb-2">AI settings</h1>
        <p className="text-sm text-gray-500 mb-6">
          Bring your own API key — Volt never absorbs inference cost, and the key is stored
          encrypted at rest, never logged. {status?.configured ? `Currently using ${status.provider}.` : "No key configured yet."}
        </p>

        <div className="space-y-2">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as typeof provider)}
            className="w-full rounded-xl bg-white/5 border border-white/10 p-2 text-sm"
          >
            <option value="groq">Groq (free tier)</option>
            <option value="google">Google (Gemini, free tier)</option>
            <option value="kimi">Kimi (Moonshot AI)</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
          </select>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="API key"
            className="w-full rounded-xl bg-white/5 border border-white/10 p-2 text-sm"
          />
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-60 text-sm"
          >
            {saving ? "Saving…" : "Save key"}
          </button>
        </div>
      </div>
    </div>
  );
}

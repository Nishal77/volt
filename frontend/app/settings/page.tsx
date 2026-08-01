"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { loadSignature, saveSignature } from "../lib/signature";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const PROVIDER_LABELS: Record<string, string> = {
  groq: "Groq (free tier)",
  google: "Google (Gemini, free tier)",
  kimi: "Kimi (Moonshot AI)",
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI",
  openrouter: "OpenRouter",
};

export default function SettingsPage() {
  const [provider, setProvider] = useState<"anthropic" | "openai" | "google" | "groq" | "openrouter" | "kimi">("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<{ configured: boolean; provider?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState(() => loadSignature());
  const [signatureSaved, setSignatureSaved] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/settings/ai-key`)
      .then((res) => res.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  function saveSig() {
    saveSignature(signature);
    setSignatureSaved(true);
    setTimeout(() => setSignatureSaved(false), 1500);
  }

  async function save() {
    if (!apiKey.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/settings/ai-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, api_key: apiKey }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          body.error === "ai_invalid_key"
            ? "That key was rejected by the provider — double-check it and try again."
            : body.error === "ai_rate_limited"
              ? "The provider is rate-limiting right now — try again in a moment."
              : "Couldn't verify that key. Try again."
        );
        return;
      }
      setStatus({ configured: true, provider });
      setApiKey("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(79,70,229,0.06),transparent)]" />
      <div className="relative max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/inbox"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-[#1a1a1a] transition-colors"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
            Inbox
          </Link>
          <Link
            href="/prompts"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-[#1a1a1a] transition-colors"
          >
            See AI prompts
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
          </Link>
        </div>

        <h1 className="text-[28px] font-extrabold tracking-[-0.02em] mb-1">Settings</h1>
        <p className="text-[13.5px] text-gray-500 mb-10">Your AI provider, key, and reply signature — all local to this instance.</p>

        <section className="rounded-2xl border border-black/[0.06] bg-black/[0.015] p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-[15px] font-semibold tracking-tight">AI provider</h2>
            {status?.configured && (
              <span className="text-[10.5px] font-semibold uppercase tracking-wide text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                Connected
              </span>
            )}
          </div>
          <p className="text-[13px] text-gray-500 mb-5 leading-relaxed">
            Bring your own key — Volt never absorbs inference cost. Stored encrypted at rest, never logged.
            {status?.configured && ` Currently using ${PROVIDER_LABELS[status.provider ?? ""] ?? status.provider}.`}
          </p>

          <div className="space-y-2.5">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as typeof provider)}
              className="w-full rounded-xl bg-white border border-black/[0.08] px-3.5 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5]/30 transition-shadow"
            >
              {Object.entries(PROVIDER_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API key"
              className="w-full rounded-xl bg-white border border-black/[0.08] px-3.5 py-2.5 text-[14px] placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5]/30 transition-shadow"
            />
            <button
              type="button"
              onClick={save}
              disabled={saving || !apiKey.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#3c34c9] disabled:opacity-50 text-white text-[13.5px] font-medium transition-colors"
            >
              {saving ? "Verifying key…" : "Save key"}
            </button>
            {error && <p className="text-[13px] text-red-600">{error}</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-black/[0.06] bg-black/[0.015] p-6">
          <h2 className="text-[15px] font-semibold tracking-tight mb-1">Signature</h2>
          <p className="text-[13px] text-gray-500 mb-5 leading-relaxed">
            Appended to replies when you send — not shown while you&apos;re typing. Stored only in this browser.
          </p>
          <div className="space-y-2.5">
            <textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder={"Nishal\nnishalpoojary777@gmail.com"}
              rows={4}
              className="w-full resize-none rounded-xl bg-white border border-black/[0.08] px-3.5 py-2.5 text-[14px] placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5]/30 transition-shadow"
            />
            <button
              type="button"
              onClick={saveSig}
              className="px-5 py-2.5 rounded-xl bg-[#111214] hover:bg-black text-white text-[13.5px] font-medium transition-colors"
            >
              {signatureSaved ? "Saved" : "Save signature"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

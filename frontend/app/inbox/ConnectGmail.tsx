"use client";

import { useEffect, useState, type FormEvent } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const CONNECT_ERROR_MESSAGES: Record<string, string> = {
  reconnect_required: "Your Gmail connection expired — reconnect to continue.",
  oauth_denied: "Gmail connection was cancelled.",
  oauth_failed: "Something went wrong connecting Gmail. Try again.",
  save_failed: "Couldn't save your connection. Try again.",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-white text-[#1a1a1a] px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(50%_100%_at_50%_0%,rgba(79,70,229,0.07),transparent)]" />
      <div className="relative flex flex-col items-center text-center max-w-sm w-full">
        <span className="text-2xl font-extrabold tracking-[-0.02em] mb-2">Volt</span>
        <p className="text-sm text-gray-500 mb-10">Your inbox, your server, your AI key.</p>
        {children}
      </div>
    </div>
  );
}

function OAuthClientSetup({ onSaved }: { onSaved: () => void }) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/settings/oauth-client`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
      });
      if (!res.ok) {
        setError("Couldn't save that. Double-check the values and try again.");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <p className="text-[13px] text-gray-500 leading-relaxed mb-6">
        Before you can connect Gmail, this instance needs its own Google OAuth client.
        Create one free in the{" "}
        <a
          href="https://console.cloud.google.com/apis/credentials"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#4f46e5] underline"
        >
          Google Cloud Console
        </a>
        , then paste the two values it gives you below. Full walkthrough in{" "}
        <a href="/docs#getting-started" className="text-[#4f46e5] underline">
          the docs
        </a>
        .
      </p>
      <form onSubmit={submit} className="w-full text-left space-y-2.5">
        <input
          type="text"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="Client ID"
          autoFocus
          className="w-full rounded-xl bg-white border border-black/[0.08] px-3.5 py-2.5 text-[14px] placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5]/30 transition-shadow"
        />
        <input
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          placeholder="Client secret"
          className="w-full rounded-xl bg-white border border-black/[0.08] px-3.5 py-2.5 text-[14px] placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5]/30 transition-shadow"
        />
        {error && <p className="text-[13px] text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={saving || !clientId.trim() || !clientSecret.trim()}
          className="w-full mt-1.5 px-4 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#3c34c9] disabled:opacity-50 text-white text-[13.5px] font-medium transition-colors"
        >
          {saving ? "Saving…" : "Save & continue"}
        </button>
      </form>
    </>
  );
}

export function ConnectGmail({ reason }: { reason?: string }) {
  const message = reason ? CONNECT_ERROR_MESSAGES[reason] : undefined;
  const [oauthConfigured, setOauthConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/settings/oauth-client`)
      .then((res) => res.json())
      .then((data) => setOauthConfigured(Boolean(data.configured)))
      .catch(() => setOauthConfigured(true));
  }, []);

  if (oauthConfigured === null) {
    return <Shell>{null}</Shell>;
  }

  if (!oauthConfigured) {
    return (
      <Shell>
        <OAuthClientSetup onSaved={() => setOauthConfigured(true)} />
      </Shell>
    );
  }

  return (
    <Shell>
      {message && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2 mb-6">
          {message}
        </p>
      )}

      <a
        href={`${API_URL}/auth/google`}
        aria-label="Connect Gmail"
        title="Connect Gmail"
        className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-white ring-1 ring-black/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 active:translate-y-0"
      >
        <svg width="28" height="28" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 34.5 26.9 35.5 24 35.5c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.6 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.8l6.6 5.6C39.9 37.5 44 31.5 44 24c0-1.3-.1-2.7-.4-3.5z" />
        </svg>
      </a>
      <p className="text-xs text-gray-400 mt-4">Connect Gmail to continue</p>
    </Shell>
  );
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderScreen } from "../components/Loader";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function UnlockPage() {
  const router = useRouter();
  const [setup, setSetup] = useState<boolean | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/vault/status`)
      .then((res) => res.json())
      .then((data) => {
        if (data.unlocked) {
          router.push("/inbox");
          return;
        }
        setSetup(data.setup);
      });
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!setup && passphrase !== confirm) {
      setError("Passphrases don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/vault/${setup ? "unlock" : "setup"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error === "wrong_passphrase" ? "Wrong passphrase." : "Something went wrong.");
        return;
      }
      router.push("/inbox");
    } finally {
      setBusy(false);
    }
  }

  async function resetVault() {
    setBusy(true);
    setError(null);
    try {
      await fetch(`${API_URL}/api/vault/reset`, { method: "POST" });
      setSetup(false);
      setPassphrase("");
      setConfirm("");
      setConfirmingReset(false);
    } finally {
      setBusy(false);
    }
  }

  if (setup === null) {
    return <LoaderScreen className="bg-white text-[#1a1a1a]" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-[#1a1a1a]">
      <div className="w-full max-w-sm px-4">
        <form onSubmit={submit}>
          <h1 className="text-[19px] font-semibold tracking-tight text-center mb-1.5">
            {setup ? "Unlock Volt" : "Set up your vault"}
          </h1>
          <p className="text-[13px] text-gray-500 text-center leading-relaxed mb-6">
            {setup
              ? "Enter your passphrase to decrypt your credentials for this session."
              : "This passphrase encrypts your Gmail and AI keys. It's never stored — only you can unlock this instance. Losing it means losing access to stored credentials."}
          </p>

          <div className="space-y-2.5">
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Passphrase"
              autoFocus
              className="w-full rounded-xl bg-white border border-black/[0.08] px-3.5 py-2.5 text-[14px] placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5]/30 transition-shadow"
            />
            {!setup && (
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm passphrase"
                className="w-full rounded-xl bg-white border border-black/[0.08] px-3.5 py-2.5 text-[14px] placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5]/30 transition-shadow"
              />
            )}
          </div>

          {error && <p className="text-[13px] text-red-600 mt-3">{error}</p>}

          <button
            type="submit"
            disabled={busy || !passphrase}
            className="w-full mt-4 px-4 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#3c34c9] disabled:opacity-50 text-white text-[13.5px] font-medium transition-colors"
          >
            {busy ? "Working…" : setup ? "Unlock" : "Create vault"}
          </button>

          {setup && !confirmingReset && (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              className="w-full mt-3 text-[12.5px] text-gray-400 hover:text-[#1a1a1a] transition-colors"
            >
              Forgot passphrase?
            </button>
          )}

          {setup && confirmingReset && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3.5">
              <p className="text-[12.5px] text-red-600 leading-relaxed mb-3">
                There&apos;s no recovery — Volt never stores your passphrase. Resetting
                deletes your stored Gmail connection and AI key, and lets you set a new
                passphrase. You&apos;ll need to reconnect Gmail after.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetVault}
                  disabled={busy}
                  className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-[12.5px] font-medium transition-colors"
                >
                  {busy ? "Resetting…" : "Reset vault"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  className="flex-1 px-3 py-2 rounded-lg bg-black/[0.04] hover:bg-black/[0.07] text-[12.5px] font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="text-center text-[12px] text-gray-400 mt-5">
          Self-hosted. Your credentials never leave this server.
        </p>
      </div>
    </div>
  );
}

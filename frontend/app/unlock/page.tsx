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
    return <LoaderScreen className="bg-black text-white" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <form onSubmit={submit} className="w-full max-w-sm px-4">
        <h1 className="text-xl font-semibold mb-2">{setup ? "Unlock Volt" : "Set up your vault"}</h1>
        <p className="text-sm text-gray-500 mb-6">
          {setup
            ? "Enter your passphrase to decrypt your credentials for this session."
            : "This passphrase encrypts your Gmail and AI keys. It's never stored — only you can unlock this instance. Losing it means losing access to stored credentials."}
        </p>
        <input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Passphrase"
          autoFocus
          className="w-full rounded-xl bg-white/5 border border-white/10 p-2 text-sm mb-2"
        />
        {!setup && (
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm passphrase"
            className="w-full rounded-xl bg-white/5 border border-white/10 p-2 text-sm mb-2"
          />
        )}
        {error && <p className="text-sm text-red-300 mb-2">{error}</p>}
        <button
          type="submit"
          disabled={busy || !passphrase}
          className="w-full px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-60 text-sm"
        >
          {busy ? "Working…" : setup ? "Unlock" : "Create vault"}
        </button>

        {setup && !confirmingReset && (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            className="w-full mt-3 text-xs text-gray-500 hover:text-gray-300"
          >
            Forgot passphrase?
          </button>
        )}

        {setup && confirmingReset && (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/5 p-3">
            <p className="text-xs text-red-300 mb-3">
              There&apos;s no recovery — Volt never stores your passphrase. Resetting
              deletes your stored Gmail connection and AI key, and lets you set a new
              passphrase. You&apos;ll need to reconnect Gmail after.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetVault}
                disabled={busy}
                className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 text-xs font-medium"
              >
                {busy ? "Resetting…" : "Reset vault"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

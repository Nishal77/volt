"use client";

import { useEffect, useState } from "react";

function readStoredUpvotes(): number {
  if (typeof window === "undefined") return 32;
  const stored = localStorage.getItem("volt_upvotes");
  return stored ? parseInt(stored, 10) : 32;
}

function readStoredUpvoted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("volt_upvoted") === "true";
}

export default function Waitlist() {
  const [upvotes, setUpvotes] = useState(32);
  const [upvoted, setUpvoted] = useState(false);

  useEffect(() => {
    // ponytail: one-time localStorage read on mount, extra render is harmless for a cosmetic counter
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUpvotes(readStoredUpvotes());
    setUpvoted(readStoredUpvoted());
  }, []);

  useEffect(() => {
    localStorage.setItem("volt_upvotes", upvotes.toString());
  }, [upvotes]);

  useEffect(() => {
    localStorage.setItem("volt_upvoted", upvoted.toString());
  }, [upvoted]);

  function handleUpvote() {
    if (upvoted) return;
    setUpvotes((n) => n + 1);
    setUpvoted(true);
  }

  return (
    <div
      className="h-screen text-black bg-cover bg-center bg-no-repeat relative flex flex-col overflow-hidden"
      style={{
        backgroundImage: 'url("/video/gg.png")',
      }}
    >
      <div className="absolute inset-0 bg-black/80 -z-10" />

      <nav className="relative z-20 w-full max-w-lg mx-auto mt-6 flex items-center justify-between p-2 rounded-2xl border border-white/10 bg-white/5">
        <div className="text-white text-lg font-medium ml-2">Volt</div>
        <a
          href="https://github.com/your-repo"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2 rounded-xl bg-[#0F172A] text-white text-sm font-medium hover:bg-[#c2ee2c] transition-colors duration-200"
        >
          Star on GitHub
        </a>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center relative z-10 overflow-auto">
        <h1 className="text-6xl sm:text-7xl font-medium tracking-tight max-w-4xl mt-8">
          The email client Big Tech doesn&apos;t want you to have. Open source.
        </h1>

        <p className="text-gray-600 text-base sm:text-lg mt-5 max-w-2xl leading-relaxed">
          Open source, self-hosted, and faster than anything you&apos;ve paid for.
        </p>

        <div className="flex flex-row items-center mt-10 gap-4 max-w-md">
          <button
            type="button"
            onClick={handleUpvote}
            disabled={upvoted}
            className="cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white bg-[#0F172A] border border-black/10 hover:bg-[#1E293B] transition-colors duration-200 text-sm font-medium"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
            Upvote
          </button>
          <p className="text-sm text-gray-800 text-left">
            {upvotes} people want this, &quot;Upvote if you&apos;re tired of email clients that don&apos;t respect your data.&quot;
          </p>
        </div>
      </main>

      <footer className="text-center pb-10 text-xs text-gray-600 relative z-10">
        <p className="text-sm">
          Everything&apos;s public, the wins, the bugs, the 3am commits →{" "}
          <a href="https://www.linkedin.com/in/nishal-poojary/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-400">
            LinkedIn
          </a>
          {" "}&{" "}
          <a href="https://x.com/nishalbuilds" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-400">
            X
          </a>
        </p>
      </footer>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [upvotes, setUpvotes] = useState(32);
  const [upvoted, setUpvoted] = useState(false);

  useEffect(() => {
    const storedUpvotes = localStorage.getItem("volt_upvotes");
    const storedUpvoted = localStorage.getItem("volt_upvoted");

    if (storedUpvotes) {
      setUpvotes(parseInt(storedUpvotes, 10));
    }
    if (storedUpvoted === "true") {
      setUpvoted(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("volt_upvotes", upvotes.toString());
  }, [upvotes]);

  useEffect(() => {
    localStorage.setItem("volt_upvoted", upvoted.toString());
  }, [upvoted]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setEmail("");
  }

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
          className="px-6 py-2 rounded-xl bg-[#DFFF2A] text-black text-sm font-medium hover:bg-[#c2ee2c] transition-colors duration-200"
          style={{
            background: 'linear-gradient(135deg, #2F7BFF, #42A5FF)',
          }}
        >
          Star on GitHub
        </a>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center relative z-10 overflow-auto">

        <h1 className="text-6xl sm:text-7xl font-medium tracking-tight max-w-4xl  mt-8">
          The email client Big Tech doesn't want you to have. Open source.
        </h1>

        <p className="text-gray-600 text-base sm:text-lg mt-5 max-w-2xl leading-relaxed">
          Open source, self-hosted, and faster than anything you've paid for.
        </p>

        <div className="flex flex-row items-center mt-10 gap-4  max-w-md">
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
            {upvotes} people want this, "Upvote if you're tired of email clients that don't respect your data."
          </p>
        </div>
      </main>

      <footer className="text-center pb-10 text-xs text-gray-600 relative z-10">
        <div className="flex items-center justify-center gap-4">
          <a
            href="https://x.com/nishalbuilds"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <img width="24" height="24" src="https://img.icons8.com/ios-filled/50/twitterx--v1.png" alt="twitterx--v1" />
          </a>
          <a
            href="https://www.linkedin.com/in/nishal-poojary/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <img width="24" height="24" src="https://img.icons8.com/color/48/linkedin.png" alt="linkedin" />
          </a>
        </div>
        <p className="mt-3 text-sm">
          Everything's public, the wins, the bugs, the 3am commits →{" "}
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
"use client";

import { useEffect, useState } from "react";
import { avatarCandidates, avatarColor, initials } from "../lib/avatar";

// Real sender photo/logo (BIMI brand logo, then Gravatar), falling back to
// colored initials — shared by the inbox list and the reply-later stack
// so both show the same avatar instead of one being initials-only.
export function SenderAvatar({
  from,
  size = 40,
  className = "",
  contentClassName = "",
}: {
  from: string;
  size?: number;
  className?: string;
  contentClassName?: string;
}) {
  const color = avatarColor(from);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [prevFrom, setPrevFrom] = useState(from);

  if (from !== prevFrom) {
    setPrevFrom(from);
    setCandidates([]);
    setCandidateIndex(0);
  }

  useEffect(() => {
    let cancelled = false;
    avatarCandidates(from).then((urls) => {
      if (!cancelled) setCandidates(urls);
    });
    return () => {
      cancelled = true;
    };
  }, [from]);

  const avatarSrc = candidates[candidateIndex];
  const showPhoto = Boolean(avatarSrc);

  return (
    <span
      className={`relative shrink-0 rounded-full flex items-center justify-center overflow-hidden font-semibold ${className}`}
      style={{
        height: size,
        width: size,
        fontSize: size * 0.34,
        ...(showPhoto ? {} : { backgroundColor: color.bg, color: color.fg }),
      }}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarSrc}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover ${contentClassName}`}
          onError={() => setCandidateIndex((i) => i + 1)}
        />
      ) : (
        <span className={contentClassName}>{initials(from)}</span>
      )}
    </span>
  );
}

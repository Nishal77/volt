// Sender avatar resolution — shared by the inbox list and the reply-later
// stack, so both show the same real photo/logo instead of one falling
// back to plain initials. Tries a brand logo (BIMI) first, then a
// personal photo (Gravatar), then colored initials as the honest fallback
// when neither exists. No Google People API scope — see inbox/page.tsx
// history for why that was ruled out.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const AVATAR_FG = "#111214";
export const AVATAR_COLORS = [
  { bg: "#b8a6ff", fg: AVATAR_FG },
  { bg: "#7fd4a3", fg: AVATAR_FG },
  { bg: "#ffa8bd", fg: AVATAR_FG },
  { bg: "#7fc4e0", fg: AVATAR_FG },
  { bg: "#ffc373", fg: AVATAR_FG },
  { bg: "#8de0bb", fg: AVATAR_FG },
];

export function senderName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*<?/);
  const name = match?.[1]?.trim();
  return name && name.length > 0 ? name : from.replace(/<.*>/, "").trim();
}

export function initials(from: string): string {
  const name = senderName(from);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function avatarColor(from: string) {
  let hash = 0;
  for (let i = 0; i < from.length; i++) hash = (hash * 31 + from.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function emailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).trim().toLowerCase();
}

// Gravatar accepts a SHA-256 hash of the email (their newer, non-MD5
// option) — native Web Crypto covers this, no hashing library needed.
// d=404 makes it 404 instead of a default silhouette when no photo is
// registered, so <img onError> can cleanly fall back to initials.
const gravatarCache = new Map<string, Promise<string>>();

export async function gravatarURL(email: string): Promise<string> {
  if (!gravatarCache.has(email)) {
    const promise = (async () => {
      const bytes = new TextEncoder().encode(email);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
      return `https://www.gravatar.com/avatar/${hex}?d=404&s=80`;
    })();
    gravatarCache.set(email, promise);
  }
  return gravatarCache.get(email)!;
}

// BIMI is a real per-domain sender logo (a DNS TXT record verified brands
// publish, e.g. Adzuna) — separate from Gravatar's per-person photo, and
// resolved server-side since browsers can't do DNS lookups.
const bimiCache = new Map<string, Promise<string | null>>();

export async function bimiLogoURL(domain: string): Promise<string | null> {
  if (!bimiCache.has(domain)) {
    const promise = fetch(`${API_URL}/api/avatar?domain=${encodeURIComponent(domain)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.url ?? null)
      .catch(() => null);
    bimiCache.set(domain, promise);
  }
  return bimiCache.get(domain)!;
}

// Tries the sender's brand logo (BIMI) first, then their personal photo
// (Gravatar) — first one that actually exists wins; <img onError> in the
// caller advances through whatever came back.
export async function avatarCandidates(from: string): Promise<string[]> {
  const email = emailAddress(from);
  const domain = email.split("@")[1] ?? "";
  const [bimi, gravatar] = await Promise.all([bimiLogoURL(domain), gravatarURL(email)]);
  return [bimi, gravatar].filter((u): u is string => Boolean(u));
}

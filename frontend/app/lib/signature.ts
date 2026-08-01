const KEY = "volt.signature";

export function loadSignature(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY) ?? "";
}

export function saveSignature(signature: string) {
  window.localStorage.setItem(KEY, signature);
}

// Appends the signature to a reply body at send time, not while typing —
// keeps the compose box clean and avoids stacking it on every edit.
export function withSignature(body: string): string {
  const signature = loadSignature().trim();
  return signature ? `${body}\n\n--\n${signature}` : body;
}

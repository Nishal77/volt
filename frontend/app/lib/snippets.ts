import { useSyncExternalStore } from "react";

export type Snippet = { id: string; name: string; body: string };

const KEY = "volt.snippets";
const listeners = new Set<() => void>();
const EMPTY: Snippet[] = [];
let cached: Snippet[] | null = null;

export function loadSnippets(): Snippet[] {
  if (typeof window === "undefined") return EMPTY;
  if (cached) return cached;
  try {
    cached = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
  } catch {
    cached = [];
  }
  return cached!;
}

export function saveSnippets(snippets: Snippet[]) {
  cached = snippets;
  window.localStorage.setItem(KEY, JSON.stringify(snippets));
  for (const l of listeners) l();
}

// Keeps snippet lists in sync with localStorage across renders (server snapshot is empty).
// loadSnippets() is cached so useSyncExternalStore gets a stable reference between calls.
export function useSnippets(): Snippet[] {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    loadSnippets,
    () => EMPTY,
  );
}

// Replaces {{var}} tokens with a prompt() value for each unique variable.
export function applyVariables(body: string): string {
  const vars = Array.from(new Set([...body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1])));
  let result = body;
  for (const v of vars) {
    const value = window.prompt(`Value for "${v}"`) ?? "";
    result = result.replaceAll(`{{${v}}}`, value);
  }
  return result;
}

// True while focus is in a text input — shortcut keys should not fire.
export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

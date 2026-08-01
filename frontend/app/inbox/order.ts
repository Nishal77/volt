import type { Message } from "./types";

const NEW_FOR_YOU_LIMIT = 7;

export type InboxOrder = {
  unreadItems: Message[];
  followUpItems: Message[];
  readItems: Message[];
  newsletterItems: Message[];
  hiddenUnreadCount: number;
  todayCount: number;
  /** Every row a keypress or isSelected check can land on — display order,
   *  keyed by thread_id. The single source both nav and rendering read from,
   *  so a background refetch reordering the underlying array can't point a
   *  keypress at the wrong row (it did, before this was one function). */
  ordered: Message[];
};

/**
 * Pure grouping/ordering over a message list — no React, no rendering.
 * Testable as data in, data out; a bug here is a unit test, not a
 * click-through in a browser.
 */
export function orderInbox(
  messages: Message[] | null,
  opts: { showAllUnread: boolean; showNewsletters: boolean }
): InboxOrder {
  const all = messages ?? [];
  // ponytail: string-compares against the backend's "Jan 2" date label (no
  // year) — matches today correctly except right at a year boundary.
  const todayLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const newsletterItems = all.filter((m) => m.newsletter);
  const primary = all.filter((m) => !m.newsletter);
  const allUnread = primary.filter((m) => m.unread);
  const followUpItems = primary.filter((m) => !m.unread && m.awaiting_reply);
  const readItems = primary.filter((m) => !m.unread && !m.awaiting_reply);
  const unreadItems = opts.showAllUnread ? allUnread : allUnread.slice(0, NEW_FOR_YOU_LIMIT);
  const hiddenUnreadCount = allUnread.length - unreadItems.length;
  const todayCount = all.filter((m) => m.date === todayLabel && !m.newsletter).length;
  const ordered = [...unreadItems, ...followUpItems, ...readItems, ...(opts.showNewsletters ? newsletterItems : [])];

  return { unreadItems, followUpItems, readItems, newsletterItems, hiddenUnreadCount, todayCount, ordered };
}

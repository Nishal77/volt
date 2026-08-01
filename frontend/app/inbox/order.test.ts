import { describe, expect, test } from "bun:test";
import { orderInbox } from "./order";
import type { Message } from "./types";

function msg(overrides: Partial<Message>): Message {
  return {
    thread_id: overrides.thread_id ?? Math.random().toString(36),
    subject: "Subject",
    from: "a@example.com",
    snippet: "snippet",
    unread: false,
    starred: false,
    awaiting_reply: false,
    newsletter: false,
    date: "Jan 1",
    message_count: 1,
    ...overrides,
  };
}

describe("orderInbox", () => {
  test("handles null messages (loading state)", () => {
    const result = orderInbox(null, { showAllUnread: false, showNewsletters: false });
    expect(result.ordered).toEqual([]);
    expect(result.hiddenUnreadCount).toBe(0);
  });

  test("groups by unread, awaiting-reply, and read", () => {
    const unread = msg({ thread_id: "u1", unread: true });
    const followUp = msg({ thread_id: "f1", unread: false, awaiting_reply: true });
    const read = msg({ thread_id: "r1", unread: false, awaiting_reply: false });

    const result = orderInbox([read, followUp, unread], { showAllUnread: false, showNewsletters: false });

    expect(result.unreadItems.map((m) => m.thread_id)).toEqual(["u1"]);
    expect(result.followUpItems.map((m) => m.thread_id)).toEqual(["f1"]);
    expect(result.readItems.map((m) => m.thread_id)).toEqual(["r1"]);
    // ordered is unread -> follow-up -> read, regardless of input order
    expect(result.ordered.map((m) => m.thread_id)).toEqual(["u1", "f1", "r1"]);
  });

  test("newsletters are excluded from primary groups by default", () => {
    const newsletter = msg({ thread_id: "n1", unread: true, newsletter: true });
    const real = msg({ thread_id: "u1", unread: true, newsletter: false });

    const hidden = orderInbox([newsletter, real], { showAllUnread: false, showNewsletters: false });
    expect(hidden.unreadItems.map((m) => m.thread_id)).toEqual(["u1"]);
    expect(hidden.newsletterItems.map((m) => m.thread_id)).toEqual(["n1"]);
    expect(hidden.ordered.map((m) => m.thread_id)).toEqual(["u1"]); // newsletter not in nav order

    const shown = orderInbox([newsletter, real], { showAllUnread: false, showNewsletters: true });
    expect(shown.ordered.map((m) => m.thread_id)).toEqual(["u1", "n1"]);
  });

  test("caps unread at 7 unless showAllUnread", () => {
    const unread = Array.from({ length: 10 }, (_, i) => msg({ thread_id: `u${i}`, unread: true }));

    const capped = orderInbox(unread, { showAllUnread: false, showNewsletters: false });
    expect(capped.unreadItems).toHaveLength(7);
    expect(capped.hiddenUnreadCount).toBe(3);

    const all = orderInbox(unread, { showAllUnread: true, showNewsletters: false });
    expect(all.unreadItems).toHaveLength(10);
    expect(all.hiddenUnreadCount).toBe(0);
  });

  // Regression test for the bug fixed this session: `selected` used to be
  // an array index into a differently-ordered list, so a background
  // refetch could silently point a keypress at the wrong thread. ordered
  // is now the one list both nav and rendering read from — this just
  // pins that it stays internally consistent (every group's rows show up
  // in ordered, nothing duplicated, nothing dropped).
  test("ordered is exactly the concatenation of the visible groups, no duplicates", () => {
    const messages = [
      msg({ thread_id: "u1", unread: true }),
      msg({ thread_id: "f1", awaiting_reply: true }),
      msg({ thread_id: "r1" }),
      msg({ thread_id: "n1", newsletter: true }),
    ];
    const result = orderInbox(messages, { showAllUnread: true, showNewsletters: true });
    const ids = result.ordered.map((m) => m.thread_id);
    expect(new Set(ids).size).toBe(ids.length); // no duplicates
    expect(ids.sort()).toEqual(["f1", "n1", "r1", "u1"]);
  });
});

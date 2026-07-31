#!/usr/bin/env bun
// Volt MCP server — a thin stdio proxy over the existing Go backend's REST
// API. No credential/vault/crypto logic lives here; the backend already
// owns that (internal/vault) and this process just makes the same HTTP
// calls the frontend does.
//
// Read/search/draft/organize tools are exposed (list, get, search, draft,
// archive, star, mark-read). There is deliberately no reply/send tool: an
// MCP client can organize the inbox but can never send an email on the
// user's behalf (CLAUDE.md §3: AI drafting is on-demand only, a human
// always clicks send in the Volt UI). Archiving/starring/marking read
// don't send anything, so they're safe to expose the same way the Volt UI
// itself exposes them.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = process.env.VOLT_API_URL ?? "http://localhost:8080";

async function voltFetch(path: string): Promise<string> {
  const res = await fetch(`${API_URL}${path}`);
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Volt API ${path} returned ${res.status}: ${body}`);
  }
  return body;
}

async function voltPost(path: string, json?: unknown): Promise<string> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: json === undefined ? undefined : { "Content-Type": "application/json" },
    body: json === undefined ? undefined : JSON.stringify(json),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Volt API ${path} returned ${res.status}: ${body}`);
  }
  return body;
}

const server = new McpServer({ name: "volt", version: "0.1.0" });

server.registerTool(
  "list_inbox",
  {
    title: "List inbox",
    description: "List recent threads in the connected Gmail inbox: subject, sender, snippet, read/unread state.",
    inputSchema: {},
  },
  async () => ({ content: [{ type: "text", text: await voltFetch("/api/inbox") }] }),
);

server.registerTool(
  "get_thread",
  {
    title: "Read an email thread",
    description: "Get the full content of one email thread by its thread_id (from list_inbox or search_inbox).",
    inputSchema: { thread_id: z.string() },
  },
  async ({ thread_id }) => ({
    content: [{ type: "text", text: await voltFetch(`/api/inbox/${encodeURIComponent(thread_id)}`) }],
  }),
);

server.registerTool(
  "search_inbox",
  {
    title: "Search inbox",
    description: "Natural-language search over the inbox — finds threads matching a query even without exact keyword overlap.",
    inputSchema: { query: z.string() },
  },
  async ({ query }) => ({
    content: [{ type: "text", text: await voltFetch(`/api/search?q=${encodeURIComponent(query)}`) }],
  }),
);

server.registerTool(
  "draft_reply",
  {
    title: "Draft a reply",
    description:
      "Generate a draft reply for a thread using the user's configured AI key. This never sends the email — " +
      "the draft is returned as text for the human to review and send themselves from the Volt UI.",
    inputSchema: { thread_id: z.string() },
  },
  async ({ thread_id }) => {
    const res = await fetch(`${API_URL}/api/inbox/${encodeURIComponent(thread_id)}/draft`, { method: "POST" });
    const body = await res.text();
    if (!res.ok) throw new Error(`Volt API draft returned ${res.status}: ${body}`);
    return { content: [{ type: "text", text: body }] };
  },
);

server.registerTool(
  "archive_thread",
  {
    title: "Archive a thread",
    description: "Archive an email thread (removes it from the inbox). Does not delete or send anything.",
    inputSchema: { thread_id: z.string() },
  },
  async ({ thread_id }) => ({
    content: [{ type: "text", text: await voltPost(`/api/inbox/${encodeURIComponent(thread_id)}/archive`) }],
  }),
);

server.registerTool(
  "star_thread",
  {
    title: "Star or unstar a thread",
    description: "Set or clear the star on an email thread.",
    inputSchema: { thread_id: z.string(), starred: z.boolean() },
  },
  async ({ thread_id, starred }) => ({
    content: [
      { type: "text", text: await voltPost(`/api/inbox/${encodeURIComponent(thread_id)}/star`, { starred }) },
    ],
  }),
);

server.registerTool(
  "mark_thread_read",
  {
    title: "Mark a thread read or unread",
    description: "Set or clear the read/unread state of an email thread.",
    inputSchema: { thread_id: z.string(), read: z.boolean() },
  },
  async ({ thread_id, read }) => ({
    content: [{ type: "text", text: await voltPost(`/api/inbox/${encodeURIComponent(thread_id)}/read`, { read }) }],
  }),
);

await server.connect(new StdioServerTransport());

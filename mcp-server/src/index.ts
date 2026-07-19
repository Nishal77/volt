#!/usr/bin/env bun
// Volt MCP server — a thin stdio proxy over the existing Go backend's REST
// API. No credential/vault/crypto logic lives here; the backend already
// owns that (internal/vault) and this process just makes the same HTTP
// calls the frontend does. Exposes read/search/draft only, per the PRD's
// explicit scope — no archive/reply/send tool, so an MCP client can never
// send an email on the user's behalf (CLAUDE.md §3: AI drafting is
// on-demand only, a human always clicks send in the Volt UI).
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

await server.connect(new StdioServerTransport());

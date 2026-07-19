# Volt MCP server

Exposes your self-hosted Volt inbox to any MCP client (Claude Code, Cursor,
Claude Desktop) as three tools: `list_inbox`, `get_thread`, `search_inbox`,
and one action tool, `draft_reply`.

`draft_reply` never sends anything — it returns draft text for you to
review and send yourself from the Volt UI. There is no send/archive/reply
tool exposed here, on purpose (see CLAUDE.md's non-negotiables: AI drafting
is on-demand only, never automatic).

This server is a thin proxy. It holds no credentials and does no
encryption itself — every tool call is just an HTTP request to your
already-running Volt backend, which must be unlocked (`POST
/api/vault/unlock`) for any of this to return real data.

## Setup

```bash
cd mcp-server
bun install
```

Point it at your running backend (defaults to `http://localhost:8080`):

```bash
export VOLT_API_URL=http://localhost:8080
```

### Claude Code

```bash
claude mcp add volt -- bun run --cwd /absolute/path/to/volt/mcp-server src/index.ts
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "volt": {
      "command": "bun",
      "args": ["run", "--cwd", "/absolute/path/to/volt/mcp-server", "src/index.ts"],
      "env": { "VOLT_API_URL": "http://localhost:8080" }
    }
  }
}
```

### Verify it's working

Ask your MCP client something like "summarize my last 5 unread emails
using Volt" — it should call `list_inbox`, then `get_thread` on the
relevant threads, and answer from real data. If it instead reports a
`vault_locked` or `not_connected` error, unlock the vault or connect Gmail
in the Volt UI first.

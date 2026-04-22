#!/usr/bin/env node
/**
 * Yappaflow MCP server — HTTP transport.
 *
 * One process exposes the full tool set:
 *   - extract_design_dna(url)                  Phase 0/1
 *   - search_references(brief, k)              Phase 2
 *   - classify_brief(transcript)               Phase 3
 *   - rank_references(brief, references)       Phase 4
 *   - merge_dna(references, blend)             Phase 4
 *   - build_site(brief, mergedDna, content, platform)  Phase 5
 *
 * Deploy target: Railway. Healthcheck: GET /health. MCP: POST /mcp (streamable HTTP).
 */

import express, { type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { loadConfig, assertAuth } from "../config.js";
import { buildToolRegistry } from "./tools.js";
import { closeBrowser } from "../browser.js";
import { DnaCache } from "../cache.js";

async function main() {
  const config = loadConfig();
  const cache = new DnaCache(config.cachePath);
  const registry = buildToolRegistry(config, cache);

  const app = express();
  app.use(express.json({ limit: "4mb" }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      version: "0.0.1",
      offlineMode: config.offlineMode,
      tools: registry.toolNames(),
      cacheSizeBytes: 0,
    });
  });

  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      assertAuth(config, req.header("authorization"));
    } catch (err) {
      res.status((err as Error & { statusCode?: number }).statusCode ?? 401).json({
        error: (err as Error).message,
      });
      return;
    }
    const sessionId = req.header("mcp-session-id");
    let transport: StreamableHTTPServerTransport | undefined = sessionId
      ? transports.get(sessionId)
      : undefined;

    if (!transport) {
      const newId = randomUUID();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newId,
        onsessioninitialized: (id) => {
          transports.set(id, transport!);
        },
      });
      transport.onclose = () => {
        if (transport && transport.sessionId) transports.delete(transport.sessionId);
      };
      const server = buildMcpServer(registry);
      await server.connect(transport);
    }

    await transport.handleRequest(req, res, req.body);
  });

  /**
   * /rpc/:tool — REST mirror of each registered tool.
   *
   * The main Yappaflow server calls this instead of speaking MCP JSON-RPC
   * just to invoke a tool it already owns. Same auth, same tool registry,
   * simpler wire protocol: POST JSON body in, JSON result out.
   */
  app.post("/rpc/:tool", async (req: Request, res: Response) => {
    try {
      assertAuth(config, req.header("authorization"));
    } catch (err) {
      res.status((err as Error & { statusCode?: number }).statusCode ?? 401).json({
        error: (err as Error).message,
      });
      return;
    }
    const toolName = typeof req.params.tool === "string" ? req.params.tool : "";
    const tool = registry.get(toolName);
    if (!tool) {
      res.status(404).json({ error: `unknown tool: ${toolName || "(missing)"}` });
      return;
    }
    try {
      const out = await tool.handler((req.body ?? {}) as Record<string, unknown>);
      res.json({ ok: true, tool: tool.name, result: out });
    } catch (err) {
      const e = err as Error;
      res.status(500).json({ ok: false, tool: tool.name, error: e.message });
    }
  });

  // MCP also supports GET / DELETE for session management.
  app.get("/mcp", async (req: Request, res: Response) => {
    try {
      assertAuth(config, req.header("authorization"));
    } catch (err) {
      res.status((err as Error & { statusCode?: number }).statusCode ?? 401).end();
      return;
    }
    const sessionId = req.header("mcp-session-id");
    const transport = sessionId ? transports.get(sessionId) : undefined;
    if (!transport) {
      res.status(404).json({ error: "unknown session" });
      return;
    }
    await transport.handleRequest(req, res);
  });

  app.delete("/mcp", async (req: Request, res: Response) => {
    try {
      assertAuth(config, req.header("authorization"));
    } catch (err) {
      res.status((err as Error & { statusCode?: number }).statusCode ?? 401).end();
      return;
    }
    const sessionId = req.header("mcp-session-id");
    const transport = sessionId ? transports.get(sessionId) : undefined;
    if (!transport) {
      res.status(404).end();
      return;
    }
    await transport.handleRequest(req, res);
  });

  const listener = app.listen(config.port, config.host, () => {
    const addr = listener.address();
    const port = typeof addr === "object" && addr ? addr.port : config.port;
    console.log(`[yappaflow-mcp] listening on http://${config.host}:${port}`);
    console.log(
      `[yappaflow-mcp] offline=${config.offlineMode} auth=${config.mcpAuthToken ? "on" : "off"} tools=${registry
        .toolNames()
        .join(",")}`,
    );
  });

  const shutdown = async () => {
    console.log("[yappaflow-mcp] shutting down");
    listener.close();
    await closeBrowser();
    cache.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function buildMcpServer(registry: ReturnType<typeof buildToolRegistry>): Server {
  const server = new Server(
    { name: "yappaflow-mcp", version: "0.0.1" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: registry.list().map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = registry.get(req.params.name);
    if (!tool) {
      return toErrorResult(`unknown tool: ${req.params.name}`);
    }
    try {
      const out = await tool.handler(req.params.arguments ?? {});
      return {
        content: [{ type: "text", text: typeof out === "string" ? out : JSON.stringify(out) }],
        structuredContent: typeof out === "string" ? undefined : (out as Record<string, unknown>),
      } satisfies CallToolResult;
    } catch (err) {
      const e = err as Error;
      return toErrorResult(`${tool.name} failed: ${e.message}`);
    }
  });

  return server;
}

function toErrorResult(message: string): CallToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

main().catch((err) => {
  console.error("[yappaflow-mcp] fatal", err);
  process.exit(1);
});

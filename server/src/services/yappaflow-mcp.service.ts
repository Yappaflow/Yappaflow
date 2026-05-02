/**
 * Thin REST client for the Yappaflow MCP server (apps/yappaflow-mcp).
 *
 * The MCP server exposes each tool twice:
 *   - /mcp           — full Model-Context-Protocol JSON-RPC (for Cowork, Claude Desktop, etc.)
 *   - /rpc/:toolName — same tool registry, plain POST-JSON. We use the REST mirror here
 *                      because this is service-to-service and we don't need session state.
 *
 * Design notes:
 *   - `YAPPAFLOW_MCP_URL` controls where to talk. Empty string ⇒ disabled.
 *   - Bearer token optional; the MCP server only enforces it when `MCP_AUTH_TOKEN` is set.
 *   - One Node 20+ fetch call per invocation, 120s timeout (search_references does 8x
 *     Playwright extractions in parallel and can be slow on cold cache).
 */

import { env } from "../config/env";

export type McpResponse<T> = { ok: true; tool: string; result: T } | { ok: false; tool: string; error: string };

export class YappaflowMcpDisabledError extends Error {
  constructor() {
    super("Yappaflow MCP is not configured (YAPPAFLOW_MCP_URL is empty).");
    this.name = "YappaflowMcpDisabledError";
  }
}

export class YappaflowMcpError extends Error {
  constructor(public readonly tool: string, public readonly statusCode: number, msg: string) {
    super(msg);
    this.name = "YappaflowMcpError";
  }
}

function isEnabled(): boolean {
  return Boolean(env.yappaflowMcpUrl && env.yappaflowMcpUrl.trim().length > 0);
}

async function callTool<TResult>(toolName: string, body: Record<string, unknown>): Promise<TResult> {
  if (!isEnabled()) throw new YappaflowMcpDisabledError();
  const url = `${env.yappaflowMcpUrl.replace(/\/+$/, "")}/rpc/${toolName}`;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (env.yappaflowMcpToken) headers.authorization = `Bearer ${env.yappaflowMcpToken}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    throw new YappaflowMcpError(toolName, 0, `fetch failed: ${(err as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }

  const rawText = await res.text();
  let parsed: McpResponse<TResult> | null = null;
  try {
    parsed = JSON.parse(rawText) as McpResponse<TResult>;
  } catch {
    throw new YappaflowMcpError(toolName, res.status, `non-JSON response: ${rawText.slice(0, 200)}`);
  }

  if (!res.ok || !parsed.ok) {
    throw new YappaflowMcpError(
      toolName,
      res.status,
      !parsed.ok ? parsed.error : `status ${res.status}`,
    );
  }
  return parsed.result;
}

// ── Typed wrappers per tool ────────────────────────────────────────────
// Loose types on purpose — the MCP server owns the source-of-truth schemas. We keep the
// edge types narrow enough to consume but don't duplicate the DNA shape here.

export type Brief = {
  industry: string;
  subcategory: string;
  audience: string;
  content_model: string[];
  palette_character: string;
  motion_ambition: string;
  grid_archetype:
    | "asymmetric_editorial"
    | "centered_marketing"
    | "full_bleed_product"
    | "dense_dashboard"
    | "split_hero"
    | "any";
  named_comparables: string[];
  tone: string;
  preferred_platform?: "html" | "shopify" | "wordpress" | "ikas" | "webflow";
};

export async function classifyBrief(transcript: string): Promise<Brief> {
  return callTool<Brief>("classify_brief", { transcript });
}

export async function searchReferences(params: { brief: Brief; k?: number }): Promise<unknown[]> {
  return callTool<unknown[]>("search_references", params);
}

export async function buildSiteRpc(params: {
  brief: Brief;
  mergedDna: unknown;
  platform: "html" | "shopify" | "wordpress" | "ikas" | "webflow";
  content?: unknown;
}): Promise<{
  platform: string;
  files: Array<{ path: string; content: string }>;
  summary: string;
  nextSteps: string[];
}> {
  return callTool("build_site", params);
}

export async function buildSiteProjectRpc(params: {
  brief: unknown;
  mergedDna: unknown;
  overrides?: { siteTitle?: string; logoText?: string };
}): Promise<{
  siteProject: unknown;
  summary: string;
  nextSteps: string[];
}> {
  return callTool("build_site_project", params);
}

export async function mergeDnaRpc(params: {
  structure_from: unknown;
  typography_from: unknown;
  motion_from: unknown;
  palette_from: unknown;
  weights?: { structure?: number; typography?: number; motion?: number; palette?: number };
}): Promise<unknown> {
  return callTool("merge_dna", params);
}

export async function mcpHealth(): Promise<{ ok: boolean; offlineMode?: boolean; tools?: string[] }> {
  if (!isEnabled()) throw new YappaflowMcpDisabledError();
  const res = await fetch(`${env.yappaflowMcpUrl.replace(/\/+$/, "")}/health`);
  if (!res.ok) throw new YappaflowMcpError("health", res.status, `status ${res.status}`);
  return (await res.json()) as { ok: boolean; offlineMode?: boolean; tools?: string[] };
}

export function isMcpEnabled(): boolean {
  return isEnabled();
}

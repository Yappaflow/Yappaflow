/**
 * /reference/* — agency-facing endpoints for the design-reference-driven pipeline.
 *
 * Wraps the MCP tools (classify_brief → search_references → build_site) so the web
 * UI doesn't have to talk MCP directly. Auth: same bearer JWT the rest of the API
 * uses.
 *
 * Endpoints:
 *   GET  /reference/health          — MCP reachability check
 *   POST /reference/classify        — chat transcript → structured brief
 *   POST /reference/search          — brief → ranked references (runs Playwright × Exa)
 *   POST /reference/build           — brief + merged DNA + platform → site files
 *
 * All routes return JSON. Errors surface as { error, detail } with the right status.
 */

import express from "express";
import { verifyToken } from "../services/jwt.service";
import {
  classifyBrief,
  searchReferences,
  buildSiteRpc,
  mergeDnaRpc,
  mcpHealth,
  YappaflowMcpDisabledError,
  YappaflowMcpError,
  isMcpEnabled,
  type Brief,
} from "../services/yappaflow-mcp.service";

const router: express.Router = express.Router();

function requireAuth(req: express.Request, res: express.Response): string | null {
  const h = req.headers.authorization;
  const raw = h?.startsWith("Bearer ") ? h.slice(7) : undefined;
  if (!raw) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  try {
    return verifyToken(raw).userId;
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return null;
  }
}

function handleMcpError(res: express.Response, err: unknown) {
  if (err instanceof YappaflowMcpDisabledError) {
    res.status(503).json({ error: "Reference pipeline is not configured on this environment." });
    return;
  }
  if (err instanceof YappaflowMcpError) {
    res.status(502).json({ error: `Reference pipeline failed (${err.tool})`, detail: err.message });
    return;
  }
  const e = err as Error;
  res.status(500).json({ error: "Internal error", detail: e.message });
}

// ── GET /reference/health ──────────────────────────────────────────────
router.get("/health", async (_req, res) => {
  if (!isMcpEnabled()) {
    res.status(503).json({ ok: false, configured: false });
    return;
  }
  try {
    const health = await mcpHealth();
    res.json({ ok: true, configured: true, mcp: health });
  } catch (err) {
    handleMcpError(res, err);
  }
});

// ── POST /reference/classify ───────────────────────────────────────────
router.post("/classify", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const transcript = typeof req.body?.transcript === "string" ? req.body.transcript : "";
  if (!transcript.trim()) {
    res.status(400).json({ error: "transcript is required" });
    return;
  }
  try {
    const brief = await classifyBrief(transcript);
    res.json({ brief });
  } catch (err) {
    handleMcpError(res, err);
  }
});

// ── POST /reference/search ─────────────────────────────────────────────
router.post("/search", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const brief = req.body?.brief as Brief | undefined;
  const k = typeof req.body?.k === "number" ? req.body.k : 8;
  if (!brief) {
    res.status(400).json({ error: "brief is required" });
    return;
  }
  try {
    const refs = await searchReferences({ brief, k });
    res.json({ references: refs });
  } catch (err) {
    handleMcpError(res, err);
  }
});

// ── POST /reference/build ──────────────────────────────────────────────
/**
 * Body: { brief, selection: { structure, typography, motion, palette } | mergedDna, platform, content? }
 * If `selection` is provided, we call merge_dna first. If `mergedDna` is provided, we
 * skip the merge. This lets the UI either pick-and-assemble on-the-fly or hand back
 * a previously computed merged DNA.
 */
router.post("/build", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const brief = req.body?.brief as Brief | undefined;
  const platform = req.body?.platform as "html" | "shopify" | "wordpress" | "ikas" | "webflow" | undefined;
  const content = req.body?.content;
  if (!brief || !platform) {
    res.status(400).json({ error: "brief and platform are required" });
    return;
  }
  let mergedDna = req.body?.mergedDna as unknown;
  try {
    if (!mergedDna) {
      const sel = req.body?.selection;
      if (!sel?.structure || !sel?.typography || !sel?.motion || !sel?.palette) {
        res.status(400).json({ error: "selection.{structure,typography,motion,palette} required when mergedDna is not passed" });
        return;
      }
      mergedDna = await mergeDnaRpc({
        structure_from: sel.structure,
        typography_from: sel.typography,
        motion_from: sel.motion,
        palette_from: sel.palette,
        weights: req.body?.weights,
      });
    }
    const out = await buildSiteRpc({ brief, mergedDna, platform, content });
    res.json(out);
  } catch (err) {
    handleMcpError(res, err);
  }
});

export default router;

/**
 * /deploy/* — Deploy Hub routes.
 *
 * Custom-platform flow (static HTML/CSS/JS):
 *   POST  /deploy/custom/start                    — create/find Project for a Signal
 *   POST  /deploy/custom/:projectId/extract       — run identity extraction
 *   GET   /deploy/custom/:projectId               — read back project state
 *   GET   /deploy/custom/check-domain?name=…      — WHOIS availability probe
 *   GET   /deploy/custom/namecheap-url?name=…     — deep-link builder
 *   POST  /deploy/custom/:projectId/build         — kick off static-site generation
 *   POST  /deploy/custom/:projectId/confirm-purchase — record bought domain
 *   GET   /deploy/custom/:projectId/download      — stream ZIP
 *
 * Shopify-platform flow (one-click import bundle):
 *   POST  /deploy/shopify/start                    — create/find Project for a Signal
 *   POST  /deploy/shopify/:projectId/extract       — run identity extraction (same as custom)
 *   GET   /deploy/shopify/:projectId               — read back project state
 *   POST  /deploy/shopify/:projectId/build         — generate Liquid theme + products.csv
 *   GET   /deploy/shopify/:projectId/download      — stream ZIP (theme/ + products.csv + README)
 *   POST  /deploy/shopify/:projectId/publish       — push bundle directly to connected store
 *   GET   /deploy/shopify/connection               — read the user's Shopify connection
 */

import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { env } from "../config/env";
import { Project } from "../models/Project.model";
import {
  extractBusinessIdentity,
  findOrCreateProjectForSignal,
  findOrCreateProjectForSignalOnPlatform,
} from "../services/business-identity.service";
import { generateStaticSite } from "../services/static-site-generator.service";
import { generateShopifyBundle } from "../services/shopify-generator.service";
import {
  buildAdminClients,
  pushShopifyBundle,
} from "../services/shopify-admin.service";
import { PlatformConnection } from "../models/PlatformConnection.model";
import { decryptAccessToken } from "../services/encryption.service";
import { checkDomainAvailability, isValidDomain } from "../services/domain-availability.service";
import { buildNamecheapUrl } from "../services/namecheap-url.service";
import { buildProjectZip } from "../services/zip-export.service";
import { log, logError } from "../utils/logger";

const router: import("express").Router = Router();

function getUserId(authHeader?: string): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(authHeader.slice(7), env.jwtSecret) as { userId?: string };
    return payload.userId ?? null;
  } catch {
    return null;
  }
}

function requireAuth(req: any, res: any): string | null {
  const userId = getUserId(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return userId;
}

function isValidObjectId(id: string): boolean {
  return mongoose.isValidObjectId(id);
}

// ── Start: find/create Project for a Signal ──────────────────────────────────
router.post("/custom/start", async (req, res) => {
  const agencyId = requireAuth(req, res);
  if (!agencyId) return;

  try {
    const { signalId } = req.body ?? {};
    if (!signalId || !isValidObjectId(signalId)) {
      return res.status(400).json({ error: "signalId is required" });
    }

    const projectId = await findOrCreateProjectForSignal(signalId, agencyId);
    return res.json({ projectId });
  } catch (err) {
    logError("deploy/custom/start failed", err);
    return res.status(500).json({ error: (err as Error).message || "Failed to start deploy" });
  }
});

// ── Domain availability via WHOIS ────────────────────────────────────────────
//    NOTE: must be registered BEFORE /custom/:projectId so Express doesn't
//    treat "check-domain" as a projectId parameter.
router.get("/custom/check-domain", async (req, res) => {
  const agencyId = requireAuth(req, res);
  if (!agencyId) return;

  const name = (req.query.name as string || "").trim().toLowerCase();
  if (!name) return res.status(400).json({ error: "name query param required" });

  if (!isValidDomain(name)) {
    return res.json({ available: null, reason: "invalid" });
  }

  try {
    const result = await checkDomainAvailability(name);
    return res.json(result);
  } catch (err) {
    logError("deploy/custom/check-domain failed", err);
    return res.json({ available: null, reason: "unknown" });
  }
});

// ── Namecheap deep-link ──────────────────────────────────────────────────────
router.get("/custom/namecheap-url", (req, res) => {
  const agencyId = requireAuth(req, res);
  if (!agencyId) return;

  const name = (req.query.name as string || "").trim().toLowerCase();
  if (!name || !isValidDomain(name)) {
    return res.status(400).json({ error: "valid domain name required" });
  }

  return res.json({ url: buildNamecheapUrl(name) });
});

// ── Hostinger affiliate URL (no lookup, just config) ─────────────────────────
router.get("/custom/hostinger-url", (req, res) => {
  const agencyId = requireAuth(req, res);
  if (!agencyId) return;
  return res.json({ url: env.hostingerAffiliateUrl });
});

// ── Extract business identity from the Signal's chat ─────────────────────────
router.post("/custom/:projectId/extract", async (req, res) => {
  const agencyId = requireAuth(req, res);
  if (!agencyId) return;

  const { projectId } = req.params;
  if (!isValidObjectId(projectId)) {
    return res.status(400).json({ error: "Invalid projectId" });
  }

  try {
    const project = await Project.findOne({ _id: projectId, agencyId });
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (!project.signalId) return res.status(400).json({ error: "Project has no linked signal" });

    const identity = await extractBusinessIdentity(project.signalId.toString(), agencyId);
    await Project.findByIdAndUpdate(projectId, {
      identity,
      clientName: identity.businessName,
      name:       `${identity.businessName} — Custom Deploy`,
      progress:   30,
    });

    return res.json({ identity });
  } catch (err) {
    logError("deploy/custom/extract failed", err);
    return res.status(500).json({ error: (err as Error).message || "Extraction failed" });
  }
});

// ── Read project state (for polling build status / identity) ─────────────────
router.get("/custom/:projectId", async (req, res) => {
  const agencyId = requireAuth(req, res);
  if (!agencyId) return;

  const { projectId } = req.params;
  if (!isValidObjectId(projectId)) {
    return res.status(400).json({ error: "Invalid projectId" });
  }

  try {
    const project = await Project.findOne({ _id: projectId, agencyId }).lean();
    if (!project) return res.status(404).json({ error: "Project not found" });

    return res.json({
      projectId:       (project as any)._id.toString(),
      phase:           (project as any).phase,
      progress:        (project as any).progress,
      identity:        (project as any).identity ?? null,
      buildJobStatus:  (project as any).buildJobStatus ?? null,
      buildFilesDone:  (project as any).buildFilesDone ?? 0,
      buildFilesTotal: (project as any).buildFilesTotal ?? 0,
      buildError:      (project as any).buildError ?? null,
      domainPurchased: (project as any).domainPurchased ?? null,
      liveUrl:         (project as any).liveUrl ?? null,
    });
  } catch (err) {
    logError("deploy/custom/:projectId GET failed", err);
    return res.status(500).json({ error: "Failed to load project" });
  }
});

// ── Kick off static-site generation (fire-and-forget; poll build status) ─────
router.post("/custom/:projectId/build", async (req, res) => {
  const agencyId = requireAuth(req, res);
  if (!agencyId) return;

  const { projectId } = req.params;
  if (!isValidObjectId(projectId)) {
    return res.status(400).json({ error: "Invalid projectId" });
  }

  try {
    const project = await Project.findOne({ _id: projectId, agencyId });
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (!project.identity) {
      return res.status(400).json({ error: "No identity on project — extract first" });
    }

    // Idempotency: if already running, return current status.
    if (project.buildJobStatus === "running") {
      return res.json({ status: "running", message: "Build already in progress" });
    }

    await Project.findByIdAndUpdate(projectId, { buildJobStatus: "pending" });

    // Fire-and-forget. The endpoint returns immediately; client polls GET /custom/:projectId.
    generateStaticSite(projectId, agencyId)
      .then((result) => log(`✅ Build done for ${projectId}: ${result.filesCreated} files`))
      .catch((err) => logError(`❌ Build failed for ${projectId}`, err));

    return res.json({ status: "started" });
  } catch (err) {
    logError("deploy/custom/build failed", err);
    return res.status(500).json({ error: (err as Error).message || "Build failed to start" });
  }
});

// ── Confirm the domain the agency actually purchased on Namecheap ────────────
router.post("/custom/:projectId/confirm-purchase", async (req, res) => {
  const agencyId = requireAuth(req, res);
  if (!agencyId) return;

  const { projectId } = req.params;
  if (!isValidObjectId(projectId)) {
    return res.status(400).json({ error: "Invalid projectId" });
  }

  const { domain } = req.body ?? {};
  if (!domain || typeof domain !== "string" || !isValidDomain(domain)) {
    return res.status(400).json({ error: "Valid domain is required" });
  }

  try {
    const cleanDomain = domain.trim().toLowerCase();
    const updated = await Project.findOneAndUpdate(
      { _id: projectId, agencyId },
      {
        domainPurchased: cleanDomain,
        liveUrl:         `https://${cleanDomain}`,
        progress:        90,
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Project not found" });

    return res.json({ domainPurchased: cleanDomain, liveUrl: updated.liveUrl });
  } catch (err) {
    logError("deploy/custom/confirm-purchase failed", err);
    return res.status(500).json({ error: "Failed to record purchase" });
  }
});

// ── Stream ZIP of all generated artifacts ────────────────────────────────────
router.get("/custom/:projectId/download", async (req, res) => {
  const agencyId = requireAuth(req, res);
  if (!agencyId) return;

  const { projectId } = req.params;
  if (!isValidObjectId(projectId)) {
    return res.status(400).json({ error: "Invalid projectId" });
  }

  try {
    const project = await Project.findOne({ _id: projectId, agencyId }).lean();
    if (!project) return res.status(404).json({ error: "Project not found" });

    const baseName =
      (project as any).domainPurchased?.split(".")[0] ||
      (project as any).identity?.businessName ||
      "site";

    const { buffer, fileName, fileCount } = await buildProjectZip(projectId, agencyId, { baseName });

    await Project.findByIdAndUpdate(projectId, {
      downloadedAt: new Date(),
      phase:        "live",
      progress:     100,
    });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("X-File-Count", String(fileCount));
    return res.send(buffer);
  } catch (err) {
    logError("deploy/custom/download failed", err);
    return res.status(500).json({ error: (err as Error).message || "Download failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Shopify one-click import flow
// ─────────────────────────────────────────────────────────────────────────────

// Start: create/find a shopify-platform Project for a Signal.
router.post("/shopify/start", async (req, res) => {
  const agencyId = requireAuth(req, res);
  if (!agencyId) return;

  try {
    const { signalId } = req.body ?? {};
    if (!signalId || !isValidObjectId(signalId)) {
      return res.status(400).json({ error: "signalId is required" });
    }

    const projectId = await findOrCreateProjectForSignalOnPlatform(signalId, agencyId, "shopify");
    return res.json({ projectId });
  } catch (err) {
    logError("deploy/shopify/start failed", err);
    return res.status(500).json({ error: (err as Error).message || "Failed to start shopify deploy" });
  }
});

// Extract identity — reuses the same extractor as custom, just persists it
// against the shopify-platform Project. Kept separate so the client doesn't
// have to guess which /extract to call based on route context.
router.post("/shopify/:projectId/extract", async (req, res) => {
  const agencyId = requireAuth(req, res);
  if (!agencyId) return;

  const { projectId } = req.params;
  if (!isValidObjectId(projectId)) {
    return res.status(400).json({ error: "Invalid projectId" });
  }

  try {
    const project = await Project.findOne({ _id: projectId, agencyId, platform: "shopify" });
    if (!project) return res.status(404).json({ error: "Shopify project not found" });
    if (!project.signalId) return res.status(400).json({ error: "Project has no linked signal" });

    const identity = await extractBusinessIdentity(project.signalId.toString(), agencyId);
    await Project.findByIdAndUpdate(projectId, {
      identity,
      clientName: identity.businessName,
      name:       `${identity.businessName} — Shopify Deploy`,
      progress:   30,
    });

    return res.json({ identity });
  } catch (err) {
    logError("deploy/shopify/extract failed", err);
    return res.status(500).json({ error: (err as Error).message || "Extraction failed" });
  }
});

// Read project state — mirror of the custom GET, scoped to shopify.
router.get("/shopify/:projectId", async (req, res) => {
  const agencyId = requireAuth(req, res);
  if (!agencyId) return;

  const { projectId } = req.params;
  if (!isValidObjectId(projectId)) {
    return res.status(400).json({ error: "Invalid projectId" });
  }

  try {
    const project = await Project.findOne({ _id: projectId, agencyId, platform: "shopify" }).lean();
    if (!project) return res.status(404).json({ error: "Shopify project not found" });

    return res.json({
      projectId:       (project as any)._id.toString(),
      platform:        "shopify",
      phase:           (project as any).phase,
      progress:        (project as any).progress,
      identity:        (project as any).identity ?? null,
      buildJobStatus:  (project as any).buildJobStatus ?? null,
      buildFilesDone:  (project as any).buildFilesDone ?? 0,
      buildFilesTotal: (project as any).buildFilesTotal ?? 0,
      buildError:      (project as any).buildError ?? null,
    });
  } catch (err) {
    logError("deploy/shopify/:projectId GET failed", err);
    return res.status(500).json({ error: "Failed to load project" });
  }
});

// Kick off Shopify bundle generation (Liquid theme + products.csv).
router.post("/shopify/:projectId/build", async (req, res) => {
  const agencyId = requireAuth(req, res);
  if (!agencyId) return;

  const { projectId } = req.params;
  if (!isValidObjectId(projectId)) {
    return res.status(400).json({ error: "Invalid projectId" });
  }

  try {
    const project = await Project.findOne({ _id: projectId, agencyId, platform: "shopify" });
    if (!project) return res.status(404).json({ error: "Shopify project not found" });
    if (!project.identity) {
      return res.status(400).json({ error: "No identity on project — extract first" });
    }

    if (project.buildJobStatus === "running") {
      return res.json({ status: "running", message: "Build already in progress" });
    }

    await Project.findByIdAndUpdate(projectId, { buildJobStatus: "pending" });

    generateShopifyBundle(projectId, agencyId)
      .then((result) => log(`✅ Shopify build done for ${projectId}: ${result.filesCreated} files`))
      .catch((err) => logError(`❌ Shopify build failed for ${projectId}`, err));

    return res.json({ status: "started" });
  } catch (err) {
    logError("deploy/shopify/build failed", err);
    return res.status(500).json({ error: (err as Error).message || "Build failed to start" });
  }
});

// Download the complete Shopify bundle as a single ZIP.
//
// The ZIP contains:
//   /README.txt                 — upload instructions
//   /theme/…                    — the full Liquid theme (zip the contents for upload)
//   /products.csv               — Shopify-Admin-importable catalog (when products exist)
router.get("/shopify/:projectId/download", async (req, res) => {
  const agencyId = requireAuth(req, res);
  if (!agencyId) return;

  const { projectId } = req.params;
  if (!isValidObjectId(projectId)) {
    return res.status(400).json({ error: "Invalid projectId" });
  }

  try {
    const project = await Project.findOne({ _id: projectId, agencyId, platform: "shopify" }).lean();
    if (!project) return res.status(404).json({ error: "Shopify project not found" });

    const baseName =
      (project as any).identity?.businessName
        ? `${(project as any).identity.businessName}-shopify`
        : "shopify-bundle";

    const { buffer, fileName, fileCount } = await buildProjectZip(projectId, agencyId, {
      baseName,
      repack:  "shopify",
    });

    await Project.findByIdAndUpdate(projectId, {
      downloadedAt: new Date(),
      phase:        "live",
      progress:     100,
    });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("X-File-Count", String(fileCount));
    return res.send(buffer);
  } catch (err) {
    logError("deploy/shopify/download failed", err);
    return res.status(500).json({ error: (err as Error).message || "Download failed" });
  }
});

// Read the connected Shopify store for this user (so the frontend knows
// whether to show "Connect Shopify" vs "Publish to {shop}").
router.get("/shopify/connection", async (req, res) => {
  const agencyId = requireAuth(req, res);
  if (!agencyId) return;

  try {
    const conn = await PlatformConnection.findOne({ userId: agencyId, platform: "shopify" });
    if (!conn) return res.json({ connected: false });
    return res.json({
      connected:  true,
      shopDomain: conn.shopDomain ?? null,
      scopes:     conn.shopifyScopes ?? null,
      isActive:   conn.isActive,
    });
  } catch (err) {
    logError("deploy/shopify/connection failed", err);
    return res.status(500).json({ error: (err as Error).message || "Failed to read connection" });
  }
});

// Push the already-built Shopify bundle directly to the merchant's store.
//
// Prerequisites:
//   1. `POST /deploy/shopify/:id/build` has completed (GeneratedArtifact rows
//      exist with platform="shopify").
//   2. The user has completed `GET /auth/shopify/authorize` at least once,
//      so a `PlatformConnection` row with a decryptable access token exists.
//
// On success, returns `{ themeId, themeName, themeFiles, productsCreated }`.
// On failure, the persisted artifacts are untouched so the agency can still
// fall back to the manual ZIP route.
router.post("/shopify/:projectId/publish", async (req, res) => {
  const agencyId = requireAuth(req, res);
  if (!agencyId) return;

  const { projectId } = req.params;
  if (!isValidObjectId(projectId)) {
    return res.status(400).json({ error: "Invalid projectId" });
  }

  try {
    const project = await Project.findOne({ _id: projectId, agencyId, platform: "shopify" });
    if (!project) return res.status(404).json({ error: "Shopify project not found" });

    const conn = await PlatformConnection.findOne({ userId: agencyId, platform: "shopify" });
    if (!conn || !conn.shopDomain || !conn.isActive) {
      return res
        .status(409)
        .json({ error: "No active Shopify connection — run /auth/shopify/authorize first" });
    }

    const accessToken = decryptAccessToken({
      accessToken:       conn.accessToken,
      accessTokenIv:     conn.accessTokenIv,
      accessTokenKeyId:  conn.accessTokenKeyId,
      userId:            conn.userId,
    });

    const clients = buildAdminClients({
      shopDomain:  conn.shopDomain,
      accessToken,
      apiVersion:  env.shopifyApiVersion,
    });

    const result = await pushShopifyBundle({
      agencyId,
      projectId,
      clients,
    });

    await Project.findByIdAndUpdate(projectId, {
      phase:    "live",
      progress: 100,
    });

    log(
      `✅ Shopify publish done for ${projectId}: theme ${result.themeId} (${result.themeFiles} files), ` +
      `${result.productsCreated} products`
    );

    return res.json({
      ok:         true,
      shopDomain: conn.shopDomain,
      ...result,
      // Convenience: deep-links the agency can hand the merchant.
      previewUrl: `https://${conn.shopDomain}/admin/themes/${result.themeId}/editor`,
    });
  } catch (err) {
    logError("deploy/shopify/publish failed", err);
    return res.status(500).json({ error: (err as Error).message || "Publish failed" });
  }
});

export default router;

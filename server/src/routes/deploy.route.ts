/**
 * /deploy/custom/* — Deploy Hub Custom flow routes.
 *
 * Flow:
 *   POST  /deploy/custom/start                    — create/find Project for a Signal
 *   POST  /deploy/custom/:projectId/extract        — run identity extraction
 *   GET   /deploy/custom/:projectId                — read back project state (identity, build)
 *   GET   /deploy/custom/check-domain?name=…      — WHOIS availability probe
 *   GET   /deploy/custom/namecheap-url?name=…     — deep-link builder
 *   POST  /deploy/custom/:projectId/build          — kick off static-site generation
 *   POST  /deploy/custom/:projectId/confirm-purchase — record bought domain
 *   GET   /deploy/custom/:projectId/download       — stream ZIP
 */

import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { env } from "../config/env";
import { Project } from "../models/Project.model";
import { extractBusinessIdentity, findOrCreateProjectForSignal } from "../services/business-identity.service";
import { generateStaticSite } from "../services/static-site-generator.service";
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

export default router;

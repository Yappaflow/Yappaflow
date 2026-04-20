/**
 * WordPress webhook / maintenance endpoints.
 *
 * Unlike Shopify, WordPress itself doesn't ship a mandatory webhook contract
 * — there's no "app/uninstalled" or "shop/redact" the way Shopify's Partner
 * program requires. Self-hosted WP has no standard webhook framework at
 * all, and WP.com's OAuth apps only fire deauthorization callbacks when the
 * developer opts in.
 *
 * What this router handles:
 *
 *   POST /webhook/wordpress/deauthorize
 *        Optional WP.com deauthorization callback. If a dev configures their
 *        WP.com app with a deauthorization URL, WP.com POSTs {user_id,
 *        blog_id} here when the merchant removes the app. We look up the
 *        matching PlatformConnection and tear it down.
 *
 *   POST /webhook/wordpress/disconnect
 *        First-party: called from the Yappaflow frontend when the agency
 *        clicks "Disconnect WordPress" — removes the stored token + site.
 *        Authed via Yappaflow JWT (Bearer | cookie | ?token=).
 *
 *   GET  /webhook/wordpress/heartbeat
 *        Public liveness probe — lets Deploy Hub's "is this webhook URL
 *        reachable?" preflight succeed without spoofing a signed payload.
 */

import express, { Request, Response } from "express";
import { PlatformConnection } from "../models/PlatformConnection.model";
import { verifyToken } from "../services/jwt.service";
import { log, logError } from "../utils/logger";

const router: express.Router = express.Router();

function getUserIdFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;
  const cookieToken = (req as unknown as { cookies?: Record<string, string> }).cookies?.token;
  const token = bearer ?? queryToken ?? cookieToken;
  if (!token) return null;
  try {
    return verifyToken(token).userId;
  } catch {
    return null;
  }
}

// ── Liveness probe ──────────────────────────────────────────────────────────

router.get("/heartbeat", (_req: Request, res: Response): void => {
  res.json({ ok: true, platform: "wordpress" });
});

// ── WP.com deauthorization callback ─────────────────────────────────────────
//
// WP.com's Authorize/Deauthorize flow:
//   https://developer.wordpress.com/docs/oauth2/#app-uninstallation
// The POST body is form-encoded and contains `blog_id` + `user_id` (as seen
// on WP.com's side, which is NOT the same as our Yappaflow userId). We
// match by `wordpressSiteId` instead.
//
// No signature to verify — WP.com's docs don't define one. Safe because the
// handler is idempotent (deletes a connection if it exists, no-op if not).

router.post(
  "/deauthorize",
  express.urlencoded({ extended: false }),
  async (req: Request, res: Response): Promise<void> => {
    const body = (req.body ?? {}) as {
      blog_id?: string | number;
      user_id?: string | number;
      access_token?: string;
    };
    const blogId = body.blog_id != null ? String(body.blog_id) : "";

    if (!blogId) {
      // Acknowledge anyway so WP.com doesn't retry forever.
      res.status(200).send("ok");
      return;
    }

    try {
      const result = await PlatformConnection.deleteOne({
        platform:         "wordpress",
        wordpressFlavor:  "dotcom",
        wordpressSiteId:  blogId,
      });
      log(
        `🧹 WordPress.com deauthorize blog ${blogId} — ` +
        `removed ${result.deletedCount ?? 0} connection(s)`
      );
    } catch (err) {
      logError(`WordPress.com deauthorize handler error for blog ${blogId}`, err);
    }
    res.status(200).send("ok");
  }
);

// ── First-party disconnect ──────────────────────────────────────────────────

router.post("/disconnect", async (req: Request, res: Response): Promise<void> => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized — Yappaflow login required" });
    return;
  }

  try {
    const result = await PlatformConnection.deleteOne({
      userId,
      platform: "wordpress",
    });
    log(
      `🧹 WordPress disconnect by user ${userId} — ` +
      `removed ${result.deletedCount ?? 0} connection(s)`
    );
    res.json({ ok: true, removed: result.deletedCount ?? 0 });
  } catch (err) {
    logError(`WordPress disconnect handler error for user ${userId}`, err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

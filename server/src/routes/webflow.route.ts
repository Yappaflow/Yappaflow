/**
 * Webflow OAuth + push endpoints.
 *
 * GET  /auth/webflow/config-status
 *      Public — tells the frontend whether Webflow OAuth is configured here.
 *
 * GET  /auth/webflow/authorize
 *      Requires a Yappaflow JWT (Authorization: Bearer … or ?token= query).
 *      Redirects the browser to Webflow's install screen.
 *
 * GET  /auth/webflow/callback
 *      Webflow's redirect. Verifies our HMAC'd state, exchanges the code
 *      for a Data API access token, introspects it, and persists it
 *      (encrypted) on a `PlatformConnection` row scoped to the user.
 *
 * POST /webflow/push
 *      Requires a Yappaflow JWT. Body: { projectId, siteId?, publish? }.
 *      Looks up the stored Webflow connection for the caller, decrypts the
 *      token, and pushes the generated bundle to Webflow Ecommerce / CMS.
 *      Mirrors the Shopify `/push` flow we're also in-flight on.
 */

import express, { Request, Response } from "express";
import crypto from "crypto";
import {
  getWebflowAuthUrl,
  exchangeCodeForAccessToken,
  introspectAuthorizedToken,
} from "../services/webflow-auth.service";
import {
  buildWebflowClients,
  listSites,
  pushWebflowBundle,
} from "../services/webflow-admin.service";
import { PlatformConnection } from "../models/PlatformConnection.model";
import { encryptAccessToken, decryptAccessToken } from "../services/encryption.service";
import { verifyToken } from "../services/jwt.service";
import { env } from "../config/env";
import { log, logError } from "../utils/logger";

const router: express.Router = express.Router();

// ── State helpers (identical shape to the Shopify route) ─────────────────────

function buildState(userId: string): string {
  const nonce   = crypto.randomBytes(12).toString("hex");
  const payload = `${userId}:${nonce}`;
  const sig     = crypto.createHmac("sha256", env.jwtSecret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`, "utf8").toString("base64url");
}

function parseState(state: string): { userId: string } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;
    const [userId, nonce, sig] = parts;
    const expected = crypto.createHmac("sha256", env.jwtSecret)
      .update(`${userId}:${nonce}`)
      .digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(sig, "utf8");
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
    return { userId };
  } catch {
    return null;
  }
}

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

// ── Config status ────────────────────────────────────────────────────────────

router.get("/webflow/config-status", (_req: Request, res: Response): void => {
  res.json({
    apiKeyConfigured: Boolean(env.webflowClientId && env.webflowClientSecret),
    siteTokenFallback: Boolean(env.webflowSiteApiToken),
    apiVersion:        env.webflowApiVersion,
    scopes:            env.webflowScopes,
    redirectUri:       env.webflowRedirectUri,
  });
});

// ── Authorize ────────────────────────────────────────────────────────────────

router.get("/webflow/authorize", (req: Request, res: Response): void => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized — Yappaflow login required" });
    return;
  }

  if (!env.webflowClientId) {
    res.status(503).json({ error: "Webflow integration is not configured on this server" });
    return;
  }

  const state = buildState(userId);
  const url   = getWebflowAuthUrl(state);
  res.redirect(url);
});

// ── Callback ─────────────────────────────────────────────────────────────────

router.get("/webflow/callback", async (req: Request, res: Response): Promise<void> => {
  const { code, state } = req.query;
  const codeS  = typeof code  === "string" ? code  : "";
  const stateS = typeof state === "string" ? state : "";

  if (!codeS || !stateS) {
    res.redirect(`${env.frontendUrl}/en/dashboard?view=deploy&webflow=error&reason=missing_params`);
    return;
  }

  // State check — recover userId.
  const parsed = parseState(stateS);
  if (!parsed) {
    res.redirect(`${env.frontendUrl}/en/dashboard?view=deploy&webflow=error&reason=bad_state`);
    return;
  }
  const { userId } = parsed;

  try {
    const { access_token, scope } = await exchangeCodeForAccessToken(codeS);
    const authorized = await introspectAuthorizedToken(access_token);
    const enc = encryptAccessToken(access_token, userId);

    await PlatformConnection.findOneAndUpdate(
      { userId, platform: "webflow" },
      {
        $set: {
          userId,
          platform:            "webflow",
          webflowWorkspaceId:  authorized.workspaceId,
          webflowSiteId:       authorized.siteId,
          webflowScopes:       scope ?? env.webflowScopes,
          ...enc,
          isActive:            true,
        },
      },
      { upsert: true, new: true }
    );

    log(
      `🌐 Webflow OAuth success: user ${userId} connected ` +
      `(workspace ${authorized.workspaceId ?? "?"}, site ${authorized.siteId ?? "?"})`
    );
    res.redirect(
      `${env.frontendUrl}/en/dashboard?view=deploy&webflow=connected` +
      (authorized.siteId ? `&site=${encodeURIComponent(authorized.siteId)}` : "")
    );
  } catch (err) {
    logError("Webflow OAuth callback failed", err);
    res.redirect(`${env.frontendUrl}/en/dashboard?view=deploy&webflow=error&reason=exchange_failed`);
  }
});

// ── Push (pushes the generated bundle to Webflow) ────────────────────────────

router.post("/webflow/push", async (req: Request, res: Response): Promise<void> => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized — Yappaflow login required" });
    return;
  }

  const { projectId, siteId: siteIdFromBody, publish } = (req.body ?? {}) as {
    projectId?: string;
    siteId?:    string;
    publish?:   boolean;
  };
  if (!projectId) {
    res.status(400).json({ error: "projectId is required" });
    return;
  }

  // Prefer the per-user OAuth token; fall back to the server-wide Site API
  // token when the platform hasn't been configured for multi-tenant use.
  const conn = await PlatformConnection.findOne({ userId, platform: "webflow" });
  let accessToken: string | null = null;
  let defaultSiteId: string | undefined;
  if (conn) {
    try {
      accessToken = decryptAccessToken({
        accessToken:      conn.accessToken,
        accessTokenIv:    conn.accessTokenIv,
        accessTokenKeyId: conn.accessTokenKeyId,
        userId:           conn.userId,
      });
      defaultSiteId = conn.webflowSiteId;
    } catch (err) {
      logError(`Webflow token decrypt failed for user ${userId}`, err);
    }
  }
  if (!accessToken && env.webflowSiteApiToken) {
    accessToken = env.webflowSiteApiToken;
  }
  if (!accessToken) {
    res.status(412).json({
      error: "Webflow is not connected for this user — hit /auth/webflow/authorize first, " +
             "or set WEBFLOW_SITE_API_TOKEN for single-tenant use.",
    });
    return;
  }

  const clients = buildWebflowClients({ accessToken });

  // Resolve which site we're pushing to. Explicit > stored default > first
  // site the token can see.
  let siteId = siteIdFromBody ?? defaultSiteId;
  if (!siteId) {
    try {
      const sites = await listSites(clients.http);
      if (sites.length === 0) {
        res.status(412).json({ error: "Webflow token has no sites — create a site first." });
        return;
      }
      siteId = sites[0].id;
    } catch (err) {
      logError("Webflow listSites failed", err);
      res.status(502).json({ error: "Failed to list Webflow sites for this token" });
      return;
    }
  }

  try {
    const result = await pushWebflowBundle({
      agencyId:  userId,                // PlatformConnection is keyed per-user
      projectId,
      siteId,
      clients,
      publish:   publish !== false,
    });
    res.json({ ok: true, result });
  } catch (err) {
    logError("Webflow push failed", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

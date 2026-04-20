/**
 * ikas OAuth + push endpoints.
 *
 * GET  /auth/ikas/config-status
 *      Public — tells the frontend whether ikas OAuth is configured here.
 *
 * GET  /auth/ikas/authorize?store=<name>
 *      Requires a Yappaflow JWT (Authorization: Bearer … or ?token= query).
 *      Redirects the browser to the merchant's ikas install screen at
 *      `https://<store>.myikas.com/admin/oauth/authorize`.
 *
 * GET  /auth/ikas/callback
 *      ikas's redirect. Verifies our HMAC'd state, exchanges the code for
 *      an access + refresh token pair, introspects the merchant, and
 *      persists the connection (access token encrypted) on a
 *      `PlatformConnection` row scoped to the user.
 *
 * POST /auth/ikas/push
 *      Requires a Yappaflow JWT. Body: { projectId, pushTheme?, themeName? }.
 *      Looks up the stored ikas connection for the caller, decrypts the
 *      token, sets up auto-refresh, and pushes the generated bundle to the
 *      merchant's ikas store via the Admin GraphQL API. Mirrors the
 *      Shopify/Webflow /push flow.
 *
 * The state cookie is a URL-safe base64 of `userId:store:nonce:hmac` so the
 * callback can recover the store subdomain without a secondary cookie or
 * server-side session store (same pattern as shopify.route.ts).
 */

import express, { Request, Response } from "express";
import crypto from "crypto";
import {
  isValidStoreName,
  getIkasAuthUrl,
  exchangeCodeForAccessToken,
  refreshAccessToken,
  introspectMerchant,
} from "../services/ikas-auth.service";
import {
  buildIkasClients,
  withAutoRefresh,
  pushIkasBundle,
} from "../services/ikas-admin.service";
import { PlatformConnection } from "../models/PlatformConnection.model";
import { encryptAccessToken, decryptAccessToken } from "../services/encryption.service";
import { verifyToken } from "../services/jwt.service";
import { env } from "../config/env";
import { log, logError } from "../utils/logger";

const router: express.Router = express.Router();

// ── State helpers (encode userId + store so callback can recover both) ──────

function buildState(userId: string, store: string): string {
  const nonce   = crypto.randomBytes(12).toString("hex");
  const payload = `${userId}:${store}:${nonce}`;
  const sig     = crypto.createHmac("sha256", env.jwtSecret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`, "utf8").toString("base64url");
}

function parseState(state: string): { userId: string; store: string } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 4) return null;
    const [userId, store, nonce, sig] = parts;
    const expected = crypto.createHmac("sha256", env.jwtSecret)
      .update(`${userId}:${store}:${nonce}`)
      .digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(sig, "utf8");
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
    return { userId, store };
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

// ── Config status ──────────────────────────────────────────────────────────

router.get("/ikas/config-status", (_req: Request, res: Response): void => {
  res.json({
    apiKeyConfigured: Boolean(env.ikasClientId && env.ikasClientSecret),
    apiBase:          env.ikasApiBase,
    apiVersion:       env.ikasApiVersion,
    scopes:           env.ikasScopes,
    redirectUri:      env.ikasRedirectUri,
  });
});

// ── Authorize ──────────────────────────────────────────────────────────────

router.get("/ikas/authorize", (req: Request, res: Response): void => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized — Yappaflow login required" });
    return;
  }

  const store = typeof req.query.store === "string"
    ? req.query.store.toLowerCase().trim()
    : "";
  if (!store || !isValidStoreName(store)) {
    res.status(400).json({
      error: "`store` query parameter is required — the merchant's ikas store name " +
             "(the `<name>` in `<name>.myikas.com`).",
    });
    return;
  }

  if (!env.ikasClientId) {
    res.status(503).json({ error: "ikas integration is not configured on this server" });
    return;
  }

  const state = buildState(userId, store);
  const url   = getIkasAuthUrl(store, state);
  res.redirect(url);
});

// ── Callback ───────────────────────────────────────────────────────────────

router.get("/ikas/callback", async (req: Request, res: Response): Promise<void> => {
  const { code, state } = req.query;
  const codeS  = typeof code  === "string" ? code  : "";
  const stateS = typeof state === "string" ? state : "";

  if (!codeS || !stateS) {
    res.redirect(`${env.frontendUrl}/en/dashboard?view=deploy&ikas=error&reason=missing_params`);
    return;
  }

  const parsed = parseState(stateS);
  if (!parsed) {
    res.redirect(`${env.frontendUrl}/en/dashboard?view=deploy&ikas=error&reason=bad_state`);
    return;
  }
  const { userId, store } = parsed;

  // Cross-check: ikas sometimes echoes a `storeName` query param. If present
  // and it disagrees with our signed state, abort — the signed state is
  // authoritative. This guards against a replay of someone else's auth code.
  const returnedStore = typeof req.query.storeName === "string"
    ? req.query.storeName.toLowerCase()
    : undefined;
  if (returnedStore && returnedStore !== store) {
    log(`🛑 ikas callback store mismatch: state=${store} returned=${returnedStore}`);
    res.redirect(`${env.frontendUrl}/en/dashboard?view=deploy&ikas=error&reason=store_mismatch`);
    return;
  }

  try {
    const token = await exchangeCodeForAccessToken(store, codeS);
    const identity = await introspectMerchant(store, token.access_token);
    const enc = encryptAccessToken(token.access_token, userId);
    const expiresAt = new Date(Date.now() + token.expires_in * 1000);

    await PlatformConnection.findOneAndUpdate(
      { userId, platform: "ikas" },
      {
        $set: {
          userId,
          platform:            "ikas",
          ikasStoreName:       identity.storeName ?? store,
          ikasMerchantId:      identity.merchantId,
          ikasScopes:          token.scope ?? env.ikasScopes,
          ikasRefreshToken:    token.refresh_token,
          ikasTokenExpiresAt:  expiresAt,
          ...enc,
          isActive:            true,
        },
      },
      { upsert: true, new: true }
    );

    log(
      `🛍  ikas OAuth success: user ${userId} connected to ${store}.myikas.com ` +
      `(merchant ${identity.merchantId ?? "?"})`
    );
    res.redirect(
      `${env.frontendUrl}/en/dashboard?view=deploy&ikas=connected` +
      `&store=${encodeURIComponent(store)}`
    );
  } catch (err) {
    logError("ikas OAuth callback failed", err);
    res.redirect(`${env.frontendUrl}/en/dashboard?view=deploy&ikas=error&reason=exchange_failed`);
  }
});

// ── Push (theme + products to ikas Admin API) ──────────────────────────────

router.post("/ikas/push", async (req: Request, res: Response): Promise<void> => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized — Yappaflow login required" });
    return;
  }

  const { projectId, pushTheme, themeName } = (req.body ?? {}) as {
    projectId?: string;
    pushTheme?: boolean;
    themeName?: string;
  };
  if (!projectId) {
    res.status(400).json({ error: "projectId is required" });
    return;
  }

  const conn = await PlatformConnection.findOne({ userId, platform: "ikas" });
  if (!conn) {
    res.status(412).json({
      error: "ikas is not connected for this user — hit /auth/ikas/authorize?store=<name> first.",
    });
    return;
  }

  let accessToken: string;
  try {
    accessToken = decryptAccessToken({
      accessToken:      conn.accessToken,
      accessTokenIv:    conn.accessTokenIv,
      accessTokenKeyId: conn.accessTokenKeyId,
      userId:           conn.userId,
    });
  } catch (err) {
    logError(`ikas token decrypt failed for user ${userId}`, err);
    res.status(500).json({ error: "Stored ikas token could not be decrypted — reconnect the store" });
    return;
  }

  const store = conn.ikasStoreName;
  if (!store) {
    res.status(500).json({ error: "Stored ikas connection has no storeName — reconnect the store" });
    return;
  }

  // ikas access tokens are short-lived (~1h). Set up an auto-refresh closure
  // so the GraphQL client can swap in a fresh token on 401 and retry once.
  // Every refresh rotates the refresh token, so we persist both back onto
  // the PlatformConnection.
  const baseClients = buildIkasClients({ accessToken });
  const clients = withAutoRefresh(baseClients, async () => {
    if (!conn.ikasRefreshToken) {
      logError("ikas 401 but no refresh_token stored — user must reconnect", new Error("missing refresh_token"));
      return null;
    }
    try {
      const refreshed = await refreshAccessToken(store, conn.ikasRefreshToken);
      const enc = encryptAccessToken(refreshed.access_token, userId);
      await PlatformConnection.findOneAndUpdate(
        { _id: conn._id },
        {
          $set: {
            ...enc,
            ikasRefreshToken:   refreshed.refresh_token,
            ikasTokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
          },
        }
      );
      log(`🔄 ikas access token refreshed for user ${userId} (${store}.myikas.com)`);
      return refreshed.access_token;
    } catch (err) {
      logError("ikas refresh failed", err);
      return null;
    }
  });

  try {
    const result = await pushIkasBundle({
      agencyId:  userId.toString(),
      projectId,
      clients,
      pushTheme: pushTheme !== false,
      themeName,
    });
    res.json({ ok: true, result });
  } catch (err) {
    logError("ikas push failed", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

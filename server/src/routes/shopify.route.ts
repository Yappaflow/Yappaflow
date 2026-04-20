/**
 * Shopify OAuth endpoints.
 *
 * GET  /auth/shopify/authorize?shop=<shop>.myshopify.com
 *      Requires a Yappaflow JWT (Authorization: Bearer … or ?token= query).
 *      Redirects the browser to Shopify's install screen.
 *
 * GET  /auth/shopify/callback
 *      Shopify's redirect. Verifies HMAC + state, exchanges the code for
 *      an Admin API access token, persists it (encrypted) on a
 *      `PlatformConnection` row scoped to the user.
 */

import express, { Request, Response } from "express";
import crypto from "crypto";
import {
  getShopifyAuthUrl,
  isValidShopDomain,
  verifyShopifyHmac,
  exchangeCodeForAccessToken,
} from "../services/shopify-auth.service";
import { PlatformConnection } from "../models/PlatformConnection.model";
import { encryptAccessToken } from "../services/encryption.service";
import { verifyToken } from "../services/jwt.service";
import { env } from "../config/env";
import { log, logError } from "../utils/logger";

const router: express.Router = express.Router();

/**
 * Encode userId into the OAuth `state` so that when Shopify redirects
 * back we can recover the authenticated user even though the redirect
 * lands on a bare GET with no session cookie.
 *
 * The `nonce` prevents replay of an old state; we sign the whole payload
 * with the JWT secret.
 */
function buildState(userId: string, shop: string): string {
  const nonce    = crypto.randomBytes(12).toString("hex");
  const payload  = `${userId}:${shop}:${nonce}`;
  const sig      = crypto.createHmac("sha256", env.jwtSecret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`, "utf8").toString("base64url");
}

function parseState(state: string): { userId: string; shop: string } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 4) return null;
    const [userId, shop, nonce, sig] = parts;
    const payload = `${userId}:${shop}:${nonce}`;
    const expected = crypto.createHmac("sha256", env.jwtSecret).update(payload).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(sig, "utf8");
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
    return { userId, shop };
  } catch {
    return null;
  }
}

function getUserIdFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  // Allow `?token=` for the redirect flow since the browser navigates here directly.
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
// Lets the frontend render a useful "Shopify isn't configured on this server
// yet" screen without trying OAuth and hitting an opaque 503. No auth needed —
// this exposes only public-facing info (the API key itself stays on the server).

router.get("/shopify/config-status", (_req: Request, res: Response): void => {
  res.json({
    apiKeyConfigured: Boolean(env.shopifyApiKey && env.shopifyApiSecret),
    apiVersion:       env.shopifyApiVersion,
    scopes:           env.shopifyScopes,
    redirectUri:      env.shopifyRedirectUri,
  });
});

// ── Authorize ────────────────────────────────────────────────────────────────

router.get("/shopify/authorize", (req: Request, res: Response): void => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized — Yappaflow login required" });
    return;
  }

  const shop = typeof req.query.shop === "string" ? req.query.shop.trim().toLowerCase() : "";
  if (!isValidShopDomain(shop)) {
    res.status(400).json({ error: "Missing or invalid ?shop=<name>.myshopify.com" });
    return;
  }

  if (!env.shopifyApiKey) {
    res.status(503).json({ error: "Shopify integration is not configured on this server" });
    return;
  }

  const state = buildState(userId, shop);
  const url   = getShopifyAuthUrl(shop, state);
  res.redirect(url);
});

// ── Callback ─────────────────────────────────────────────────────────────────

router.get("/shopify/callback", async (req: Request, res: Response): Promise<void> => {
  const { code, shop: shopQ, state } = req.query;
  const shop  = typeof shopQ === "string" ? shopQ.toLowerCase() : "";
  const codeS = typeof code  === "string" ? code  : "";
  const stateS = typeof state === "string" ? state : "";

  if (!shop || !codeS || !stateS) {
    res.redirect(`${env.frontendUrl}/en/dashboard?view=deploy&shopify=error&reason=missing_params`);
    return;
  }
  if (!isValidShopDomain(shop)) {
    res.redirect(`${env.frontendUrl}/en/dashboard?view=deploy&shopify=error&reason=invalid_shop`);
    return;
  }

  // 1) HMAC check — the whole query string (minus `hmac`) must verify.
  const queryForHmac: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.query)) {
    if (typeof v === "string") queryForHmac[k] = v;
  }
  if (!verifyShopifyHmac(queryForHmac)) {
    res.redirect(`${env.frontendUrl}/en/dashboard?view=deploy&shopify=error&reason=bad_hmac`);
    return;
  }

  // 2) State check — recover userId and make sure the shop matches what
  //    we issued the state for.
  const parsed = parseState(stateS);
  if (!parsed || parsed.shop !== shop) {
    res.redirect(`${env.frontendUrl}/en/dashboard?view=deploy&shopify=error&reason=bad_state`);
    return;
  }
  const { userId } = parsed;

  // 3) Code exchange.
  try {
    const { access_token, scope } = await exchangeCodeForAccessToken(shop, codeS);
    const enc = encryptAccessToken(access_token, userId);

    await PlatformConnection.findOneAndUpdate(
      { userId, platform: "shopify" },
      {
        $set: {
          userId,
          platform:      "shopify",
          shopDomain:    shop,
          shopifyScopes: scope,
          ...enc,
          isActive:      true,
        },
      },
      { upsert: true, new: true }
    );

    log(`🛍  Shopify OAuth success: user ${userId} connected ${shop} (scopes: ${scope})`);
    res.redirect(`${env.frontendUrl}/en/dashboard?view=deploy&shopify=connected&shop=${encodeURIComponent(shop)}`);
  } catch (err) {
    logError("Shopify OAuth callback failed", err);
    res.redirect(`${env.frontendUrl}/en/dashboard?view=deploy&shopify=error&reason=exchange_failed`);
  }
});

export default router;

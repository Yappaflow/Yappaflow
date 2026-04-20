/**
 * WordPress authentication + push endpoints.
 *
 * Two auth flavors share this router (see `wordpress-auth.service.ts`):
 *
 *   • Self-hosted (WordPress.org) — Application Passwords. The merchant
 *     pastes siteUrl + username + app-password in Yappaflow; we verify
 *     against  GET /wp-json/wp/v2/users/me?context=edit  and persist.
 *     No server-side developer credentials needed — this is the primary
 *     path for the vast majority of agencies.
 *
 *   • WordPress.com / Jetpack — OAuth 2.0 via
 *     https://public-api.wordpress.com/oauth2 . Only available when the
 *     operator has registered a WP.com app and set WORDPRESS_CLIENT_ID /
 *     WORDPRESS_CLIENT_SECRET.
 *
 * Endpoints:
 *
 *   GET  /auth/wordpress/config-status
 *        Public — tells the frontend which flavors are usable here.
 *
 *   POST /auth/wordpress/connect-application-password
 *        Authed. Body: { siteUrl, username, applicationPassword }.
 *        Verifies the token live against the merchant's site and persists
 *        it encrypted on a PlatformConnection. Also probes for WooCommerce.
 *
 *   GET  /auth/wordpress/authorize?siteUrl=<optional>
 *        Authed (Bearer | ?token= | cookie). Redirects to WP.com OAuth.
 *
 *   GET  /auth/wordpress/callback
 *        WP.com's redirect. Verifies the HMAC'd state, exchanges the code
 *        for a bearer token, introspects the primary blog, persists.
 *
 *   POST /wordpress/push
 *        Authed. Body: { projectId }.
 *        Looks up the caller's PlatformConnection, decrypts the token,
 *        builds a WordPress client, and pushes the generated bundle
 *        (pages + optional WooCommerce products) to the site.
 */

import express, { Request, Response } from "express";
import {
  normalizeWordPressSiteUrl,
  verifyApplicationPassword,
  detectWooCommerce,
  getWordPressComAuthUrl,
  exchangeWordPressComCode,
  introspectWordPressComUser,
  buildWordPressOAuthState,
  parseWordPressOAuthState,
} from "../services/wordpress-auth.service";
import {
  buildWordPressClient,
  pushWordPressBundle,
} from "../services/wordpress-admin.service";
import { PlatformConnection } from "../models/PlatformConnection.model";
import { encryptAccessToken, decryptAccessToken } from "../services/encryption.service";
import { verifyToken } from "../services/jwt.service";
import { env } from "../config/env";
import { log, logError } from "../utils/logger";

const router: express.Router = express.Router();

// ── Auth helpers ────────────────────────────────────────────────────────────

function getUserIdFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  // Allow ?token= so GET redirects work — the browser navigates here without
  // the Authorization header.
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

// ── Config status ───────────────────────────────────────────────────────────
//
// Lets the frontend render a "self-hosted only" vs "self-hosted + WP.com" UI
// without having to probe the OAuth endpoint and parse opaque errors.
// No auth needed — only exposes public-facing capability flags.

router.get("/wordpress/config-status", (_req: Request, res: Response): void => {
  res.json({
    // Self-hosted flow works with zero server config — always true.
    selfHostedSupported:  true,
    // WP.com OAuth requires a developer app to be registered.
    dotcomOAuthConfigured: Boolean(env.wordpressClientId && env.wordpressClientSecret),
    apiVersion:            env.wordpressApiVersion,
    scopes:                env.wordpressScopes,
    redirectUri:           env.wordpressRedirectUri,
  });
});

// ── Self-hosted: Application Password connect ───────────────────────────────
//
// The merchant has already generated an Application Password at
//   Users → Profile → Application Passwords
// inside their WP admin (core feature since 5.6). We verify the token live
// with a single authenticated GET against /users/me?context=edit, then
// encrypt-at-rest on a PlatformConnection row.

router.post(
  "/wordpress/connect-application-password",
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized — Yappaflow login required" });
      return;
    }

    const { siteUrl, username, applicationPassword } = (req.body ?? {}) as {
      siteUrl?:             string;
      username?:            string;
      applicationPassword?: string;
    };

    const normalizedSite = normalizeWordPressSiteUrl(siteUrl ?? "");
    if (!normalizedSite) {
      res.status(400).json({ error: "Missing or invalid siteUrl" });
      return;
    }
    if (!username || !applicationPassword) {
      res.status(400).json({ error: "username and applicationPassword are required" });
      return;
    }

    // 1) Verify the token live so we don't persist something that immediately
    //    won't work on the first /push. No retries — this is a quick probe.
    const verify = await verifyApplicationPassword({
      siteUrl:             normalizedSite,
      username,
      applicationPassword,
    });
    if (!verify.ok) {
      res.status(400).json({
        error:  "Could not authenticate against the WordPress site",
        reason: verify.reason,
      });
      return;
    }

    // 2) Probe for WooCommerce so the frontend can flag the e-commerce lane
    //    without a round-trip later.
    const woo = await detectWooCommerce(normalizedSite);

    // 3) Persist. Application passwords don't have a refresh — just store the
    //    token encrypted. We leave accessTokenExpiresAt null.
    const enc = encryptAccessToken(
      applicationPassword.replace(/\s+/g, ""),
      userId
    );

    await PlatformConnection.findOneAndUpdate(
      { userId, platform: "wordpress" },
      {
        $set: {
          userId,
          platform:                     "wordpress",
          wordpressFlavor:              "self_hosted",
          wordpressSiteUrl:             normalizedSite,
          wordpressUsername:            verify.username ?? username,
          wordpressWooCommerceEnabled:  woo.enabled,
          ...enc,
          isActive:                     true,
        },
      },
      { upsert: true, new: true }
    );

    log(
      `🔌 WordPress (self-hosted) connected: user ${userId} → ${normalizedSite} ` +
      `(user ${verify.username ?? username}, woo=${woo.enabled})`
    );
    res.json({
      ok:                  true,
      siteUrl:             normalizedSite,
      username:            verify.username ?? username,
      wooCommerceEnabled:  woo.enabled,
    });
  }
);

// ── WordPress.com OAuth: authorize ──────────────────────────────────────────

router.get("/wordpress/authorize", (req: Request, res: Response): void => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized — Yappaflow login required" });
    return;
  }

  if (!env.wordpressClientId || !env.wordpressClientSecret) {
    res.status(503).json({
      error: "WordPress.com OAuth is not configured on this server — " +
             "use the self-hosted (Application Password) flow instead",
    });
    return;
  }

  // siteUrl is optional on WP.com — the token is for the user's account and
  // we pick their primary blog during introspection. Callers may still
  // provide a hint that we echo through the state.
  const hintedSiteUrl =
    typeof req.query.siteUrl === "string"
      ? (normalizeWordPressSiteUrl(req.query.siteUrl) ?? "")
      : "";

  const state = buildWordPressOAuthState(userId, hintedSiteUrl);
  const url = getWordPressComAuthUrl(state);
  res.redirect(url);
});

// ── WordPress.com OAuth: callback ───────────────────────────────────────────

router.get("/wordpress/callback", async (req: Request, res: Response): Promise<void> => {
  const { code, state } = req.query;
  const codeS  = typeof code  === "string" ? code  : "";
  const stateS = typeof state === "string" ? state : "";

  if (!codeS || !stateS) {
    res.redirect(`${env.frontendUrl}/en/dashboard?view=deploy&wordpress=error&reason=missing_params`);
    return;
  }

  const parsed = parseWordPressOAuthState(stateS);
  if (!parsed) {
    res.redirect(`${env.frontendUrl}/en/dashboard?view=deploy&wordpress=error&reason=bad_state`);
    return;
  }
  const { userId, siteUrl: hintedSiteUrl } = parsed;

  try {
    const token = await exchangeWordPressComCode(codeS);
    const user  = await introspectWordPressComUser(token.access_token);

    const enc = encryptAccessToken(token.access_token, userId);

    const resolvedSiteUrl =
      user.primaryBlogUrl ??
      (hintedSiteUrl ? normalizeWordPressSiteUrl(hintedSiteUrl) ?? hintedSiteUrl : "");

    await PlatformConnection.findOneAndUpdate(
      { userId, platform: "wordpress" },
      {
        $set: {
          userId,
          platform:         "wordpress",
          wordpressFlavor:  "dotcom",
          wordpressSiteUrl: resolvedSiteUrl,
          wordpressSiteId:  user.primaryBlogId,
          wordpressUsername: user.username,
          wordpressScopes:  token.scope ?? env.wordpressScopes,
          ...enc,
          isActive:         true,
        },
      },
      { upsert: true, new: true }
    );

    log(
      `🌐 WordPress.com OAuth success: user ${userId} connected ` +
      `(blog ${user.primaryBlogId ?? "?"} → ${resolvedSiteUrl || "?"})`
    );
    res.redirect(
      `${env.frontendUrl}/en/dashboard?view=deploy&wordpress=connected` +
      (resolvedSiteUrl ? `&site=${encodeURIComponent(resolvedSiteUrl)}` : "")
    );
  } catch (err) {
    logError("WordPress.com OAuth callback failed", err);
    res.redirect(`${env.frontendUrl}/en/dashboard?view=deploy&wordpress=error&reason=exchange_failed`);
  }
});

// ── Push (ships the generated bundle to the connected site) ─────────────────

router.post("/wordpress/push", async (req: Request, res: Response): Promise<void> => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized — Yappaflow login required" });
    return;
  }

  const { projectId } = (req.body ?? {}) as { projectId?: string };
  if (!projectId) {
    res.status(400).json({ error: "projectId is required" });
    return;
  }

  const conn = await PlatformConnection.findOne({ userId, platform: "wordpress" });
  if (!conn || !conn.isActive) {
    res.status(412).json({
      error: "WordPress is not connected for this user — hit " +
             "/auth/wordpress/connect-application-password (self-hosted) or " +
             "/auth/wordpress/authorize (WordPress.com) first.",
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
    logError(`WordPress token decrypt failed for user ${userId}`, err);
    res.status(500).json({ error: "Failed to decrypt WordPress credentials" });
    return;
  }

  if (!conn.wordpressSiteUrl) {
    res.status(412).json({ error: "Connected WordPress record has no siteUrl" });
    return;
  }
  if (!conn.wordpressFlavor) {
    res.status(412).json({ error: "Connected WordPress record has no flavor" });
    return;
  }

  const client = buildWordPressClient({
    siteUrl:     conn.wordpressSiteUrl,
    flavor:      conn.wordpressFlavor,
    accessToken,
    username:    conn.wordpressUsername,
    siteId:      conn.wordpressSiteId,
  });

  try {
    const result = await pushWordPressBundle({
      agencyId:  userId,
      projectId,
      client,
    });
    res.json({ ok: true, result });
  } catch (err) {
    logError("WordPress push failed", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

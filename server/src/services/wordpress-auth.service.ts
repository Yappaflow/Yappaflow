/**
 * WordPress authentication service.
 *
 * Two supported flavors (see `ConnectedPlatform` on PlatformConnection):
 *
 *   1. Self-hosted (WordPress.org) — "Application Passwords".
 *      Core feature since WP 5.6. The merchant generates a 24-char token
 *      at  Users → Profile → Application Passwords  and pastes it into
 *      Yappaflow alongside their site URL and username. We store the
 *      token (encrypted) and send it as HTTP Basic Auth on every REST
 *      call. No server-side credentials are needed — this is the default
 *      path for the vast majority of Yappaflow's agencies, who manage
 *      their own WordPress installs.
 *
 *      Spec: https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/
 *
 *   2. WordPress.com / Jetpack — OAuth 2.0.
 *      Requires a developer app registered at developer.wordpress.com/apps.
 *      We redirect to  https://public-api.wordpress.com/oauth2/authorize ,
 *      receive a code, exchange it at /oauth2/token, and get back a
 *      bearer token. Sent as `Authorization: Bearer <token>` on every
 *      REST call against /wp/v2/sites/<id>/… .
 *
 *      Spec: https://developer.wordpress.com/docs/oauth2/
 *
 * The same `PlatformConnection` row carries the token for either flavor —
 * `wordpressFlavor` tells us which shape the caller needs to build the
 * authorization header with.
 */

import crypto from "crypto";
import axios from "axios";
import { env } from "../config/env";

// ── Site URL validation ──────────────────────────────────────────────────────

/**
 * Cleans up an agency-typed site URL. Accepts:
 *   "example.com"
 *   "https://example.com"
 *   "https://example.com/"
 *   "https://example.com/wp"
 * Returns the origin+path (no trailing slash) so we can append
 * "/wp-json/wp/v2/…" safely.
 *
 * Returns null on anything that isn't a valid http(s) URL with a host.
 */
export function normalizeWordPressSiteUrl(input: string): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname || !url.hostname.includes(".")) return null;
  // Reject paths with query / hash — keeps the REST base deterministic.
  if (url.search || url.hash) return null;

  // Strip trailing slash from pathname. Empty pathname ("/") → "".
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${path}`;
}

export function isValidWordPressSiteUrl(input: string): boolean {
  return normalizeWordPressSiteUrl(input) !== null;
}

// ── Self-hosted: verify an application password ──────────────────────────────

export interface ApplicationPasswordVerifyResult {
  ok:          boolean;
  /** WordPress user id — only present when `ok`. */
  userId?:     number;
  /** WordPress user display/login — only present when `ok`. */
  username?:   string;
  /** Full REST capabilities list — only present when `ok`. */
  capabilities?: Record<string, boolean>;
  /** Short human-readable reason when ok=false. */
  reason?:     string;
}

/**
 * Hit  GET  {siteUrl}/wp-json/wp/v2/users/me?context=edit
 * with HTTP Basic Auth (username:applicationPassword). This is the
 * canonical "does this token work" check — a 200 means the token is live
 * and the user has at least edit-context access on the site.
 *
 * Does NOT throw on auth errors — those are expected for bad pastes and
 * shouldn't become 500s on our side.
 */
export async function verifyApplicationPassword(opts: {
  siteUrl:             string;
  username:            string;
  applicationPassword: string;
  /** Test hook — allows the unit test to inject a stub without mocking axios. */
  fetchImpl?:          typeof axios.get;
}): Promise<ApplicationPasswordVerifyResult> {
  const site = normalizeWordPressSiteUrl(opts.siteUrl);
  if (!site) return { ok: false, reason: "invalid_site_url" };
  if (!opts.username) return { ok: false, reason: "missing_username" };
  if (!opts.applicationPassword) return { ok: false, reason: "missing_password" };

  // WordPress shows application passwords with spaces ("abcd efgh …") but
  // accepts them with or without. Strip spaces for the Basic-auth header so
  // the user can paste whichever form.
  const token = opts.applicationPassword.replace(/\s+/g, "");
  const basic = Buffer.from(`${opts.username}:${token}`, "utf8").toString("base64");

  const url = `${site}/wp-json/wp/v2/users/me?context=edit`;
  const getImpl = opts.fetchImpl ?? axios.get;

  try {
    const { data, status } = await getImpl(url, {
      headers: {
        Authorization: `Basic ${basic}`,
        Accept:        "application/json",
      },
      // Don't follow more than a couple of redirects (http→https, trailing slash).
      maxRedirects: 3,
      // We want to handle 401/403 ourselves instead of throwing.
      validateStatus: () => true,
      timeout: 10_000,
    });

    if (status === 401 || status === 403) {
      return { ok: false, reason: "unauthorized" };
    }
    if (status === 404) {
      return { ok: false, reason: "rest_api_not_found" };
    }
    if (status >= 400) {
      return { ok: false, reason: `http_${status}` };
    }

    const userId = typeof data?.id === "number" ? data.id : undefined;
    const username = typeof data?.slug === "string" ? data.slug : opts.username;
    const capabilities =
      data?.capabilities && typeof data.capabilities === "object"
        ? data.capabilities
        : undefined;

    return { ok: true, userId, username, capabilities };
  } catch (err) {
    return { ok: false, reason: `network_error:${(err as Error).message}` };
  }
}

/**
 * Best-effort WooCommerce detection.
 *
 * WooCommerce exposes its own REST namespace at  /wp-json/wc/v3  — a simple
 * GET against the system status endpoint (or any namespace root) returns 200
 * when WooCommerce is installed, 404 otherwise. We don't need full credentials
 * for this — the namespace root is unauthenticated and only confirms the
 * plugin is present.
 *
 * Never throws — returns `{ enabled: false }` on any network/HTTP error.
 */
export async function detectWooCommerce(siteUrl: string, opts?: {
  fetchImpl?: typeof axios.get;
}): Promise<{ enabled: boolean }> {
  const site = normalizeWordPressSiteUrl(siteUrl);
  if (!site) return { enabled: false };

  const url = `${site}/wp-json/wc/v3`;
  const getImpl = opts?.fetchImpl ?? axios.get;

  try {
    const { status } = await getImpl(url, {
      validateStatus: () => true,
      timeout:        8_000,
    });
    // 200 = exists and serves the namespace; 401 = exists but needs auth —
    // both are "plugin is installed". 404 = not installed.
    return { enabled: status === 200 || status === 401 };
  } catch {
    return { enabled: false };
  }
}

// ── WordPress.com: OAuth 2.0 ────────────────────────────────────────────────

const WPCOM_AUTHORIZE_URL = "https://public-api.wordpress.com/oauth2/authorize";
const WPCOM_TOKEN_URL     = "https://public-api.wordpress.com/oauth2/token";
const WPCOM_ME_URL        = "https://public-api.wordpress.com/rest/v1.1/me";

export interface WordPressDotComTokenResponse {
  access_token: string;
  token_type:   string;
  blog_id?:     number;
  blog_url?:    string;
  scope?:       string;
}

/**
 * Build the WordPress.com OAuth install URL. `state` is opaque — callers
 * embed whatever they need (typically a signed userId payload) and verify
 * it on the callback.
 */
export function getWordPressComAuthUrl(state: string): string {
  if (!env.wordpressClientId) {
    throw new Error("WORDPRESS_CLIENT_ID is not set — cannot start OAuth");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     env.wordpressClientId,
    redirect_uri:  env.wordpressRedirectUri,
    scope:         env.wordpressScopes,
    state,
  });
  return `${WPCOM_AUTHORIZE_URL}?${params.toString()}`;
}

/** Exchange an authorization code for a long-lived bearer token. */
export async function exchangeWordPressComCode(
  code: string
): Promise<WordPressDotComTokenResponse> {
  if (!env.wordpressClientId || !env.wordpressClientSecret) {
    throw new Error("WordPress.com API credentials are not configured");
  }

  // WP.com requires  application/x-www-form-urlencoded  — JSON body works on
  // many OAuth servers but not this one.
  const form = new URLSearchParams({
    client_id:     env.wordpressClientId,
    client_secret: env.wordpressClientSecret,
    code,
    grant_type:    "authorization_code",
    redirect_uri:  env.wordpressRedirectUri,
  });

  const { data } = await axios.post(WPCOM_TOKEN_URL, form.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (!data?.access_token) {
    throw new Error("WordPress.com /oauth2/token response missing access_token");
  }
  return data as WordPressDotComTokenResponse;
}

export interface WordPressDotComUser {
  userId?:      number;
  username?:    string;
  displayName?: string;
  primaryBlogId?: string;
  primaryBlogUrl?: string;
}

/**
 * Introspect the token we just received so we can stash the user's primary
 * blog id (for scoping subsequent REST calls) on the PlatformConnection.
 *
 * Doesn't throw — if WP.com refuses, we still persist the connection; the
 * caller can prompt the user to pick a site later.
 */
export async function introspectWordPressComUser(
  accessToken: string
): Promise<WordPressDotComUser> {
  try {
    const { data } = await axios.get(WPCOM_ME_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const d = data as {
      ID?:             number;
      username?:       string;
      display_name?:   string;
      primary_blog?:   number | string;
      primary_blog_url?: string;
    };
    return {
      userId:         typeof d.ID === "number" ? d.ID : undefined,
      username:       d.username,
      displayName:    d.display_name,
      primaryBlogId:  d.primary_blog != null ? String(d.primary_blog) : undefined,
      primaryBlogUrl: d.primary_blog_url,
    };
  } catch {
    return {};
  }
}

// ── OAuth state (CSRF) helpers ───────────────────────────────────────────────
//
// Identical contract to the Shopify router's buildState/parseState —
// duplicated here so the WordPress route doesn't have to import from a
// sibling route file (circular-dependency hazard). Anyone touching this
// should keep them behaviorally aligned.

export function buildWordPressOAuthState(userId: string, siteUrl: string): string {
  const nonce   = crypto.randomBytes(12).toString("hex");
  const payload = `${userId}:${siteUrl}:${nonce}`;
  const sig     = crypto.createHmac("sha256", env.jwtSecret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`, "utf8").toString("base64url");
}

export function parseWordPressOAuthState(
  state: string
): { userId: string; siteUrl: string } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parts = decoded.split(":");
    // Colons inside siteUrl ("https://example.com") mean the payload has
    // more than 4 parts. The first field is the userId, the last is the sig,
    // the second-to-last is the nonce, everything else is the siteUrl.
    if (parts.length < 4) return null;
    const userId = parts[0];
    const sig    = parts[parts.length - 1];
    const nonce  = parts[parts.length - 2];
    const siteUrl = parts.slice(1, parts.length - 2).join(":");

    const payload = `${userId}:${siteUrl}:${nonce}`;
    const expected = crypto.createHmac("sha256", env.jwtSecret).update(payload).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(sig, "utf8");
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
    return { userId, siteUrl };
  } catch {
    return null;
  }
}

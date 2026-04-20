/**
 * Shopify OAuth 2.0 (Authorization Code grant).
 *
 * Spec: https://shopify.dev/docs/apps/auth/oauth
 *
 * Flow:
 *   1. GET  /auth/shopify/authorize?shop=<shop>.myshopify.com
 *      → redirects the merchant to Shopify's install screen.
 *   2. Shopify redirects back to our registered redirect URI with:
 *        ?code=<code>&shop=<shop>&state=<state>&hmac=<hmac>&host=<host>
 *      We verify (a) `shop` is a well-formed myshopify domain, (b) HMAC
 *      signature matches, (c) `state` is the one we issued.
 *   3. POST to https://<shop>/admin/oauth/access_token with
 *        { client_id, client_secret, code }
 *      → returns `{ access_token, scope }`.
 *
 * We purposefully do NOT use `@shopify/shopify-api`'s built-in auth begin /
 * callback helpers: those require a session storage adapter and pull in
 * Express session semantics. The OAuth surface is small enough that doing
 * it by hand (with the Shopify-approved HMAC + shop-domain checks) is
 * cleaner, and more testable.
 */

import crypto from "crypto";
import axios from "axios";
import { env } from "../config/env";

const MYSHOPIFY_DOMAIN_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

/** True iff `shop` is a well-formed Shopify store domain we'll talk to. */
export function isValidShopDomain(shop: string): boolean {
  return MYSHOPIFY_DOMAIN_RE.test(shop.toLowerCase());
}

/**
 * Build the Shopify OAuth install URL. The `state` value is opaque to us
 * here — callers embed whatever they want inside it (typically a JWT or
 * signed userId) and verify it on the callback.
 */
export function getShopifyAuthUrl(shop: string, state: string): string {
  if (!isValidShopDomain(shop)) {
    throw new Error(`Refusing to build auth URL for invalid shop domain "${shop}"`);
  }
  if (!env.shopifyApiKey) {
    throw new Error("SHOPIFY_API_KEY is not set — cannot start OAuth");
  }

  const params = new URLSearchParams({
    client_id:    env.shopifyApiKey,
    scope:        env.shopifyScopes,
    redirect_uri: env.shopifyRedirectUri,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Verify the HMAC signature on an OAuth callback query.
 * Shopify signs every param EXCEPT `hmac` (and `signature` on legacy links).
 */
export function verifyShopifyHmac(
  query: Record<string, string | string[] | undefined>
): boolean {
  if (!env.shopifyApiSecret) return false;
  const { hmac, signature: _signature, ...rest } = query;
  if (typeof hmac !== "string" || !hmac) return false;

  // Sort params lexicographically and build the canonical string
  // (key=value separated by '&', no URL encoding of values for this check
  // — Shopify documents the exact form).
  const message = Object.keys(rest)
    .sort()
    .map((key) => {
      const v = rest[key];
      const value = Array.isArray(v) ? v.join(",") : v ?? "";
      return `${key}=${value}`;
    })
    .join("&");

  const digest = crypto
    .createHmac("sha256", env.shopifyApiSecret)
    .update(message)
    .digest("hex");

  // timing-safe compare
  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(hmac, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface ShopifyTokenResponse {
  access_token: string;
  scope:        string;
}

/**
 * Exchange an authorization code for a long-lived Admin API access token.
 */
export async function exchangeCodeForAccessToken(
  shop: string,
  code: string
): Promise<ShopifyTokenResponse> {
  if (!isValidShopDomain(shop)) {
    throw new Error(`Refusing to exchange code against invalid shop "${shop}"`);
  }
  if (!env.shopifyApiKey || !env.shopifyApiSecret) {
    throw new Error("Shopify API credentials are not configured");
  }

  const { data } = await axios.post(
    `https://${shop}/admin/oauth/access_token`,
    {
      client_id:     env.shopifyApiKey,
      client_secret: env.shopifyApiSecret,
      code,
    },
    { headers: { "Content-Type": "application/json" } }
  );

  if (!data?.access_token || !data?.scope) {
    throw new Error("Shopify /admin/oauth/access_token response missing fields");
  }
  return data as ShopifyTokenResponse;
}

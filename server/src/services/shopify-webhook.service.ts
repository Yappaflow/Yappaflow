/**
 * Shopify webhook HMAC verification + handlers.
 *
 * Shopify signs every webhook POST with an HMAC-SHA256 of the raw request
 * body, using our `SHOPIFY_API_SECRET`. The signature is base64-encoded in
 * the `X-Shopify-Hmac-Sha256` header.
 *
 * IMPORTANT: the HMAC is computed over the *exact bytes* Shopify sent.
 * The Express route that handles these webhooks MUST use `express.raw()`
 * so `req.body` is a `Buffer` — if we let express.json() parse it first,
 * re-serializing to a Buffer will reorder keys / rewrite whitespace and
 * the HMAC will no longer match.
 */

import crypto from "crypto";
import { env } from "../config/env";
import { PlatformConnection } from "../models/PlatformConnection.model";
import { log } from "../utils/logger";

/**
 * Verify the `X-Shopify-Hmac-Sha256` header on a webhook request.
 * Returns true iff the signature is valid for the given raw body bytes.
 */
export function verifyWebhookHmac(
  rawBody: Buffer,
  headerHmac: string | undefined
): boolean {
  if (!env.shopifyApiSecret) return false;
  if (!headerHmac) return false;

  const digest = crypto
    .createHmac("sha256", env.shopifyApiSecret)
    .update(rawBody)
    .digest("base64");

  // timing-safe compare
  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(headerHmac, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ── Webhook payload handlers ─────────────────────────────────────────────────

/**
 * `app/uninstalled` — the merchant removed our app. We MUST delete any
 * access token we have for them, per Shopify Partner policy. (They also
 * send `shop/redact` 48h later, but we don't wait — tokens are useless
 * after uninstall anyway.)
 */
export async function handleAppUninstalled(
  shopDomain: string
): Promise<{ removed: number }> {
  const result = await PlatformConnection.deleteMany({
    platform:   "shopify",
    shopDomain,
  });
  log(`🛍  Shopify app uninstalled from ${shopDomain} — removed ${result.deletedCount ?? 0} connection(s)`);
  return { removed: result.deletedCount ?? 0 };
}

/**
 * `customers/data_request` — GDPR: a customer of the merchant's shop has
 * requested a copy of their data. Yappaflow does NOT store the merchant's
 * customers (we only act on the merchant's behalf to push themes +
 * products), so the correct response is to acknowledge and record.
 */
export async function handleCustomersDataRequest(payload: {
  shop_domain?: string;
  shop_id?:     number;
  customer?:    { id?: number; email?: string };
}): Promise<void> {
  log(
    `🔐 customers/data_request from ${payload.shop_domain ?? "?"} ` +
    `for customer ${payload.customer?.id ?? "?"} — no customer data stored, acknowledged`
  );
}

/**
 * `customers/redact` — GDPR: delete any data we have about this specific
 * customer of the merchant's shop. Same story: we hold no customer data,
 * so this is a no-op with a log entry.
 */
export async function handleCustomersRedact(payload: {
  shop_domain?: string;
  customer?:    { id?: number; email?: string };
}): Promise<void> {
  log(
    `🔐 customers/redact from ${payload.shop_domain ?? "?"} ` +
    `for customer ${payload.customer?.id ?? "?"} — no customer data stored, acknowledged`
  );
}

/**
 * `shop/redact` — GDPR: 48h after uninstall, delete everything we have
 * about this shop. For us that means: any lingering PlatformConnection
 * that somehow survived `app/uninstalled`.
 */
export async function handleShopRedact(payload: {
  shop_domain?: string;
}): Promise<void> {
  const shopDomain = payload.shop_domain;
  if (!shopDomain) return;
  const result = await PlatformConnection.deleteMany({
    platform:   "shopify",
    shopDomain,
  });
  log(`🔐 shop/redact for ${shopDomain} — removed ${result.deletedCount ?? 0} connection(s)`);
}

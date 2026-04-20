/**
 * ikas webhook HMAC verification + handlers.
 *
 * Spec: https://ikas.dev/docs/api/admin-api/webhooks
 *
 * ikas signs webhook POSTs with HMAC-SHA256 of the RAW body bytes, using
 * the app's `client_secret` as the key. The signature is sent
 *   x-ikas-signature: base64(hmac-sha256(body, client_secret))
 *
 * ikas also sends:
 *   x-ikas-topic       : e.g. "product.created", "order.created", "app.uninstalled"
 *   x-ikas-merchant-id : the merchant the event belongs to
 *
 * IMPORTANT: the HMAC is computed over the *exact bytes* ikas sent. The
 * Express route handling these webhooks MUST use `express.raw()` so
 * `req.body` is a `Buffer` — re-serializing JSON almost always changes a
 * byte (key order, whitespace, unicode escapes) and the signature won't match.
 *
 * Matches the shape of `webflow-webhook.service.ts` and
 * `shopify-webhook.service.ts`.
 */

import crypto from "crypto";
import { env } from "../config/env";
import { PlatformConnection } from "../models/PlatformConnection.model";
import { log } from "../utils/logger";

/**
 * Verify the `x-ikas-signature` header on a webhook request.
 *
 * Returns true iff:
 *   • IKAS_CLIENT_SECRET is configured,
 *   • signature is valid for `rawBody` under the secret.
 *
 * Unlike Webflow, ikas doesn't send a timestamp header — there's no skew
 * window to enforce. Replay protection is expected to come from the app
 * tracking event ids (we log them; handlers are idempotent).
 */
export function verifyWebhookSignature(
  rawBody:        Buffer,
  headerSignature: string | undefined
): boolean {
  if (!env.ikasClientSecret) return false;
  if (!headerSignature)      return false;

  const digest = crypto
    .createHmac("sha256", env.ikasClientSecret)
    .update(rawBody)
    .digest("base64");

  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(headerSignature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ── Webhook payload handlers ────────────────────────────────────────────────

/**
 * `app.uninstalled` — the merchant removed our app from their ikas store.
 * We MUST delete any access + refresh token we have for them so we stop
 * attempting calls (mirrors the Shopify/Webflow cleanup rule).
 */
export async function handleAppUninstalled(
  merchantId: string | undefined,
  _payload:   Record<string, unknown>
): Promise<{ removed: number }> {
  const q: Record<string, unknown> = { platform: "ikas" };
  if (merchantId) q.ikasMerchantId = merchantId;
  const result = await PlatformConnection.deleteMany(q);
  log(
    `🛍  ikas app uninstalled from merchant ${merchantId ?? "?"} ` +
    `— removed ${result.deletedCount ?? 0} connection(s)`
  );
  return { removed: result.deletedCount ?? 0 };
}

/**
 * `order.created` — a storefront order was placed. Yappaflow does not
 * currently persist order data, so we log and move on. This handler is
 * intentionally a no-op so merchants can subscribe us without side effects;
 * when we grow an orders feature we hydrate it here.
 */
export async function handleOrderCreated(
  merchantId: string | undefined,
  payload:    { id?: string; orderNumber?: string }
): Promise<void> {
  log(
    `🛒 ikas order.created ${payload.orderNumber ?? payload.id ?? "?"} ` +
    `for merchant ${merchantId ?? "?"} — acknowledged, no persistence`
  );
}

/**
 * `product.updated` — product data changed on the ikas side. We don't
 * currently mirror product state back into Yappaflow, so this is also a
 * no-op. Keeping the handler wired so the topic can be subscribed without
 * 404ing ikas's retry machinery.
 */
export async function handleProductUpdated(
  merchantId: string | undefined,
  payload:    { id?: string; name?: string }
): Promise<void> {
  log(
    `📦 ikas product.updated ${payload.id ?? "?"} (${payload.name ?? "?"}) ` +
    `for merchant ${merchantId ?? "?"} — acknowledged, no persistence`
  );
}

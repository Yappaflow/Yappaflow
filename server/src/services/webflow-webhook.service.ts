/**
 * Webflow webhook HMAC verification + handlers.
 *
 * Spec: https://developers.webflow.com/data/reference/webhooks/events
 *
 * Webflow signs webhook POSTs with HMAC-SHA256 of
 *   `${timestamp}:${rawBody}`
 * using the workspace client secret (WEBFLOW_CLIENT_SECRET). The signature
 * is sent hex-encoded in the `x-webflow-signature` header, and the
 * `x-webflow-timestamp` header carries the Unix ms timestamp.
 *
 * IMPORTANT: the HMAC is computed over the *exact bytes* Webflow sent.
 * The Express route that handles these webhooks MUST use `express.raw()`
 * so `req.body` is a `Buffer`.
 */

import crypto from "crypto";
import { env } from "../config/env";
import { PlatformConnection } from "../models/PlatformConnection.model";
import { log } from "../utils/logger";

/**
 * Verify the `x-webflow-signature` header on a webhook request.
 *
 * Returns true iff:
 *   • WEBFLOW_CLIENT_SECRET is configured,
 *   • timestamp is within `maxSkewMs` of now (default 5 minutes),
 *   • signature is valid for `${timestamp}:${rawBody}` under the secret.
 */
export function verifyWebhookSignature(
  rawBody:       Buffer,
  headerTimestamp: string | undefined,
  headerSignature: string | undefined,
  maxSkewMs =    5 * 60 * 1000
): boolean {
  if (!env.webflowClientSecret) return false;
  if (!headerTimestamp || !headerSignature) return false;

  const ts = Number(headerTimestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() - ts) > maxSkewMs) return false;

  const message = `${headerTimestamp}:${rawBody.toString("utf8")}`;
  const digest = crypto
    .createHmac("sha256", env.webflowClientSecret)
    .update(message)
    .digest("hex");

  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(headerSignature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ── Webhook payload handlers ─────────────────────────────────────────────────

/**
 * `site_publish` — the site was (re)published. We use this to mark the
 * project as "live" on the dashboard and to record the publish URL.
 *
 * Payload shape (v2):
 *   { triggerType: "site_publish", payload: { siteId, domains, publishedOn } }
 */
export async function handleSitePublish(
  payload: {
    siteId?:     string;
    domains?:    string[];
    publishedOn?: string;
  }
): Promise<void> {
  log(
    `🌐 Webflow site_publish for site ${payload.siteId ?? "?"} ` +
    `(domains: ${payload.domains?.join(", ") ?? "webflow.io only"})`
  );
  // Project status updates are intentionally left to the explicit /push
  // endpoint — agencies sometimes publish manually from Webflow and we
  // don't want to silently flip Yappaflow state on their say-so.
}

/**
 * `app_uninstalled` — the user removed our app from their Workspace.
 * We MUST delete any access token we have for them (parity with Shopify).
 */
export async function handleAppUninstalled(
  payload: { workspaceId?: string; userId?: string }
): Promise<{ removed: number }> {
  const q: Record<string, unknown> = { platform: "webflow" };
  if (payload.workspaceId) q.webflowWorkspaceId = payload.workspaceId;
  const result = await PlatformConnection.deleteMany(q);
  log(
    `🌐 Webflow app uninstalled from workspace ${payload.workspaceId ?? "?"} ` +
    `— removed ${result.deletedCount ?? 0} connection(s)`
  );
  return { removed: result.deletedCount ?? 0 };
}

/**
 * `ecomm_new_order` — an order was placed on one of our user's stores.
 * Yappaflow does not currently store order data — we log and move on.
 */
export async function handleEcommNewOrder(
  payload: { orderId?: string; siteId?: string }
): Promise<void> {
  log(
    `🛒 Webflow ecomm_new_order ${payload.orderId ?? "?"} ` +
    `on site ${payload.siteId ?? "?"} — acknowledged, no persistence`
  );
}

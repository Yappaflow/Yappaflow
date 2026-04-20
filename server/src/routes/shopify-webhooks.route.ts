/**
 * Shopify webhook endpoints.
 *
 * Shopify sends POSTs to these URLs for Partner-app-mandatory events.
 * The router is mounted with `express.raw({ type: "application/json" })`
 * (in `index.ts`) so `req.body` is the EXACT bytes Shopify sent — the
 * HMAC over the body would not verify against a re-serialized JSON.
 *
 * Endpoints (all POST, all HMAC-verified):
 *   /webhook/shopify/app/uninstalled         — delete stored access token
 *   /webhook/shopify/customers/data-request  — GDPR data request (no-op log)
 *   /webhook/shopify/customers/redact        — GDPR redact customer  (no-op log)
 *   /webhook/shopify/shop/redact             — GDPR redact shop (delete conn)
 *
 * The shop domain is provided via the `X-Shopify-Shop-Domain` header on
 * every webhook — we prefer that over the JSON body, since it's
 * authenticated by the same HMAC as the body and doesn't require the
 * payload to be well-formed JSON to dispatch on.
 */

import express, { Request, Response } from "express";
import {
  verifyWebhookHmac,
  handleAppUninstalled,
  handleCustomersDataRequest,
  handleCustomersRedact,
  handleShopRedact,
} from "../services/shopify-webhook.service";
import { log, logError } from "../utils/logger";

const router: express.Router = express.Router();

function headerStr(req: Request, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()];
  if (Array.isArray(v)) return v[0];
  return typeof v === "string" ? v : undefined;
}

/**
 * Turn a webhook handler into a route handler that:
 *   1. pulls the raw Buffer body and the HMAC header,
 *   2. 401s on bad HMAC,
 *   3. parses the JSON body,
 *   4. hands off to the service,
 *   5. 200s on success.
 *
 * Always 200 on internal errors — Shopify retries aggressively, and once
 * we've verified the signature the event is authentic; bouncing it with a
 * 500 just causes retry storms. We log and move on.
 */
function handleWebhook(
  topic: string,
  onValid: (body: unknown, shopDomain: string) => Promise<void>
) {
  return async (req: Request, res: Response): Promise<void> => {
    const raw = req.body;
    const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw ?? "");
    const hmac = headerStr(req, "x-shopify-hmac-sha256");
    const shopDomain = headerStr(req, "x-shopify-shop-domain") ?? "";

    if (!verifyWebhookHmac(buf, hmac)) {
      log(`🛑 Shopify webhook ${topic} — HMAC mismatch from ${shopDomain || "?"}`);
      res.status(401).send("invalid hmac");
      return;
    }

    let body: unknown = {};
    try {
      body = buf.length > 0 ? JSON.parse(buf.toString("utf8")) : {};
    } catch (err) {
      logError(`Shopify webhook ${topic} — invalid JSON`, err);
      // HMAC was valid, so acknowledge (Shopify will not retry on 200).
      res.status(200).send("ok");
      return;
    }

    try {
      await onValid(body, shopDomain);
    } catch (err) {
      logError(`Shopify webhook ${topic} — handler error`, err);
    }
    res.status(200).send("ok");
  };
}

// ── app/uninstalled ──────────────────────────────────────────────────────────
router.post(
  "/app/uninstalled",
  handleWebhook("app/uninstalled", async (_body, shopDomain) => {
    if (!shopDomain) return;
    await handleAppUninstalled(shopDomain);
  })
);

// ── customers/data-request ───────────────────────────────────────────────────
router.post(
  "/customers/data-request",
  handleWebhook("customers/data_request", async (body) => {
    await handleCustomersDataRequest(
      body as { shop_domain?: string; shop_id?: number; customer?: { id?: number; email?: string } }
    );
  })
);

// ── customers/redact ─────────────────────────────────────────────────────────
router.post(
  "/customers/redact",
  handleWebhook("customers/redact", async (body) => {
    await handleCustomersRedact(
      body as { shop_domain?: string; customer?: { id?: number; email?: string } }
    );
  })
);

// ── shop/redact ──────────────────────────────────────────────────────────────
router.post(
  "/shop/redact",
  handleWebhook("shop/redact", async (body, shopDomain) => {
    const payload = body as { shop_domain?: string };
    // Prefer the header (HMAC-authenticated) but fall back to the body.
    await handleShopRedact({ shop_domain: shopDomain || payload.shop_domain });
  })
);

export default router;

/**
 * ikas webhook endpoints.
 *
 * ikas POSTs to these URLs for events subscribed via the Admin API.
 * The router is mounted with `express.raw({ type: "application/json" })`
 * (in `index.ts`) so `req.body` is the EXACT bytes ikas sent — the HMAC
 * over `body` would not verify against a re-serialized JSON.
 *
 * Endpoints (all POST, all signature-verified):
 *   /webhook/ikas/app-uninstalled — app removed from merchant
 *   /webhook/ikas/order-created   — storefront order placed
 *   /webhook/ikas/product-updated — product data changed
 *
 * We also expose a GET /webhook/ikas/heartbeat for monitoring.
 */

import express, { Request, Response } from "express";
import {
  verifyWebhookSignature,
  handleAppUninstalled,
  handleOrderCreated,
  handleProductUpdated,
} from "../services/ikas-webhook.service";
import { log, logError } from "../utils/logger";

const router: express.Router = express.Router();

function headerStr(req: Request, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()];
  if (Array.isArray(v)) return v[0];
  return typeof v === "string" ? v : undefined;
}

function handleWebhook(
  topic: string,
  onValid: (merchantId: string | undefined, body: Record<string, unknown>) => Promise<void>
) {
  return async (req: Request, res: Response): Promise<void> => {
    const raw = req.body;
    const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw ?? "");
    const signature  = headerStr(req, "x-ikas-signature");
    const merchantId = headerStr(req, "x-ikas-merchant-id");

    if (!verifyWebhookSignature(buf, signature)) {
      log(`🛑 ikas webhook ${topic} — signature mismatch or secret not configured`);
      res.status(401).send("invalid signature");
      return;
    }

    let body: Record<string, unknown> = {};
    try {
      body = buf.length > 0 ? JSON.parse(buf.toString("utf8")) : {};
    } catch (err) {
      logError(`ikas webhook ${topic} — invalid JSON`, err);
      // Still 200 so ikas stops retrying — the signature was valid, the
      // body is our problem to debug, not theirs to re-send forever.
      res.status(200).send("ok");
      return;
    }

    try {
      await onValid(merchantId, body);
    } catch (err) {
      logError(`ikas webhook ${topic} — handler error`, err);
    }
    res.status(200).send("ok");
  };
}

router.get("/heartbeat", (_req: Request, res: Response): void => {
  res.json({ ok: true, service: "ikas-webhooks", ts: new Date().toISOString() });
});

router.post(
  "/app-uninstalled",
  handleWebhook("app.uninstalled", async (merchantId, body) => {
    await handleAppUninstalled(merchantId, body);
  })
);

router.post(
  "/order-created",
  handleWebhook("order.created", async (merchantId, body) => {
    const b = body as { id?: string; orderNumber?: string };
    await handleOrderCreated(merchantId, b);
  })
);

router.post(
  "/product-updated",
  handleWebhook("product.updated", async (merchantId, body) => {
    const b = body as { id?: string; name?: string };
    await handleProductUpdated(merchantId, b);
  })
);

export default router;

/**
 * Webflow webhook endpoints.
 *
 * Webflow sends POSTs to these URLs for events subscribed via the Data API.
 * The router is mounted with `express.raw({ type: "application/json" })`
 * (in `index.ts`) so `req.body` is the EXACT bytes Webflow sent — the
 * signature over `${timestamp}:${body}` would not verify against a
 * re-serialized JSON.
 *
 * Endpoints (all POST, all signature-verified):
 *   /webhook/webflow/site-publish       — publish completed
 *   /webhook/webflow/app-uninstalled    — app removed from workspace
 *   /webhook/webflow/ecomm-new-order    — e-commerce order placed
 */

import express, { Request, Response } from "express";
import {
  verifyWebhookSignature,
  handleSitePublish,
  handleAppUninstalled,
  handleEcommNewOrder,
} from "../services/webflow-webhook.service";
import { log, logError } from "../utils/logger";

const router: express.Router = express.Router();

function headerStr(req: Request, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()];
  if (Array.isArray(v)) return v[0];
  return typeof v === "string" ? v : undefined;
}

function handleWebhook(
  topic: string,
  onValid: (body: unknown) => Promise<void>
) {
  return async (req: Request, res: Response): Promise<void> => {
    const raw = req.body;
    const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw ?? "");
    const timestamp = headerStr(req, "x-webflow-timestamp");
    const signature = headerStr(req, "x-webflow-signature");

    if (!verifyWebhookSignature(buf, timestamp, signature)) {
      log(`🛑 Webflow webhook ${topic} — signature mismatch / expired timestamp`);
      res.status(401).send("invalid signature");
      return;
    }

    let body: unknown = {};
    try {
      body = buf.length > 0 ? JSON.parse(buf.toString("utf8")) : {};
    } catch (err) {
      logError(`Webflow webhook ${topic} — invalid JSON`, err);
      res.status(200).send("ok");
      return;
    }

    try {
      await onValid(body);
    } catch (err) {
      logError(`Webflow webhook ${topic} — handler error`, err);
    }
    res.status(200).send("ok");
  };
}

router.post(
  "/site-publish",
  handleWebhook("site_publish", async (body) => {
    const b = body as { payload?: { siteId?: string; domains?: string[]; publishedOn?: string } };
    await handleSitePublish(b.payload ?? {});
  })
);

router.post(
  "/app-uninstalled",
  handleWebhook("app_uninstalled", async (body) => {
    const b = body as { payload?: { workspaceId?: string; userId?: string } };
    await handleAppUninstalled(b.payload ?? {});
  })
);

router.post(
  "/ecomm-new-order",
  handleWebhook("ecomm_new_order", async (body) => {
    const b = body as { payload?: { orderId?: string; siteId?: string } };
    await handleEcommNewOrder(b.payload ?? {});
  })
);

export default router;

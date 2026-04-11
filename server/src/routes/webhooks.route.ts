import express from "express";
import { env } from "../config/env";
import { handleWhatsAppWebhook, handleInstagramWebhook } from "../services/meta-webhook.service";
import { handleTwilioWhatsAppWebhook, handleDebugWebhook } from "../services/twilio-webhook.service";
import { log, logError } from "../utils/logger";

const router: express.Router = express.Router();

// ── Meta webhook verification (GET) ──────────────────────────────────────────
router.get("/", (req, res): void => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.metaWebhookVerifyToken) {
    log("✅ Meta webhook verified");
    res.status(200).send(challenge);
  } else {
    log(`❌ Meta webhook verification failed — token received: ${token}, expected: ${env.metaWebhookVerifyToken}`);
    res.status(403).send("Forbidden");
  }
});

// ── Meta Cloud API events (POST) ─────────────────────────────────────────────
router.post("/", async (req, res): Promise<void> => {
  const body = req.body as { object?: string; entry?: unknown[] };
  log(`📨 Meta webhook POST — object: ${body.object ?? "(none)"}`);

  try {
    if (body.object === "whatsapp_business_account") {
      await handleWhatsAppWebhook(body.entry ?? []);
    } else if (body.object === "instagram") {
      await handleInstagramWebhook(body.entry ?? []);
    } else {
      log(`⚠️  Unhandled webhook object: ${JSON.stringify(body).slice(0, 200)}`);
    }
    res.status(200).send("EVENT_RECEIVED");
  } catch (err) {
    logError("Webhook error", err);
    res.status(200).send("EVENT_RECEIVED");
  }
});

// ── Twilio WhatsApp webhook (POST /webhook/twilio) ────────────────────────────
// Configure this URL in Twilio Console → Messaging → WhatsApp Sandbox Settings
// → "When a message comes in" → https://YOUR_DOMAIN/webhook/twilio
router.post(
  "/twilio",
  express.urlencoded({ extended: false }), // Twilio sends form-encoded
  async (req, res): Promise<void> => {
    log(`📨 Twilio webhook POST — From: ${req.body?.From ?? "(none)"}`);
    try {
      await handleTwilioWhatsAppWebhook(req.body);
      res.status(200).send("<Response></Response>"); // Twilio expects TwiML
    } catch (err) {
      logError("Twilio webhook error", err);
      res.status(200).send("<Response></Response>");
    }
  }
);

// ── Debug / local test endpoint (POST /webhook/debug) ────────────────────────
// Only active in development. Use this to simulate an incoming WhatsApp message
// without needing a public URL or ngrok.
//
// Usage:
//   curl -X POST http://localhost:4000/webhook/debug \
//     -H "Content-Type: application/json" \
//     -d '{"agencyId":"<your_user_id>","phone":"+905551234567","name":"Test User","message":"Hello!"}'
//
router.post("/debug", async (req, res): Promise<void> => {
  if (env.nodeEnv === "production") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  try {
    const result = await handleDebugWebhook(req.body);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ ok: false, error: String(err) });
  }
});

export default router;

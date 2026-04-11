/**
 * Handles incoming WhatsApp messages from Twilio's webhook.
 *
 * Twilio sends application/x-www-form-urlencoded with fields:
 *   MessageSid, Body, From (whatsapp:+1234567890), To (whatsapp:+14155238886),
 *   ProfileName, WaId (sender's WhatsApp ID without +)
 *
 * This is different from the Meta Cloud API format which uses JSON with
 * body.object === "whatsapp_business_account".
 */

import { Signal }             from "../models/Signal.model";
import { ChatMessage }        from "../models/ChatMessage.model";
import { PlatformConnection } from "../models/PlatformConnection.model";
import { emitToUser }         from "./sse.service";
import { log, logError }      from "../utils/logger";

// ── Twilio WhatsApp ────────────────────────────────────────────────────────────

interface TwilioBody {
  MessageSid?: string;
  Body?:        string;
  From?:        string; // "whatsapp:+905551234567"
  To?:          string; // "whatsapp:+14155238886" (your Twilio WA number)
  ProfileName?: string;
  WaId?:        string; // sender number without +
  NumMedia?:    string;
  MediaUrl0?:   string;
}

export async function handleTwilioWhatsAppWebhook(body: TwilioBody): Promise<void> {
  const { MessageSid, Body, From, To, ProfileName, WaId } = body;

  if (!From || !To) {
    log("⚠️  Twilio webhook missing From/To fields");
    return;
  }

  // Strip "whatsapp:" prefix → raw phone numbers
  const senderPhone = From.replace("whatsapp:", "");
  const toPhone     = To.replace("whatsapp:", "");
  const text        = Body ?? "[media]";
  const senderName  = ProfileName || WaId || senderPhone;
  const msgId       = MessageSid ?? `twilio_${Date.now()}`;

  log(`📲 Twilio WA message: ${senderPhone} → ${toPhone}: "${text.slice(0, 60)}"`);

  // Find the agency that owns this Twilio WhatsApp number.
  // Try matching by stored displayPhone first; fall back to any active WA connection.
  let conn = await PlatformConnection.findOne({
    $or: [
      { displayPhone: toPhone,    platform: "whatsapp",          isActive: true },
      { displayPhone: toPhone,    platform: "whatsapp_business", isActive: true },
    ],
  });

  if (!conn) {
    // Fallback: if only one WA connection exists system-wide, use it
    const all = await PlatformConnection.find({
      platform: { $in: ["whatsapp", "whatsapp_business"] },
      isActive: true,
    });
    if (all.length === 1) {
      conn = all[0];
      log(`⚠️  No exact match for ${toPhone} — using single active WA connection (${conn.displayPhone})`);
    } else if (all.length > 1) {
      log(`❌ Multiple WA connections, can't determine agency for Twilio number ${toPhone}. Store the Twilio number in PlatformConnection.displayPhone to fix this.`);
      return;
    } else {
      log(`❌ No active WhatsApp Business connection found. Connect WhatsApp in Settings → Platforms first.`);
      return;
    }
  }

  const agencyId = conn.userId.toString();

  // Upsert Signal (conversation thread)
  let signal = await Signal.findOne({
    agencyId:  conn.userId,
    sender:    senderPhone,
    platform:  "whatsapp",
  });

  if (!signal) {
    signal = await Signal.create({
      agencyId:      conn.userId,
      platform:      "whatsapp",
      sender:        senderPhone,
      senderName,
      preview:       text.slice(0, 100),
      isOnDashboard: false,
      status:        "new",
    });
    log(`✅ New signal created: ${signal._id} for ${senderPhone}`);
  } else {
    await Signal.findByIdAndUpdate(signal._id, {
      preview: text.slice(0, 100),
      status:  "new",
    });
  }

  // Deduplicated ChatMessage
  try {
    await ChatMessage.findOneAndUpdate(
      { externalId: msgId },
      {
        $setOnInsert: {
          agencyId:     conn.userId,
          signalId:     signal._id,
          platform:     "whatsapp",
          direction:    "inbound",
          senderName,
          senderHandle: senderPhone,
          text,
          messageType:  "text",
          externalId:   msgId,
          timestamp:    new Date(),
        },
      },
      { upsert: true }
    );
  } catch (err) {
    logError("ChatMessage upsert error", err);
  }

  // Push real-time SSE event to all dashboard tabs for this agency
  emitToUser(agencyId, "signal:message", {
    signalId:   signal._id.toString(),
    platform:   "whatsapp",
    senderName,
    sender:     senderPhone,
    text,
    timestamp:  new Date().toISOString(),
    isNew:      true,
  });

  log(`📡 SSE emitted to agency ${agencyId}`);
}

// ── Debug / local test ─────────────────────────────────────────────────────────

interface DebugBody {
  agencyId?: string;
  phone?:    string;
  name?:     string;
  message?:  string;
  platform?: "whatsapp" | "instagram";
}

export async function handleDebugWebhook(
  body: DebugBody
): Promise<{ signalId: string; agencyId: string }> {
  const platform   = body.platform ?? "whatsapp";
  const phone      = body.phone    ?? "+905550000000";
  const name       = body.name     ?? "Debug User";
  const text       = body.message  ?? "Test message from debug endpoint";

  // If agencyId provided, use it directly; otherwise find first active WA connection
  let agencyId = body.agencyId;
  if (!agencyId) {
    const conn = await PlatformConnection.findOne({
      platform: { $in: ["whatsapp", "whatsapp_business"] },
      isActive: true,
    });
    if (!conn) throw new Error("No active WhatsApp connection found. Connect in Settings → Platforms.");
    agencyId = conn.userId.toString();
  }

  const msgId = `debug_${Date.now()}`;

  // Upsert signal
  let signal = await Signal.findOne({ agencyId, sender: phone, platform });
  if (!signal) {
    signal = await Signal.create({
      agencyId,
      platform,
      sender:        phone,
      senderName:    name,
      preview:       text.slice(0, 100),
      isOnDashboard: false,
      status:        "new",
    });
  } else {
    await Signal.findByIdAndUpdate(signal._id, { preview: text.slice(0, 100), status: "new" });
  }

  // ChatMessage
  await ChatMessage.findOneAndUpdate(
    { externalId: msgId },
    {
      $setOnInsert: {
        agencyId,
        signalId:     signal._id,
        platform,
        direction:    "inbound",
        senderName:   name,
        senderHandle: phone,
        text,
        messageType:  "text",
        externalId:   msgId,
        timestamp:    new Date(),
      },
    },
    { upsert: true }
  );

  // SSE push
  emitToUser(agencyId, "signal:message", {
    signalId:  signal._id.toString(),
    platform,
    senderName: name,
    sender:     phone,
    text,
    timestamp:  new Date().toISOString(),
    isNew:      true,
  });

  log(`🧪 Debug webhook: signal ${signal._id} for agency ${agencyId}`);
  return { signalId: signal._id.toString(), agencyId };
}

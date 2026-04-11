/**
 * Processes incoming Meta webhook payloads for WhatsApp Business and Instagram DMs.
 * Creates/updates Signals and ChatMessages, then pushes SSE events to connected dashboards.
 */
import { Signal }       from "../models/Signal.model";
import { ChatMessage }  from "../models/ChatMessage.model";
import { PlatformConnection } from "../models/PlatformConnection.model";
import { emitToUser }   from "./sse.service";
import { log }          from "../utils/logger";

// ── WhatsApp Cloud API ─────────────────────────────────────────────────────────

interface WAMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string };
  audio?: { id: string };
  document?: { id: string; filename: string };
}

interface WAContact { profile: { name: string }; wa_id: string }

export async function handleWhatsAppWebhook(entry: unknown[]): Promise<void> {
  for (const e of entry as Array<{ id: string; changes: unknown[] }>) {
    for (const change of e.changes as Array<{ field: string; value: unknown }>) {
      if (change.field !== "messages") continue;
      const val = change.value as {
        metadata:  { phone_number_id: string; display_phone_number?: string };
        messages?: WAMessage[];
        contacts?: WAContact[];
      };

      const messages = val.messages ?? [];
      const contacts  = val.contacts ?? [];
      const phoneNumberId    = val.metadata?.phone_number_id;
      const displayPhoneRaw  = val.metadata?.display_phone_number; // e.g. "905455876255"
      const displayPhone     = displayPhoneRaw?.startsWith("+") ? displayPhoneRaw : `+${displayPhoneRaw ?? ""}`;

      log(`📨 WA Cloud API: phoneNumberId=${phoneNumberId}, displayPhone=${displayPhone}, messages=${messages.length}`);

      // 1) Exact match by phoneNumberId (ideal — set during WABA onboarding)
      let conn = await PlatformConnection.findOne({ phoneNumberId, isActive: true });

      // 2) Fallback: match by displayPhone (set during WhatsApp OTP login)
      if (!conn && displayPhoneRaw) {
        conn = await PlatformConnection.findOne({
          displayPhone: { $in: [displayPhone, displayPhoneRaw] },
          platform: { $in: ["whatsapp", "whatsapp_business"] },
          isActive: true,
        });
        if (conn) {
          log(`⚠️  Matched by displayPhone ${displayPhone} (no phoneNumberId stored). Saving phoneNumberId for future lookups.`);
          // Persist the phoneNumberId so future lookups are instant
          await PlatformConnection.findByIdAndUpdate(conn._id, { phoneNumberId });
        }
      }

      // 3) Last resort: if only one WA connection exists, use it
      if (!conn) {
        const all = await PlatformConnection.find({
          platform: { $in: ["whatsapp", "whatsapp_business"] },
          isActive: true,
        });
        if (all.length === 1) {
          conn = all[0];
          log(`⚠️  No phoneNumberId/displayPhone match — using single active WA connection (${conn.displayPhone}). Saving phoneNumberId.`);
          await PlatformConnection.findByIdAndUpdate(conn._id, { phoneNumberId });
        } else {
          log(`❌ WA webhook: no connection for phoneNumberId ${phoneNumberId} or displayPhone ${displayPhone}. ${all.length} WA connections exist.`);
          continue;
        }
      }

      const agencyId = conn.userId.toString();

      for (const msg of messages) {
        const contact     = contacts.find((c) => c.wa_id === msg.from);
        const senderName  = contact?.profile.name ?? msg.from;
        const senderPhone = msg.from;
        const text        = extractWAText(msg);
        const msgType     = msg.type as "text" | "image" | "audio" | "document";
        const ts          = new Date(parseInt(msg.timestamp) * 1000);

        // Upsert Signal (thread) for this sender+agency pair
        let signal = await Signal.findOne({ agencyId: conn.userId, sender: senderPhone, platform: "whatsapp" });
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
          log(`WA: new signal ${signal._id} from ${senderPhone}`);
        } else {
          // Update preview with latest message
          await Signal.findByIdAndUpdate(signal._id, { preview: text.slice(0, 100), status: "new" });
        }

        // Deduplicated ChatMessage
        await ChatMessage.findOneAndUpdate(
          { externalId: msg.id },
          {
            $setOnInsert: {
              agencyId:     conn.userId,
              signalId:     signal._id,
              platform:     "whatsapp",
              direction:    "inbound",
              senderName,
              senderHandle: senderPhone,
              text,
              messageType:  msgType,
              externalId:   msg.id,
              timestamp:    ts,
            },
          },
          { upsert: true, new: true }
        );

        // Push real-time event to dashboard
        const payload = {
          signalId:   signal._id.toString(),
          platform:   "whatsapp",
          senderName,
          sender:     senderPhone,
          text,
          timestamp:  ts.toISOString(),
          isNew:      signal.status === "new",
        };
        emitToUser(agencyId, "signal:message", payload);
      }
    }
  }
}

// ── Instagram DM Graph API ─────────────────────────────────────────────────────

interface IGMessaging {
  sender:    { id: string };
  recipient: { id: string };
  timestamp: number;
  message?:  { mid: string; text?: string };
}

export async function handleInstagramWebhook(entry: unknown[]): Promise<void> {
  for (const e of entry as Array<{ id: string; messaging?: IGMessaging[] }>) {
    const messaging = e.messaging ?? [];
    const recipientId = messaging[0]?.recipient?.id;
    if (!recipientId) continue;

    // Find which agency owns this IG account
    const conn = await PlatformConnection.findOne({ igAccountId: recipientId, isActive: true });
    if (!conn) { log(`IG webhook: no connection for igAccountId ${recipientId}`); continue; }
    const agencyId = conn.userId.toString();

    for (const msg of messaging) {
      if (!msg.message) continue;
      const senderId = msg.sender.id;
      const text     = msg.message.text ?? "[media]";
      const msgId    = msg.message.mid;
      const ts       = new Date(msg.timestamp);

      // Upsert Signal
      let signal = await Signal.findOne({ agencyId: conn.userId, sender: senderId, platform: "instagram" });
      if (!signal) {
        signal = await Signal.create({
          agencyId:      conn.userId,
          platform:      "instagram",
          sender:        senderId,
          senderName:    `IG User ${senderId}`,
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
            agencyId:     conn.userId,
            signalId:     signal._id,
            platform:     "instagram",
            direction:    "inbound",
            senderName:   `IG User ${senderId}`,
            senderHandle: senderId,
            text,
            messageType:  "text",
            externalId:   msgId,
            timestamp:    ts,
          },
        },
        { upsert: true, new: true }
      );

      emitToUser(agencyId, "signal:message", {
        signalId:  signal._id.toString(),
        platform:  "instagram",
        senderName:`IG User ${senderId}`,
        sender:    senderId,
        text,
        timestamp: ts.toISOString(),
        isNew:     true,
      });
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function extractWAText(msg: WAMessage): string {
  if (msg.text)     return msg.text.body;
  if (msg.image)    return "[image]";
  if (msg.audio)    return "[audio]";
  if (msg.document) return `[document: ${msg.document.filename ?? "file"}]`;
  return "[message]";
}

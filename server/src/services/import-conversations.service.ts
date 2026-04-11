/**
 * Import existing conversation history from connected platforms.
 *
 * WhatsApp Cloud API: NO history endpoint — messages only arrive via webhooks.
 * Instagram Business API: HAS /conversations endpoint — we can fetch past DMs.
 */

import axios from "axios";
import { Signal }            from "../models/Signal.model";
import { ChatMessage }       from "../models/ChatMessage.model";
import { PlatformConnection } from "../models/PlatformConnection.model";
import { logError }          from "../utils/logger";

export interface ImportResult {
  signalsCreated:  number;
  messagesCreated: number;
  platform:        string;
}

// ── Instagram ─────────────────────────────────────────────────────────────────

/**
 * Fetches DM conversations from the Instagram Graph API for the given
 * agency user and upserts them as Signals + ChatMessages.
 *
 * Requires: PlatformConnection with platform="instagram_dm", igAccountId, accessToken.
 */
export async function importInstagramConversations(
  agencyId: string
): Promise<ImportResult> {
  const conn = await PlatformConnection.findOne({
    userId:   agencyId,
    platform: "instagram_dm",
    isActive: true,
  });

  if (!conn?.igAccountId || !conn.accessToken) {
    return { signalsCreated: 0, messagesCreated: 0, platform: "instagram" };
  }

  let signalsCreated  = 0;
  let messagesCreated = 0;

  try {
    // Fetch all DM conversations for the IG business account
    const { data: convsRes } = await axios.get(
      `https://graph.facebook.com/v19.0/${conn.igAccountId}/conversations`,
      {
        params: {
          platform:      "instagram",
          fields:        "id,participants,messages{id,message,from,timestamp,attachments}",
          access_token:  conn.accessToken,
          limit:         100,
        },
      }
    );

    const conversations: IgConversation[] = convsRes.data ?? [];

    for (const conv of conversations) {
      // Identify the external participant (not our business account)
      const participants = conv.participants?.data ?? [];
      const external = participants.find((p) => p.id !== conn.igAccountId);
      if (!external) continue;

      const senderHandle = external.id;
      const senderName   = external.name || external.username || "Instagram User";
      const messages     = conv.messages?.data ?? [];

      // Latest message as preview
      const latestMsg = messages[messages.length - 1];
      const preview   = latestMsg?.message?.slice(0, 120) ?? "(media)";

      // Upsert the Signal (one per conversation/sender)
      const signal = await Signal.findOneAndUpdate(
        { agencyId, platform: "instagram", sender: senderHandle },
        {
          $setOnInsert: {
            agencyId,
            platform:      "instagram",
            sender:        senderHandle,
            senderName,
            preview,
            isOnDashboard: false,
            status:        "new",
          },
        },
        { upsert: true, new: true }
      );

      let isNewSignal = false;
      if (signal.createdAt.getTime() > Date.now() - 5_000) {
        isNewSignal = true;
        signalsCreated++;
      }

      // Upsert each message (deduplication via externalId)
      for (const msg of messages) {
        if (!msg.id) continue;

        const isFromBusiness = msg.from?.id === conn.igAccountId;
        const text = msg.message ?? "";
        const ts   = msg.timestamp ? new Date(msg.timestamp) : new Date();

        try {
          const inserted = await ChatMessage.findOneAndUpdate(
            { externalId: msg.id },
            {
              $setOnInsert: {
                agencyId,
                signalId:     signal._id,
                platform:     "instagram",
                direction:    isFromBusiness ? "outbound" : "inbound",
                senderName:   isFromBusiness
                  ? (conn.igUsername ?? "Agency")
                  : senderName,
                senderHandle: isFromBusiness
                  ? (conn.igAccountId ?? "agency")
                  : senderHandle,
                text,
                messageType:  "text",
                externalId:   msg.id,
                timestamp:    ts,
              },
            },
            { upsert: true, new: false }
          );

          if (!inserted) messagesCreated++;
        } catch {
          // Unique index violation = already stored, skip
        }
      }

      // Update preview on the Signal if this is the most recent run
      if (!isNewSignal && latestMsg?.message) {
        await Signal.updateOne({ _id: signal._id }, { $set: { preview } });
      }
    }
  } catch (err) {
    logError("importInstagramConversations failed", err);
  }

  return { signalsCreated, messagesCreated, platform: "instagram" };
}

// ── WhatsApp ──────────────────────────────────────────────────────────────────

/**
 * WhatsApp Cloud API has no message history endpoint.
 * Returns a descriptive result so callers know the limitation.
 */
export async function importWhatsAppConversations(
  _agencyId: string
): Promise<ImportResult> {
  return {
    signalsCreated:  0,
    messagesCreated: 0,
    platform:        "whatsapp",
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface IgParticipant {
  id:        string;
  name?:     string;
  username?: string;
}

interface IgMessage {
  id:          string;
  message?:    string;
  from?:       { id: string; name?: string };
  timestamp?:  string;
  attachments?: unknown;
}

interface IgConversation {
  id:           string;
  participants?: { data: IgParticipant[] };
  messages?:    { data: IgMessage[] };
}

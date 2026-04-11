import { GraphQLError } from "graphql";
import axios from "axios";
import { PlatformConnection } from "../../models/PlatformConnection.model";
import { ChatMessage }        from "../../models/ChatMessage.model";
import { Signal }             from "../../models/Signal.model";
import type { AuthContext }   from "../../middleware/auth";
import { env }                from "../../config/env";
import { log, logError }      from "../../utils/logger";
import {
  importInstagramConversations,
  importWhatsAppConversations,
} from "../../services/import-conversations.service";

export const platformResolvers = {
  Query: {
    platformConnections: async (_: unknown, __: unknown, ctx: AuthContext) => {
      if (!ctx.userId) throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHORIZED" } });
      const docs = await PlatformConnection.find({ userId: ctx.userId });
      return docs.map(serializeConn);
    },

    chatMessages: async (
      _: unknown,
      { signalId, limit = 50 }: { signalId: string; limit?: number },
      ctx: AuthContext
    ) => {
      if (!ctx.userId) throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHORIZED" } });
      // Verify the signal belongs to this agency
      const signal = await Signal.findOne({ _id: signalId, agencyId: ctx.userId });
      if (!signal) throw new GraphQLError("Signal not found", { extensions: { code: "NOT_FOUND" } });

      const docs = await ChatMessage.find({ signalId })
        .sort({ timestamp: 1 })
        .limit(limit);
      return docs.map(serializeMsg);
    },
  },

  Mutation: {
    /** Connect WhatsApp Business — auto-detects WABA ID and phone number from token */
    connectWhatsApp: async (
      _: unknown,
      { input }: { input: { accessToken: string } },
      ctx: AuthContext
    ) => {
      if (!ctx.userId) throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHORIZED" } });

      let wabaId: string, phoneNumberId: string, displayPhone: string;
      try {
        // 1. Get WABA accounts linked to this token
        const { data: wabaRes } = await axios.get(
          "https://graph.facebook.com/v19.0/me/whatsapp_business_accounts",
          { params: { access_token: input.accessToken } }
        );
        const waba = wabaRes.data?.[0];
        if (!waba?.id) throw new Error("No WhatsApp Business Account found on this token");
        wabaId = waba.id;

        // 2. Get phone numbers under the WABA
        const { data: phoneRes } = await axios.get(
          `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers`,
          { params: { fields: "id,display_phone_number", access_token: input.accessToken } }
        );
        const phone = phoneRes.data?.[0];
        if (!phone?.id) throw new Error("No phone numbers found under this WhatsApp Business Account");
        phoneNumberId = phone.id;
        displayPhone  = phone.display_phone_number ?? "";
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Invalid WhatsApp Business token";
        throw new GraphQLError(msg, { extensions: { code: "BAD_USER_INPUT" } });
      }

      const doc = await PlatformConnection.findOneAndUpdate(
        { userId: ctx.userId, platform: "whatsapp_business" },
        {
          $set: {
            userId:        ctx.userId,
            platform:      "whatsapp_business",
            wabaId,
            phoneNumberId,
            displayPhone,
            accessToken:   input.accessToken,
            isActive:      true,
          },
        },
        { upsert: true, new: true }
      );
      return serializeConn(doc);
    },

    /** Connect WhatsApp Business via Embedded Signup (one-click OAuth popup) */
    connectWhatsAppEmbedded: async (
      _: unknown,
      { input }: { input: { code: string; wabaId: string; phoneNumberId: string } },
      ctx: AuthContext
    ) => {
      if (!ctx.userId) throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHORIZED" } });

      if (!env.metaAppId || !env.metaAppSecret) {
        throw new GraphQLError("Meta App credentials not configured on server", {
          extensions: { code: "SERVER_CONFIG_ERROR" },
        });
      }

      // 1. Exchange authorization code for long-lived access token
      let accessToken: string;
      try {
        const { data } = await axios.get(
          "https://graph.facebook.com/v21.0/oauth/access_token",
          {
            params: {
              client_id:     env.metaAppId,
              client_secret: env.metaAppSecret,
              code:          input.code,
            },
          }
        );
        accessToken = data.access_token;
        if (!accessToken) throw new Error("No access_token in response");
        log(`✅ Embedded Signup: token exchanged for WABA ${input.wabaId}`);
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message
          ?? (err instanceof Error ? err.message : "Token exchange failed");
        logError("Embedded Signup token exchange failed", err);
        throw new GraphQLError(`Token exchange failed: ${msg}`, {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      // 2. Fetch display phone number for the connected number
      let displayPhone = "";
      try {
        const { data } = await axios.get(
          `https://graph.facebook.com/v21.0/${input.phoneNumberId}`,
          {
            params: { fields: "display_phone_number", access_token: accessToken },
          }
        );
        displayPhone = data.display_phone_number ?? "";
        log(`📱 Embedded Signup: phone number ${displayPhone} (ID: ${input.phoneNumberId})`);
      } catch {
        // Non-fatal — we can still store the connection without display phone
        log(`⚠️  Could not fetch display phone for ${input.phoneNumberId}`);
      }

      // 3. Upsert PlatformConnection
      const doc = await PlatformConnection.findOneAndUpdate(
        { userId: ctx.userId, platform: "whatsapp_business" },
        {
          $set: {
            userId:        ctx.userId,
            platform:      "whatsapp_business",
            wabaId:        input.wabaId,
            phoneNumberId: input.phoneNumberId,
            displayPhone,
            accessToken,
            isActive:      true,
          },
        },
        { upsert: true, new: true }
      );

      // 4. Subscribe this WABA to receive webhook events
      //    Without this, Meta won't forward messages to our /webhook endpoint
      try {
        await axios.post(
          `https://graph.facebook.com/v21.0/${input.wabaId}/subscribed_apps`,
          {},
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        log(`📡 Embedded Signup: WABA ${input.wabaId} subscribed to webhooks`);
      } catch (err: unknown) {
        // Non-fatal — connection is saved, webhook subscription can be retried
        logError("Webhook subscription failed (non-fatal)", err);
        log(`⚠️  Webhook subscription failed for WABA ${input.wabaId}. Messages may not arrive until subscribed.`);
      }

      return serializeConn(doc);
    },

    /** Connect Instagram DM — using access token from OAuth or manual */
    connectInstagram: async (
      _: unknown,
      { accessToken }: { accessToken: string },
      ctx: AuthContext
    ) => {
      if (!ctx.userId) throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHORIZED" } });

      // Fetch IG business account info
      let igData: { id: string; username?: string; instagram_business_account?: { id: string } };
      try {
        const { data } = await axios.get("https://graph.facebook.com/v19.0/me/accounts", {
          params: { fields: "instagram_business_account,name", access_token: accessToken },
        });
        const page = data.data?.[0];
        const igAccountId = page?.instagram_business_account?.id;
        if (!igAccountId) throw new Error("No Instagram Business account found on this token");

        const igProfile = await axios.get(`https://graph.facebook.com/v19.0/${igAccountId}`, {
          params: { fields: "id,username", access_token: accessToken },
        });
        igData = { id: igProfile.data.id, username: igProfile.data.username, instagram_business_account: { id: igAccountId } };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Instagram credentials invalid";
        throw new GraphQLError(msg, { extensions: { code: "BAD_USER_INPUT" } });
      }

      const doc = await PlatformConnection.findOneAndUpdate(
        { userId: ctx.userId, platform: "instagram_dm" },
        {
          $set: {
            userId:      ctx.userId,
            platform:    "instagram_dm",
            igAccountId: igData.instagram_business_account?.id ?? igData.id,
            igUserId:    igData.id,
            igUsername:  igData.username,
            accessToken,
            isActive:    true,
          },
        },
        { upsert: true, new: true }
      );

      // Kick off DM history import in background (non-blocking)
      importInstagramConversations(ctx.userId).catch(() => null);

      return serializeConn(doc);
    },

    /** Send an outbound message via WhatsApp Business Cloud API */
    sendMessage: async (
      _: unknown,
      { signalId, text }: { signalId: string; text: string },
      ctx: AuthContext
    ) => {
      if (!ctx.userId) throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHORIZED" } });

      const signal = await Signal.findOne({ _id: signalId, agencyId: ctx.userId });
      if (!signal) throw new GraphQLError("Signal not found", { extensions: { code: "NOT_FOUND" } });

      const conn = await PlatformConnection.findOne({
        userId: ctx.userId,
        platform: "whatsapp_business",
        isActive: true,
      });
      if (!conn?.accessToken || !conn.phoneNumberId) {
        throw new GraphQLError("WhatsApp Business not connected — add your API token in Settings → Platforms", {
          extensions: { code: "NOT_CONNECTED" },
        });
      }

      // Send via Meta Cloud API
      let externalId: string;
      try {
        const { data } = await axios.post(
          `https://graph.facebook.com/v19.0/${conn.phoneNumberId}/messages`,
          {
            messaging_product: "whatsapp",
            to:      signal.sender,
            type:    "text",
            text:    { body: text },
          },
          { headers: { Authorization: `Bearer ${conn.accessToken}`, "Content-Type": "application/json" } }
        );
        externalId = data.messages?.[0]?.id ?? `local_${Date.now()}`;
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Failed to send message";
        throw new GraphQLError(msg, { extensions: { code: "SEND_FAILED" } });
      }

      const doc = await ChatMessage.create({
        agencyId:     ctx.userId,
        signalId:     signal._id,
        platform:     "whatsapp",
        direction:    "outbound",
        senderName:   "Agency",
        senderHandle: conn.displayPhone ?? "agency",
        text,
        messageType:  "text",
        externalId,
        timestamp:    new Date(),
      });

      return serializeMsg(doc);
    },

    /** Import existing conversation history from a platform */
    importPlatformMessages: async (
      _: unknown,
      { platform }: { platform: string },
      ctx: AuthContext
    ) => {
      if (!ctx.userId) throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHORIZED" } });

      if (platform === "instagram" || platform === "instagram_dm") {
        return importInstagramConversations(ctx.userId);
      }
      if (platform === "whatsapp" || platform === "whatsapp_business") {
        return importWhatsAppConversations(ctx.userId);
      }
      throw new GraphQLError(`Unknown platform: ${platform}`, { extensions: { code: "BAD_USER_INPUT" } });
    },

    /** Disconnect a platform */
    disconnectPlatform: async (
      _: unknown,
      { platform }: { platform: string },
      ctx: AuthContext
    ) => {
      if (!ctx.userId) throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHORIZED" } });
      await PlatformConnection.findOneAndUpdate(
        { userId: ctx.userId, platform },
        { $set: { isActive: false } }
      );
      return true;
    },
  },
};

function serializeConn(doc: InstanceType<typeof PlatformConnection>) {
  return {
    id:            doc._id.toString(),
    platform:      doc.platform,
    isActive:      doc.isActive,
    displayPhone:  doc.displayPhone  ?? null,
    igUsername:    doc.igUsername    ?? null,
    createdAt:     doc.createdAt.toISOString(),
  };
}

function serializeMsg(doc: InstanceType<typeof ChatMessage>) {
  return {
    id:           doc._id.toString(),
    signalId:     doc.signalId.toString(),
    platform:     doc.platform,
    direction:    doc.direction,
    senderName:   doc.senderName,
    senderHandle: doc.senderHandle,
    text:         doc.text,
    messageType:  doc.messageType,
    mediaUrl:     doc.mediaUrl ?? null,
    timestamp:    doc.timestamp.toISOString(),
  };
}

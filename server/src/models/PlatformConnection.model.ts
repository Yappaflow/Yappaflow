import mongoose, { Schema, Document, Types } from "mongoose";

export type ConnectedPlatform = "whatsapp" | "whatsapp_business" | "instagram" | "instagram_dm";

export interface IPlatformConnection extends Document {
  userId:        Types.ObjectId;
  platform:      ConnectedPlatform;

  // WhatsApp Business
  wabaId?:         string;   // WhatsApp Business Account ID
  phoneNumberId?:  string;   // Meta Phone Number ID
  displayPhone?:   string;   // e.g. +905551234567

  // Instagram DM
  igAccountId?:  string;   // IG Business Account ID
  igUserId?:     string;   // IG User ID
  igUsername?:   string;

  // Common
  accessToken:   string;   // Meta access token (never expose to client)
  isActive:      boolean;
  createdAt:     Date;
  updatedAt:     Date;
}

const PlatformConnectionSchema = new Schema<IPlatformConnection>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    platform:     { type: String, enum: ["whatsapp", "whatsapp_business", "instagram", "instagram_dm"], required: true },
    wabaId:       { type: String },
    phoneNumberId:{ type: String },
    displayPhone: { type: String },
    igAccountId:  { type: String },
    igUserId:     { type: String },
    igUsername:   { type: String },
    accessToken:  { type: String, required: true },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

// One connection per platform per user
PlatformConnectionSchema.index({ userId: 1, platform: 1 }, { unique: true });

export const PlatformConnection =
  mongoose.models.PlatformConnection ??
  mongoose.model<IPlatformConnection>("PlatformConnection", PlatformConnectionSchema);

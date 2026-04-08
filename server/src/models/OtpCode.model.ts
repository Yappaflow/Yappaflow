import mongoose, { Schema, Document } from "mongoose";

export type OtpPurpose = "whatsapp_login" | "phone_verify";

export interface IOtpCode extends Document {
  recipient: string; // phone number or email
  code: string;
  purpose: OtpPurpose;
  expiresAt: Date;
  used: boolean;
  attempts: number;
}

const OtpCodeSchema = new Schema<IOtpCode>({
  recipient: { type: String, required: true },
  code: { type: String, required: true },
  purpose: {
    type: String,
    enum: ["whatsapp_login", "phone_verify"],
    required: true,
  },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
});

// Auto-delete expired documents
OtpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpCode = mongoose.model<IOtpCode>("OtpCode", OtpCodeSchema);

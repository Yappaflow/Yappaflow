import twilio from "twilio";
import { OtpCode, OtpPurpose } from "../models/OtpCode.model";
import { env } from "../config/env";
import { log } from "../utils/logger";

const MAX_ATTEMPTS = 5;
const OTP_EXPIRY_MINUTES = 10;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendWhatsappOtp(phone: string): Promise<void> {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any existing OTPs for this recipient
  await OtpCode.deleteMany({ recipient: phone, purpose: "whatsapp_login" });

  await OtpCode.create({ recipient: phone, code, purpose: "whatsapp_login", expiresAt });

  if (env.twilioAccountSid && env.twilioAuthToken) {
    const client = twilio(env.twilioAccountSid, env.twilioAuthToken);
    await client.messages.create({
      from: env.twilioWhatsappFrom,
      to: `whatsapp:${phone}`,
      body: `Your Yappaflow verification code is: *${code}*\n\nThis code expires in ${OTP_EXPIRY_MINUTES} minutes. Do not share it.`,
    });
  } else {
    // Dev fallback — log to console
    log(`[DEV] WhatsApp OTP for ${phone}: ${code}`);
  }
}

export async function sendPhoneVerifyOtp(phone: string): Promise<void> {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await OtpCode.deleteMany({ recipient: phone, purpose: "phone_verify" });

  await OtpCode.create({ recipient: phone, code, purpose: "phone_verify", expiresAt });

  if (env.twilioAccountSid && env.twilioAuthToken && env.twilioSmsFrom) {
    const client = twilio(env.twilioAccountSid, env.twilioAuthToken);
    await client.messages.create({
      from: env.twilioSmsFrom,
      to: phone,
      body: `Your Yappaflow phone verification code is: ${code}\n\nExpires in ${OTP_EXPIRY_MINUTES} minutes.`,
    });
  } else {
    log(`[DEV] SMS OTP for ${phone}: ${code}`);
  }
}

export async function verifyOtp(
  recipient: string,
  code: string,
  purpose: OtpPurpose
): Promise<boolean> {
  const record = await OtpCode.findOne({ recipient, purpose, used: false });

  if (!record) return false;

  if (record.expiresAt < new Date()) {
    await record.deleteOne();
    return false;
  }

  record.attempts += 1;
  if (record.attempts > MAX_ATTEMPTS) {
    await record.deleteOne();
    return false;
  }

  if (record.code !== code) {
    await record.save();
    return false;
  }

  record.used = true;
  await record.save();
  return true;
}

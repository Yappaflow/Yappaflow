import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || "4000", 10),
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/yappaflow",
  nodeEnv: process.env.NODE_ENV || "development",

  // JWT
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  // Twilio (WhatsApp OTP + SMS)
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioWhatsappFrom: process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886", // Twilio sandbox
  twilioSmsFrom: process.env.TWILIO_SMS_FROM || "",

  // Instagram OAuth
  instagramClientId: process.env.INSTAGRAM_CLIENT_ID || "",
  instagramClientSecret: process.env.INSTAGRAM_CLIENT_SECRET || "",
  instagramRedirectUri:
    process.env.INSTAGRAM_REDIRECT_URI ||
    "http://localhost:4000/auth/instagram/callback",

  // Frontend URL (for redirects after OAuth)
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
} as const;

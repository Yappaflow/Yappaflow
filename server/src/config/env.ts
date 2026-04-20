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
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3001",

  // Meta webhook verification token (set in Meta Developer Console)
  metaWebhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || "yappaflow_webhook_verify",

  // Meta WhatsApp Embedded Signup (reuses Instagram app if same Meta app)
  metaAppId:        process.env.META_APP_ID     || process.env.INSTAGRAM_CLIENT_ID     || "",
  metaAppSecret:    process.env.META_APP_SECRET  || process.env.INSTAGRAM_CLIENT_SECRET || "",
  whatsappConfigId: process.env.WHATSAPP_CONFIG_ID || "",

  // Chat message encryption at rest (AES-256-GCM)
  // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  encryptionMasterKey: process.env.ENCRYPTION_MASTER_KEY || "",

  // Anthropic (Claude AI Engine)
  anthropicApiKey:    process.env.ANTHROPIC_API_KEY || "",
  anthropicModel:    process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
  anthropicMaxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || "4096", 10),
  aiMockMode:        process.env.AI_MOCK_MODE === "true" || !process.env.ANTHROPIC_API_KEY,

  // Deploy Hub — registrar + host affiliate deep-links (no API integration)
  namecheapAffiliateId: process.env.NAMECHEAP_AFFILIATE_ID || "",
  hostingerAffiliateUrl: process.env.HOSTINGER_AFFILIATE_URL || "https://www.hostinger.com/web-hosting",

  // Shopify OAuth (Public/Custom app credentials — Partner dashboard)
  // Redirect URI must be registered in the Shopify Partner app settings.
  shopifyApiKey:      process.env.SHOPIFY_API_KEY     || "",
  shopifyApiSecret:   process.env.SHOPIFY_API_SECRET  || "",
  shopifyScopes:      process.env.SHOPIFY_SCOPES      || "write_themes,read_themes,write_products,read_products",
  shopifyRedirectUri: process.env.SHOPIFY_REDIRECT_URI || "http://localhost:4000/auth/shopify/callback",
  shopifyApiVersion:  process.env.SHOPIFY_API_VERSION  || "2024-10",
} as const;

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

  // ── AI Engine (primary: DeepSeek, fallback: OpenRouter) ─────────────
  //
  // Yappaflow's code-generation engine runs on pay-per-token APIs. We
  // talk to them through the official `openai` npm package by overriding
  // `baseURL` + `apiKey` — both DeepSeek and OpenRouter are OpenAI-SDK
  // compatible. No self-hosted GPUs, no fixed monthly server cost.
  //
  //   AI_PROVIDER=deepseek    (default; flip to "openrouter" to bypass)
  //   AI_FALLBACK_PROVIDER=openrouter   (set to "none" to disable fallback)
  //
  // DeepSeek models we use:
  //   - deepseek-chat     (general / Next.js code gen; V3)
  //   - deepseek-coder    (pure code tasks)
  //
  // OpenRouter is our fallback — route to the cheapest open-weight model
  // available at request time. Default to Qwen 2.5 Coder 32B (fast, cheap,
  // strong on React). Override via OPENROUTER_MODEL at any time without
  // touching code.
  aiProvider:         (process.env.AI_PROVIDER          || "deepseek") as "deepseek" | "openrouter",
  aiFallbackProvider: (process.env.AI_FALLBACK_PROVIDER || "openrouter") as "deepseek" | "openrouter" | "none",
  aiMaxTokens:        parseInt(process.env.AI_MAX_TOKENS || "4096", 10),
  aiTemperature:      parseFloat(process.env.AI_TEMPERATURE || "0.7"),

  // DeepSeek (primary)
  deepseekApiKey:  process.env.DEEPSEEK_API_KEY  || "",
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
  deepseekModel:   process.env.DEEPSEEK_MODEL    || "deepseek-chat",

  // OpenRouter (fallback). Referer + title are optional branding headers
  // OpenRouter displays on their leaderboard for apps using their gateway.
  openrouterApiKey:   process.env.OPENROUTER_API_KEY   || "",
  openrouterBaseUrl:  process.env.OPENROUTER_BASE_URL  || "https://openrouter.ai/api/v1",
  openrouterModel:    process.env.OPENROUTER_MODEL     || "google/gemini-2.5-flash-lite",
  openrouterReferer:  process.env.OPENROUTER_REFERER   || "https://yappaflow.app",
  openrouterAppTitle: process.env.OPENROUTER_APP_TITLE || "Yappaflow",

  // ── Per-phase model selection ───────────────────────────────────────
  //
  // Yappaflow's AI pipeline has 3 phases with very different needs:
  //
  //   analyzing   → parse Turkish WhatsApp/IG chats into structured
  //                 business-identity JSON. Language quality dominates;
  //                 DeepSeek V3.2's Turkish is weaker than Google's or
  //                 Alibaba's. Default to Gemini 2.5 Flash Lite on
  //                 OpenRouter (cheap + strong Turkish + 1M context).
  //
  //   planning    → turn analysis JSON into an architecture plan.
  //                 Reasoning over structured data, language-light,
  //                 DeepSeek V3.2 is a sweet spot on cost/quality.
  //
  //   generating  → emit Next.js / Shopify / WP / Webflow code. Pure
  //                 code generation. Default to Qwen3-Coder 480B on
  //                 OpenRouter — purpose-built code model with 262k
  //                 context, ~$0.22/$1.00 per 1M. Switched away from
  //                 DeepSeek V3.2 on 2026-04-21 because V3.2's design
  //                 quality on Shopify themes was consistently weak
  //                 (default Dawn shapes, Inter hero type, centered
  //                 safe composition — the "free AI" look).
  //
  // Any of {PROVIDER,MODEL} may be left unset — the resolver falls back
  // to the global primary/fallback provider + its default model.
  aiAnalysisProvider:   (process.env.AI_ANALYSIS_PROVIDER   || "openrouter") as "deepseek" | "openrouter" | "",
  aiAnalysisModel:       process.env.AI_ANALYSIS_MODEL      || "google/gemini-2.5-flash-lite",
  aiPlanningProvider:   (process.env.AI_PLANNING_PROVIDER   || "deepseek") as "deepseek" | "openrouter" | "",
  aiPlanningModel:       process.env.AI_PLANNING_MODEL      || "deepseek-chat",
  aiGenerationProvider: (process.env.AI_GENERATION_PROVIDER || "openrouter") as "deepseek" | "openrouter" | "",
  aiGenerationModel:     process.env.AI_GENERATION_MODEL    || "qwen/qwen3-coder",

  // Legacy Anthropic settings — kept for backwards compatibility with
  // unrelated callers; no longer drives code generation.
  anthropicApiKey:    process.env.ANTHROPIC_API_KEY || "",
  anthropicModel:     process.env.ANTHROPIC_MODEL   || "claude-sonnet-4-20250514",
  anthropicMaxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || "4096", 10),

  // Mock mode — true when explicitly set OR when the active provider has
  // no API key configured. Lets local dev + tests run without credentials.
  aiMockMode:
    process.env.AI_MOCK_MODE === "true" ||
    (!process.env.DEEPSEEK_API_KEY && !process.env.OPENROUTER_API_KEY && !process.env.ANTHROPIC_API_KEY),

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

  // Webflow OAuth (Workspace app credentials — Webflow → Workspace settings →
  // "Apps & integrations" → "Develop apps"). Register the redirect URI and
  // the scopes listed below; the Data API v2 is the one we talk to.
  //
  // For a single-store install you can skip OAuth and just paste a
  // "Site API token" into WEBFLOW_SITE_API_TOKEN — we fall back to that when
  // no user-specific OAuth token is on file.
  //
  // Minimum scopes we need:
  //   sites:read  sites:write      (create/publish sites, push pages)
  //   cms:read    cms:write        (collections + items for blog/portfolio)
  //   ecommerce:read ecommerce:write (products for e-commerce clients)
  //   assets:read assets:write     (upload product images + theme assets)
  //   authorized_user:read         (identify the installing user)
  webflowClientId:     process.env.WEBFLOW_CLIENT_ID     || "",
  webflowClientSecret: process.env.WEBFLOW_CLIENT_SECRET || "",
  webflowScopes:       process.env.WEBFLOW_SCOPES        ||
    "sites:read sites:write cms:read cms:write ecommerce:read ecommerce:write assets:read assets:write authorized_user:read",
  webflowRedirectUri:  process.env.WEBFLOW_REDIRECT_URI  || "http://localhost:4000/auth/webflow/callback",
  webflowApiBase:      process.env.WEBFLOW_API_BASE      || "https://api.webflow.com",
  webflowApiVersion:   process.env.WEBFLOW_API_VERSION   || "2.0.0",
  /** Fallback single-tenant Site API token. If set, the service will use it
   *  when no per-user PlatformConnection exists. Optional. */
  webflowSiteApiToken: process.env.WEBFLOW_SITE_API_TOKEN || "",

  // WordPress
  //
  // Yappaflow supports TWO WordPress connection flavors:
  //
  //   1. Self-hosted (WordPress.org). No server-side credentials required —
  //      each agency pastes their own WordPress site URL + username + an
  //      Application Password they generate in Users → Profile →
  //      "Application Passwords" (core feature since WP 5.6). We send that
  //      token as HTTP Basic Auth on every REST call. This is the default
  //      path; there is nothing to configure on our side.
  //
  //   2. WordPress.com (or Jetpack-managed). OAuth 2.0 via
  //      https://public-api.wordpress.com/oauth2 . Requires a developer app
  //      at https://developer.wordpress.com/apps/ with our redirect URI
  //      registered. Scope "global" gives read/write over the user's sites.
  //
  // Recommended scopes for WP.com apps: "global".
  // Redirect URI must match what's registered in the app settings.
  wordpressClientId:     process.env.WORDPRESS_CLIENT_ID     || "",
  wordpressClientSecret: process.env.WORDPRESS_CLIENT_SECRET || "",
  wordpressScopes:       process.env.WORDPRESS_SCOPES        || "global",
  wordpressRedirectUri:  process.env.WORDPRESS_REDIRECT_URI  || "http://localhost:4000/auth/wordpress/callback",
  /** REST API version prefix for self-hosted sites. Core uses "wp/v2"; we
   *  talk to WooCommerce Store API via "wc/v3" when the plugin is active. */
  wordpressApiVersion:   process.env.WORDPRESS_API_VERSION   || "wp/v2",

  // ikas OAuth (Partner app credentials — https://ikas.dev)
  //
  // Each ikas store runs on `<name>.myikas.com`. The OAuth flow is the
  // standard Authorization Code grant:
  //
  //   1. Authorize URL:  https://<store>.myikas.com/admin/oauth/authorize
  //      ?client_id=…&redirect_uri=…&scope=…&state=…&response_type=code
  //   2. Token endpoint: https://<store>.myikas.com/api/admin/oauth/token
  //      (`client_credentials` also supported for server-to-server — we
  //      don't use it here; Yappaflow is multi-tenant.)
  //
  // Admin API: GraphQL over HTTPS at https://api.myikas.com/api/v1/admin/graphql
  // Partner dashboard: https://ikas.dev → Apps → Create new app.
  //
  // Scopes we request (minimum for product + theme push):
  //   read_products write_products
  //   read_categories write_categories
  //   read_themes write_themes
  //   read_orders (optional — needed only if we persist order state)
  ikasClientId:     process.env.IKAS_CLIENT_ID     || "",
  ikasClientSecret: process.env.IKAS_CLIENT_SECRET || "",
  ikasScopes:       process.env.IKAS_SCOPES        ||
    "read_products write_products read_categories write_categories read_themes write_themes",
  ikasRedirectUri:  process.env.IKAS_REDIRECT_URI  || "http://localhost:4000/auth/ikas/callback",
  ikasApiBase:      process.env.IKAS_API_BASE      || "https://api.myikas.com",
  ikasApiVersion:   process.env.IKAS_API_VERSION   || "v1",
  ikasAdminDomainSuffix: process.env.IKAS_ADMIN_DOMAIN_SUFFIX || "myikas.com",
} as const;

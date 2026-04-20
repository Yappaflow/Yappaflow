import mongoose, { Schema, Document, Types } from "mongoose";

export type ConnectedPlatform =
  | "whatsapp"
  | "whatsapp_business"
  | "instagram"
  | "instagram_dm"
  | "shopify"
  | "webflow"
  | "wordpress"
  | "ikas";

export type WordPressFlavor = "self_hosted" | "dotcom";

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

  // Shopify
  shopDomain?:    string;    // e.g. "yappaflow-demo.myshopify.com"
  shopifyScopes?: string;    // granted scopes, comma-separated as returned by Shopify

  // Webflow (Data API v2, OAuth Workspace app)
  webflowWorkspaceId?: string;  // Workspace the user authorized us on
  webflowSiteId?:      string;  // Default site we push to (most recent install)
  webflowScopes?:      string;  // Space-separated scopes returned by Webflow
  webflowRefreshToken?: string; // Optional — Webflow tokens are currently long-lived

  // WordPress
  //
  // Two flavors are supported:
  //
  //   "self_hosted" — the merchant's own WordPress.org install. We auth via
  //   "Application Passwords" (core feature since WP 5.6): the user pastes
  //   a 24-char token they generated in their profile, we send it as HTTP
  //   Basic Auth on every REST call. `accessToken` stores that application
  //   password (encrypted), `wordpressUsername` the login name it belongs to.
  //
  //   "dotcom" — WordPress.com (or any site on a Jetpack-connected host).
  //   OAuth 2.0 flow via public-api.wordpress.com; `accessToken` stores the
  //   bearer token.
  //
  // `wordpressSiteUrl` is the REST API base — e.g. "https://example.com"
  // (we append "/wp-json/wp/v2/...").
  wordpressSiteUrl?:            string;
  wordpressFlavor?:             WordPressFlavor;
  wordpressUsername?:           string;  // self_hosted only (basic-auth user)
  wordpressScopes?:             string;  // dotcom only (OAuth granted scopes)
  wordpressSiteId?:             string;  // dotcom only (numeric WP.com blog id)
  wordpressWooCommerceEnabled?: boolean; // cached at connect-time; refreshed on publish

  // ikas (Turkish e-commerce SaaS — https://ikas.com)
  //
  // Each merchant runs on `<storeName>.myikas.com`. We authenticate via
  // OAuth 2.0 Authorization Code against `api.myikas.com/oauth/token`; the
  // resulting access token carries a short TTL (3600s) and Comes with a
  // refresh token we persist so background pushes don't require the user
  // to reconnect every hour.
  ikasStoreName?:   string;  // e.g. "yappaflow-demo"
  ikasMerchantId?:  string;  // numeric/string id returned by /admin/me
  ikasScopes?:      string;  // space-separated scopes returned by ikas
  ikasRefreshToken?: string; // refresh token (plaintext — low-sensitivity, rotates with access token)
  ikasTokenExpiresAt?: Date; // absolute expiry of `accessToken`

  // Common
  accessToken:        string;   // Encrypted access token (ciphertext hex)
  accessTokenIv?:     string;   // AES-GCM IV (hex) — present when encrypted
  accessTokenKeyId?:  string;   // Encryption key version — present when encrypted
  isActive:           boolean;
  createdAt:          Date;
  updatedAt:          Date;
}

const PlatformConnectionSchema = new Schema<IPlatformConnection>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    platform:     { type: String, enum: ["whatsapp", "whatsapp_business", "instagram", "instagram_dm", "shopify", "webflow", "wordpress", "ikas"], required: true },
    wabaId:       { type: String },
    phoneNumberId:{ type: String },
    displayPhone: { type: String },
    igAccountId:  { type: String },
    igUserId:     { type: String },
    igUsername:   { type: String },
    shopDomain:    { type: String },
    shopifyScopes: { type: String },
    webflowWorkspaceId:  { type: String },
    webflowSiteId:       { type: String },
    webflowScopes:       { type: String },
    webflowRefreshToken: { type: String },
    wordpressSiteUrl:            { type: String },
    wordpressFlavor:             { type: String, enum: ["self_hosted", "dotcom"] },
    wordpressUsername:           { type: String },
    wordpressScopes:             { type: String },
    wordpressSiteId:             { type: String },
    wordpressWooCommerceEnabled: { type: Boolean },
    ikasStoreName:      { type: String },
    ikasMerchantId:     { type: String },
    ikasScopes:         { type: String },
    ikasRefreshToken:   { type: String },
    ikasTokenExpiresAt: { type: Date },
    accessToken:       { type: String, required: true },
    accessTokenIv:     { type: String },
    accessTokenKeyId:  { type: String },
    isActive:          { type: Boolean, default: true },
  },
  { timestamps: true }
);

// One connection per platform per user
PlatformConnectionSchema.index({ userId: 1, platform: 1 }, { unique: true });

export const PlatformConnection =
  mongoose.models.PlatformConnection ??
  mongoose.model<IPlatformConnection>("PlatformConnection", PlatformConnectionSchema);

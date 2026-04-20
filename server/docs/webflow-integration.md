# Webflow integration — setup notes

The Webflow integration mirrors the Shopify one: OAuth connect, push
generated bundle, CMS + Ecommerce via Webflow Data API v2, HMAC-verified
webhooks. Everything lives under:

```
server/src/services/webflow-auth.service.ts
server/src/services/webflow-admin.service.ts     # site + CMS + product push
server/src/services/webflow-generator.service.ts # AI bundle generator
server/src/services/webflow-webhook.service.ts
server/src/routes/webflow.route.ts               # /auth/webflow/* + /auth/webflow/push
server/src/routes/webflow-webhooks.route.ts      # /webhook/webflow/*
server/src/ai/prompts/generate-webflow.prompt.ts
```

## Which API key do I get?

You have **two paths** depending on whether Yappaflow is multi-tenant (many
agencies connecting their own Webflow workspaces) or single-tenant (you
are pushing to one Webflow site you own):

### Multi-tenant — Webflow **OAuth App** (recommended, matches Shopify)

1. Go to **Webflow → Workspace settings → Apps & integrations → Develop apps**.
2. Click **Create an app** (Workspace App, not a Site App).
3. Copy **Client ID** and **Client Secret** into your `.env`:

   ```
   WEBFLOW_CLIENT_ID=<from Webflow app>
   WEBFLOW_CLIENT_SECRET=<from Webflow app>
   WEBFLOW_REDIRECT_URI=https://<your-server>/auth/webflow/callback
   ```

4. In the Webflow app settings, add that same redirect URI and request
   these **scopes** (the defaults in `env.webflowScopes` already list them):

   ```
   sites:read  sites:write
   cms:read    cms:write
   ecommerce:read  ecommerce:write
   assets:read assets:write
   authorized_user:read
   ```

5. Submit for install (or use the app in "unlisted" mode while testing).
6. The OAuth flow:
   `GET /auth/webflow/authorize` → Webflow consent → `GET /auth/webflow/callback`
   → token stored (encrypted) on `PlatformConnection { userId, platform: "webflow" }`.

### Single-tenant — Webflow **Site API token** (fastest, no OAuth)

If you only ever push to one Webflow site (your own demo / staging):

1. Go to **Webflow → Site settings → Apps & integrations → API access**.
2. Click **Generate API token**, grant the scopes above.
3. Paste into `.env` as:

   ```
   WEBFLOW_SITE_API_TOKEN=<token>
   ```

The push endpoint (`POST /auth/webflow/push`) automatically falls back to
this token when no per-user OAuth connection is on file.

## Webhooks

Webflow signs webhooks with HMAC-SHA256 over `${timestamp}:${body}` using
your **client secret** (`WEBFLOW_CLIENT_SECRET` above — same value). Our
server verifies the `x-webflow-signature` + `x-webflow-timestamp` headers
with a 5-minute clock skew window.

Register these URLs in the Webflow app:

```
POST https://<your-server>/webhook/webflow/site-publish
POST https://<your-server>/webhook/webflow/app-uninstalled
POST https://<your-server>/webhook/webflow/ecomm-new-order
```

## End-to-end flow

```
conversation → ProjectIdentity
              → generateWebflowBundle(projectId, agencyId)
                → GeneratedArtifact(platform="webflow") rows
              → (a) ZIP download via /deploy/.../download  (existing path)
                (b) /auth/webflow/push                     (new — pushes to Webflow)
```

Products follow the same `Project.identity.products` model used by the
Shopify exporter, so an e-commerce client works for both platforms with
zero code change in the extraction layer.

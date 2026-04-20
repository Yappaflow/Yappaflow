# ikas Integration — Operator Notes

Yappaflow treats ikas (Turkish e-commerce SaaS, <https://ikas.com>) the same
way it treats Shopify and Webflow: a full OAuth 2.0 install, an admin-API
pusher that uploads a generated storefront theme **and** product catalog,
and HMAC-verified webhooks. This doc is aimed at whoever has to wire up the
credentials and register the app in the ikas partner portal.

## What you need from ikas

Create an app at <https://ikas.dev> → *Apps* → *Create new app*.

Register these settings on the app:

| Setting           | Value                                                                 |
|-------------------|-----------------------------------------------------------------------|
| Redirect URI      | `https://<your-host>/auth/ikas/callback`                              |
| Scopes (minimum)  | `read_products write_products read_categories write_categories read_themes write_themes` |
| Webhooks          | Subscribe to `app.uninstalled`, `order.created`, `product.updated`    |
| Webhook URLs      | `https://<your-host>/webhook/ikas/{app-uninstalled,order-created,product-updated}` |

The ikas admin API is GraphQL at
`https://api.myikas.com/api/v1/admin/graphql` — we already default
`IKAS_API_BASE` to that host so a partner app with the standard setup needs
zero extra config.

## Environment variables

All optional — the `/auth/ikas/config-status` endpoint reports whether the
integration is configured so the dashboard can hide the "Connect ikas"
button when it isn't.

```
IKAS_CLIENT_ID=<from partner dashboard>
IKAS_CLIENT_SECRET=<from partner dashboard>
IKAS_SCOPES="read_products write_products read_categories write_categories read_themes write_themes"
IKAS_REDIRECT_URI=https://<your-host>/auth/ikas/callback

# Defaults below are usually fine:
IKAS_API_BASE=https://api.myikas.com
IKAS_API_VERSION=v1
IKAS_ADMIN_DOMAIN_SUFFIX=myikas.com
```

`IKAS_CLIENT_SECRET` is ALSO the HMAC key the webhook verifier uses, so
it has to be set before ikas can reach us via webhook.

## OAuth flow

Each merchant runs on `<storeName>.myikas.com`. The authorize URL is
store-scoped — we need the store subdomain up front:

```
GET /auth/ikas/authorize?store=<name>   (Yappaflow JWT required)
  → 302 https://<name>.myikas.com/admin/oauth/authorize?client_id=…&state=…
```

The callback verifies a signed `state` that carries `{ userId, store }`,
exchanges the code for `{ access_token, refresh_token, expires_in }` at
`https://<name>.myikas.com/api/admin/oauth/token`, hits the GraphQL `me`
query for the merchant id, and upserts a `PlatformConnection` keyed on
`{ userId, platform: "ikas" }`.

Access tokens are short-lived (~1h). The `POST /auth/ikas/push` handler
installs an auto-refresh interceptor on the GraphQL client — on the first
401 it hits `/api/admin/oauth/token` with the stored refresh token, rotates
both tokens on the `PlatformConnection`, and retries the original request
once.

## Push

```
POST /auth/ikas/push
Authorization: Bearer <yappaflow jwt>
{
  "projectId": "<id>",
  "pushTheme": true,
  "themeName": "optional"
}
```

The pusher:

1. Upserts a category from `Project.identity.industry` (silently skipped
   on failure — categories are a nice-to-have).
2. If `pushTheme !== false`, calls `createThemeVersion(cloneFromPublished:
   true)` to open a **draft** version, then uploads every
   `GeneratedArtifact` whose `filePath` starts with `theme/`. We never
   auto-publish — the merchant previews + publishes from the ikas admin.
3. Runs `saveProduct` for each product in `Project.identity.products`
   (variants nested inline, SKUs derived from the product slug).

Output shape:

```json
{
  "ok": true,
  "result": {
    "themeVersionId": "…",
    "themeName": "Yappaflow – <business>",
    "themeFiles": 16,
    "categoriesCreated": 1,
    "productsCreated": 4,
    "productIds": ["…", "…"]
  }
}
```

## Webhooks

Mounted with `express.raw({ type: "application/json" })` so the HMAC
(`x-ikas-signature` = `base64(hmac-sha256(body, IKAS_CLIENT_SECRET))`)
verifies against the exact bytes ikas sent.

| Endpoint                           | Handler                    | Behavior                                                    |
|------------------------------------|----------------------------|-------------------------------------------------------------|
| `POST /webhook/ikas/app-uninstalled` | `handleAppUninstalled`   | Deletes every `PlatformConnection` for that `merchantId`.   |
| `POST /webhook/ikas/order-created`  | `handleOrderCreated`      | Logs only (no order persistence yet).                       |
| `POST /webhook/ikas/product-updated`| `handleProductUpdated`    | Logs only (no mirror back into Yappaflow yet).              |
| `GET  /webhook/ikas/heartbeat`      | inline                     | Liveness probe for ikas's webhook health check.             |

All handlers return 200 once the signature verifies, even when the JSON
body is malformed — otherwise ikas would retry forever on our bug.

## Generated bundle

`ikas-generator.service.ts` produces these artifacts (all persisted as
`GeneratedArtifact` with `platform: "ikas"`):

```
README.txt                    — agency handoff note
theme/theme.json              — theme settings schema
theme/layout/theme.html       — base layout with light/dark toggle
theme/templates/*.html        — home, product, collection, cart, page.about, page.contact
theme/partials/*.html         — header, footer, hero, product-card, theme-toggle
theme/assets/theme.css        — all styling (no external CDNs)
theme/assets/theme.js         — cart Ajax + theme toggle + respects prefers-reduced-motion
theme/locales/en.json         — English strings
theme/locales/tr.json         — Turkish strings (ikas is a Turkish platform)
products.json                 — deterministic catalog (Admin-API-friendly shape)
```

The `theme/` prefix is how `ikas-admin.service.ts` finds theme assets
(`a.filePath.startsWith("theme/")`) — keep it, the pusher strips it before
uploading so the on-store paths are what the theme expects.

## Standing rules (Yappaflow-wide)

* Light by default, dark toggle mandatory. The toggle reads
  `localStorage.yappaflow_theme` → `prefers-color-scheme` → light, and sets
  `document.documentElement.dataset.theme` **before first paint** via an
  inline script in `layout/theme.html`. Both palettes pass WCAG AA.
* System-font stacks only — no external fonts, no CDN scripts.
* Bilingual en + tr locales are non-negotiable on ikas.

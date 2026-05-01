# Testing Yappaflow without an Anthropic API key

Until you buy the production key, the server runs a fully wired **mock mode**
that stands in for every AI call. The real Shopify / Webflow / WordPress /
iKAS Admin APIs still run for real — only the theme-generation step is
mocked. That means every integration can be tested end-to-end for the
**ZIP-download** path, and to the first real API call for the **direct push**
path (where you'll need a test-store token per platform).

---

## 1. Turning mock mode on

Mock mode auto-enables whenever `ANTHROPIC_API_KEY` is not set. You have two
options:

**Option A — don't set the key.** Simplest. Just don't put `ANTHROPIC_API_KEY`
in Railway's env vars. The server logs `[AI MOCK] …` on every generation.

**Option B — force mock mode even with a key present.** Useful if you buy the
key but still want deterministic local runs:

```
AI_MOCK_MODE=true
```

The relevant code lives in `server/src/config/env.ts:45`:

```ts
aiMockMode: process.env.AI_MOCK_MODE === "true" || !process.env.ANTHROPIC_API_KEY
```

You can confirm it's active by hitting any generate endpoint and watching
Railway logs — you'll see `[AI MOCK] Returning mock Shopify theme bundle`
(or the equivalent for the other CMSes) instead of `🛍 Generating Shopify
bundle for project…` followed by a real API call.

---

## 2. What each mock covers

All mock output lives under `server/src/ai/`:

| Mock                        | File                         | Files in bundle |
|-----------------------------|------------------------------|-----------------|
| Business identity extraction| `mock-data.ts` MOCK_IDENTITY | n/a (JSON)      |
| Custom static site          | `mock-data.ts` MOCK_STATIC_SITE | 5 HTML/CSS/JS |
| **Shopify theme**           | `mock-bundles.ts`            | 18 Liquid/JSON  |
| **Webflow bundle**          | `mock-bundles.ts`            | 8 files         |
| **WordPress theme**         | `mock-bundles.ts`            | 20 PHP + HTML   |
| **iKAS theme**              | `mock-bundles.ts`            | 17 HBS-style    |

Each CMS bundle is minimum-viable but structurally valid. Shopify has the
strictest gate (`validateShopifyBundle` parses every .liquid through the
official @shopify/liquid-html-parser and every .json through JSON.parse);
the mock is verified to pass that gate — so you'll never hit the
"filepath-fenced blocks" error on the mock path.

---

## 3. Testing each integration

### 3.1 Shopify (ZIP path — fully testable today)

1. Log into Yappaflow (`/auth`), import a WhatsApp chat (you can use
   `sample-data/whatsapp-luma-candles-export.txt`).
2. Wait for identity extraction — returns `MOCK_IDENTITY`
   ("Butik Mode", Istanbul). Optional: edit products in the project editor.
3. Go to **Deploy Hub → Shopify**.
4. Server calls `shopify-generator.service.ts`, hits the mock, builds the
   18-file ZIP + Shopify-compatible `products.csv`, persists the artifacts.
5. Click **Download** — you get a real importable ZIP.
6. In Shopify Admin: **Online Store → Themes → Upload theme** (upload ZIP),
   then **Products → Import** (upload products.csv).

### 3.2 Shopify (OAuth + Admin API push path — needs a test store)

You have the Partner-app OAuth + webhooks wired. Test against a Shopify
**development store** (free for Partners):

1. Go to partners.shopify.com → Stores → Add store → Development store.
2. In your Partner app settings, set `APP_URL` to your Railway origin and
   `ALLOWED_REDIRECTION_URLS` to `${API}/auth/shopify/callback`.
3. From Yappaflow Settings → Platforms → **Connect Shopify**, install on your
   dev store. OAuth completes and a `PlatformConnection` row is created.
4. Click **Publish to Shopify** — the Admin API push runs for real against
   your dev store (no mock). You'll see products, theme, and pages appear.

### 3.3 Webflow (ZIP path — fully testable today)

Same as 3.1, but click **Webflow** in Deploy Hub. The download gives you
`site/index.html`, custom-code snippets for head/body, a collections
schema, and a `products.json`. Paste the custom-code snippets into
Project Settings → Custom Code in Webflow Designer; import the HTML body
into a page; create the collections from `collections.json`.

### 3.4 Webflow (Data API push — needs Webflow token)

Create a Webflow workspace, then in Workspace Settings → Integrations →
**API Access** generate a Site token. Connect it from Yappaflow Settings
→ Platforms → Webflow, then press **Publish**. The generator is still
mocked but `webflow-admin.service.ts` will make real Data API calls to
your workspace.

### 3.5 WordPress (ZIP path — fully testable today)

Click **WordPress** in Deploy Hub → download ZIP. Upload via
**Appearance → Themes → Add New → Upload Theme** in WP Admin. The
accompanying `pages/*.html` bodies are intended to be pasted into the
respective pages in the block editor.

### 3.6 WordPress (REST API push — needs self-hosted WP + app password)

In wp-admin: **Users → Profile → Application Passwords**, generate one.
Connect to Yappaflow with `username + app_password + site URL`. Publish
pushes the theme files and page content via the REST API.

### 3.7 iKAS (ZIP path — fully testable today)

Click **iKAS** in Deploy Hub → download ZIP. Upload via iKAS Admin →
**Storefront → Themes → Upload ZIP**.

### 3.8 iKAS (Storefront API push — needs iKAS merchant account)

Sign up at ikas.com (free tier or developer partner program), create a
store, then in Admin → **Settings → API Keys** generate a storefront key.
Connect from Yappaflow Settings → Platforms → iKAS, publish.

---

## 4. What you **can** test today without any third-party accounts

* Full chat ingestion flow (identity extraction is mocked).
* Full ZIP generation for all 4 CMSes (download works end-to-end).
* ZIP unzips to a structurally valid theme/bundle on disk.
* Shopify bundle specifically passes Liquid + JSON validation.
* Dashboard, project editor, deploy history, delete flow.

## 5. What you **cannot** test without accounts

* Direct OAuth flow to a specific Shopify store (needs Partner dev store).
* Direct API push to Webflow / WordPress / iKAS (needs per-platform tokens).
* Webhook callbacks from those platforms (needs them to know about your URL).

---

## 6. Flipping back to real AI when you buy the key

Just set `ANTHROPIC_API_KEY` on Railway. Nothing else changes. The mock
selector short-circuits only when the key is absent or `AI_MOCK_MODE=true`.

Verify in logs: you'll stop seeing `[AI MOCK] …` and start seeing the real
model markers ("🛍 Generating Shopify bundle for project…", token usage
numbers, etc.).

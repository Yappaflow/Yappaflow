/**
 * Shopify OS 2.0 adapter — emits a canonical theme folder (Dawn-shaped).
 *
 * Scope:
 *   - Correct folder layout (layout/, sections/, snippets/, assets/, templates/, config/, locales/)
 *   - Minimal *valid* Liquid for EVERY route Shopify expects (product, collection, cart,
 *     page, blog, article, search, 404, customers/*, password, gift_card). Without these,
 *     the storefront returns 404 on every URL except "/".
 *   - Theme settings schema seeded with DNA tokens (colors, type scale) so merchants can tweak
 *   - Dark-theme toggle via a standalone snippet file, rendered from layout via `{% render %}`
 *     — never string-interpolated into theme.liquid (that path historically triggered Liquid
 *     parse errors when the snippet grew inline <script> tags).
 *
 * Why so many files:
 *   A Shopify theme is rejected (or only partially rendered) if even one canonical template
 *   is missing. Merchants who upload a theme with only `templates/index.json` get a home page
 *   that works and 404s for everything else — which is exactly what we saw in the first pass.
 *
 * TODO (Phase 7+):
 *   - Upgrade main-product to a proper product page (variant picker, quantity, media gallery)
 *   - Replace the inline hero/feature sections with dynamic-section JSON templates
 *   - Add a metaobject-driven content pipeline so content blocks can be edited in admin
 *   - Generate locale strings from the brief (currently en.default.json carries the minimum)
 */

import type { Config } from "../../config.js";
import type { OpenRouterClient } from "../../llm/openrouter.js";
import type { Brief } from "../../tools/brief.js";
import type { MergedDna } from "../../tools/merge-dna.js";
import type { BuildOutput, ContentBlocks } from "../../tools/build-site.js";
import { DESIGN_DOCTRINE, DARK_THEME_TOGGLE_SNIPPET } from "../doctrine.js";

export async function buildShopify(params: {
  brief: Brief;
  mergedDna: MergedDna;
  content?: ContentBlocks;
  config: Config;
  llm: OpenRouterClient;
}): Promise<BuildOutput> {
  const { brief, mergedDna, content } = params;

  const heading = content?.copy?.heading ?? defaultHeading(brief);
  const subhead = content?.copy?.subhead ?? "[[ subhead: describe the product in one line ]]";
  const sections =
    content?.copy?.sections ??
    defaultSections(brief).map((title) => ({ title, body: `[[ body for ${title} ]]` }));

  const primaryFamily = mergedDna.typography.families[0]?.family ?? "Inter, system-ui, sans-serif";
  const secondaryFamily = mergedDna.typography.families[1]?.family ?? primaryFamily;
  const accent =
    mergedDna.colors.summary.accents[0] ?? mergedDna.colors.summary.foregrounds[0] ?? "#111111";
  const bg = mergedDna.colors.summary.backgrounds[0] ?? "#ffffff";
  const fg = mergedDna.colors.summary.foregrounds[0] ?? "#111111";
  const maxWidth = mergedDna.grid.rhythm.maxWidth ?? "1200px";
  const industry = typeof brief.industry === "string" && brief.industry.length > 0
    ? brief.industry
    : "general";

  // --- layout/theme.liquid --------------------------------------------------
  // The dark toggle is NOT inlined here. It lives in snippets/yf-dark-toggle.liquid
  // so any `{{`/`{%`-looking characters inside its <script> block don't get parsed
  // by the Liquid engine as tokens in the layout itself.
  const themeLiquid = `<!doctype html>
<html lang="{{ request.locale.iso_code }}" data-theme="light">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>{{ page_title }}{% if current_tags %} &ndash; tagged "{{ current_tags | join: ', ' }}"{% endif %}{% if current_page != 1 %} &ndash; Page {{ current_page }}{% endif %}{% unless page_title contains shop.name %} &ndash; {{ shop.name }}{% endunless %}</title>
    <meta name="description" content="{{ page_description | escape }}">
    {{ content_for_header }}
    {{ 'base.css' | asset_url | stylesheet_tag }}
  </head>
  <body class="yf-shopify">
    <a class="skip-to-content-link" href="#MainContent">{{ 'accessibility.skip_to_text' | t }}</a>
    {% section 'announcement-bar' %}
    {% section 'header' %}
    <main id="MainContent" role="main">
      {{ content_for_layout }}
    </main>
    {% section 'footer' %}
    {% render 'yf-dark-toggle' %}
  </body>
</html>`;

  // --- snippets/yf-dark-toggle.liquid --------------------------------------
  // The snippet file can hold any HTML/JS freely; Shopify only parses Liquid
  // tokens inside snippets, and our toggle has none. Using `{% render %}` in
  // layout/theme.liquid isolates this content from the layout-level parser.
  const darkToggleSnippet = DARK_THEME_TOGGLE_SNIPPET;

  // --- assets/base.css ------------------------------------------------------
  const baseCss = `:root {
  --yf-bg: ${bg};
  --yf-fg: ${fg};
  --yf-accent: ${accent};
  --yf-font-primary: ${primaryFamily};
  --yf-font-secondary: ${secondaryFamily};
  --yf-max-width: ${maxWidth};
}
[data-theme="dark"] {
  --yf-bg: #0a0a0a;
  --yf-fg: #f5f5f5;
}
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0;
  background: var(--yf-bg);
  color: var(--yf-fg);
  font-family: var(--yf-font-primary);
}
a { color: inherit; }
img { max-width: 100%; height: auto; display: block; }
.yf-container { max-width: var(--yf-max-width); margin: 0 auto; padding: 24px; }
.yf-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding-block: 16px; }
.yf-header nav { display: flex; gap: 24px; }
.yf-header nav a { text-decoration: none; }
.yf-footer { margin-top: 96px; opacity: 0.75; }
.yf-announcement { text-align: center; padding: 10px 24px; background: var(--yf-fg); color: var(--yf-bg); font-size: 0.875rem; }
.yf-hero { padding: 120px 24px; }
.yf-hero h1 { font-size: clamp(2.5rem, 6vw, 5rem); line-height: 1.02; margin: 0 0 24px; font-family: var(--yf-font-secondary); }
.yf-hero p { font-size: 1.25rem; opacity: 0.8; max-width: 60ch; }
.yf-cta { display: inline-block; margin-top: 24px; padding: 12px 24px; background: var(--yf-accent); color: var(--yf-bg); text-decoration: none; border-radius: 8px; font-weight: 600; }
.yf-feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; padding: 64px 24px; }
.yf-feature { border: 1px solid color-mix(in srgb, var(--yf-fg) 12%, transparent); padding: 32px; border-radius: 12px; }
.yf-product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 24px; padding: 24px 0; }
.yf-product-card { text-decoration: none; color: inherit; display: block; }
.yf-product-card h3 { margin: 12px 0 4px; font-size: 1rem; }
.yf-product-card .price { opacity: 0.75; }
.yf-product-main { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 420px); gap: 48px; padding: 48px 24px; }
@media (max-width: 720px) { .yf-product-main { grid-template-columns: 1fr; } }
.yf-product-main h1 { font-family: var(--yf-font-secondary); font-size: clamp(2rem, 4vw, 3rem); margin: 0 0 12px; }
.yf-cart table { width: 100%; border-collapse: collapse; }
.yf-cart th, .yf-cart td { padding: 16px 8px; text-align: left; border-bottom: 1px solid color-mix(in srgb, var(--yf-fg) 10%, transparent); }
.yf-empty { padding: 120px 24px; text-align: center; }
.yf-account { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; padding: 24px 0; }
.yf-form { display: grid; gap: 12px; max-width: 420px; }
.yf-form input, .yf-form textarea, .yf-form button { font: inherit; padding: 12px; border-radius: 6px; border: 1px solid color-mix(in srgb, var(--yf-fg) 20%, transparent); background: transparent; color: inherit; }
.yf-form button { background: var(--yf-accent); color: var(--yf-bg); border: none; cursor: pointer; font-weight: 600; }
.theme-toggle { position: fixed; top: 16px; right: 16px; background: transparent; color: var(--yf-fg); border: 1px solid currentColor; padding: 6px 10px; border-radius: 999px; cursor: pointer; z-index: 50; }
.skip-to-content-link { position: absolute; left: -999px; top: 0; background: var(--yf-fg); color: var(--yf-bg); padding: 8px 16px; z-index: 100; }
.skip-to-content-link:focus { left: 16px; top: 16px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
`;

  // --- sections/*.liquid ----------------------------------------------------
  const announcementBarSection = `<div class="yf-announcement">
  {{ section.settings.text }}
</div>
{% schema %}
{
  "name": "Announcement bar",
  "settings": [
    { "type": "text", "id": "text", "label": "Message", "default": "Free shipping on orders over $75 — worldwide." }
  ],
  "presets": [{ "name": "Announcement bar" }]
}
{% endschema %}`;

  const headerSection = `<header class="yf-container yf-header">
  <a href="{{ routes.root_url }}" class="yf-logo">{{ shop.name }}</a>
  <nav>
    {%- if linklists[section.settings.menu] and linklists[section.settings.menu].links.size > 0 -%}
      {%- for link in linklists[section.settings.menu].links -%}
        <a href="{{ link.url }}">{{ link.title }}</a>
      {%- endfor -%}
    {%- else -%}
      <a href="{{ routes.root_url }}">Home</a>
      <a href="{{ routes.all_products_collection_url }}">Catalog</a>
      <a href="{{ routes.cart_url }}">Cart</a>
    {%- endif -%}
  </nav>
</header>
{% schema %}
{
  "name": "Header",
  "settings": [
    { "type": "link_list", "id": "menu", "label": "Menu", "default": "main-menu" }
  ]
}
{% endschema %}`;

  const footerSection = `<footer class="yf-container yf-footer">
  <p>&copy; {{ 'now' | date: '%Y' }} {{ shop.name }}. All rights reserved.</p>
</footer>
{% schema %}
{
  "name": "Footer",
  "settings": []
}
{% endschema %}`;

  const heroSection = `<section class="yf-container yf-hero">
  <h1>${escapeLiquid(heading)}</h1>
  <p>${escapeLiquid(subhead)}</p>
  {%- if section.settings.cta_label != blank -%}
    <a class="yf-cta" href="{{ section.settings.cta_url | default: routes.all_products_collection_url }}">{{ section.settings.cta_label }}</a>
  {%- endif -%}
</section>
{% schema %}
{
  "name": "Hero",
  "settings": [
    { "type": "text", "id": "cta_label", "label": "CTA label", "default": "Get started" },
    { "type": "url", "id": "cta_url", "label": "CTA destination" }
  ],
  "presets": [{ "name": "Hero" }]
}
{% endschema %}`;

  const featureGridSection = `<section class="yf-container yf-feature-grid">
  ${sections
    .map(
      (s) =>
        `<article class="yf-feature">
    <h3>${escapeLiquid(s.title)}</h3>
    <p>${escapeLiquid(s.body)}</p>
  </article>`,
    )
    .join("\n  ")}
</section>
{% schema %}
{
  "name": "Feature grid",
  "settings": [],
  "presets": [{ "name": "Feature grid" }]
}
{% endschema %}`;

  const mainProductSection = `<section class="yf-container yf-product-main">
  <div class="yf-product-gallery">
    {%- if product.featured_image -%}
      <img src="{{ product.featured_image | image_url: width: 1200 }}" alt="{{ product.featured_image.alt | escape }}" width="1200" height="1200">
    {%- endif -%}
  </div>
  <div class="yf-product-info">
    <h1>{{ product.title }}</h1>
    <p class="price">{{ product.price | money }}</p>
    <div class="description">{{ product.description }}</div>
    {%- form 'product', product, class: 'yf-form' -%}
      {%- if product.variants.size > 1 -%}
        <select name="id">
          {%- for variant in product.variants -%}
            <option value="{{ variant.id }}" {% if variant == product.selected_or_first_available_variant %}selected{% endif %}>
              {{ variant.title }} — {{ variant.price | money }}
            </option>
          {%- endfor -%}
        </select>
      {%- else -%}
        <input type="hidden" name="id" value="{{ product.selected_or_first_available_variant.id }}">
      {%- endif -%}
      <button type="submit" name="add" {% unless product.available %}disabled{% endunless %}>
        {%- if product.available -%}Add to cart{%- else -%}Sold out{%- endif -%}
      </button>
    {%- endform -%}
  </div>
</section>
{% schema %}
{ "name": "Product", "settings": [] }
{% endschema %}`;

  const mainCollectionSection = `<section class="yf-container">
  <h1>{{ collection.title }}</h1>
  {%- if collection.description != blank -%}<p>{{ collection.description }}</p>{%- endif -%}
  <div class="yf-product-grid">
    {%- for product in collection.products -%}
      <a class="yf-product-card" href="{{ product.url }}">
        {%- if product.featured_image -%}
          <img src="{{ product.featured_image | image_url: width: 600 }}" alt="{{ product.featured_image.alt | escape }}" width="600" height="600">
        {%- endif -%}
        <h3>{{ product.title }}</h3>
        <p class="price">{{ product.price | money }}</p>
      </a>
    {%- else -%}
      <p>No products yet.</p>
    {%- endfor -%}
  </div>
  {%- if paginate.pages > 1 -%}
    {{ paginate | default_pagination }}
  {%- endif -%}
</section>
{% schema %}
{ "name": "Collection", "settings": [] }
{% endschema %}`;

  const mainListCollectionsSection = `<section class="yf-container">
  <h1>Collections</h1>
  <div class="yf-product-grid">
    {%- for collection in collections -%}
      <a class="yf-product-card" href="{{ collection.url }}">
        {%- if collection.featured_image -%}
          <img src="{{ collection.featured_image | image_url: width: 600 }}" alt="{{ collection.featured_image.alt | escape }}" width="600" height="600">
        {%- endif -%}
        <h3>{{ collection.title }}</h3>
      </a>
    {%- endfor -%}
  </div>
</section>
{% schema %}
{ "name": "List collections", "settings": [] }
{% endschema %}`;

  const mainPageSection = `<section class="yf-container">
  <h1>{{ page.title }}</h1>
  <div>{{ page.content }}</div>
</section>
{% schema %}
{ "name": "Page", "settings": [] }
{% endschema %}`;

  const mainBlogSection = `<section class="yf-container">
  <h1>{{ blog.title }}</h1>
  {%- for article in blog.articles -%}
    <article>
      <h2><a href="{{ article.url }}">{{ article.title }}</a></h2>
      <p>{{ article.excerpt_or_content | strip_html | truncate: 160 }}</p>
      <small>{{ article.published_at | date: '%B %-d, %Y' }}</small>
    </article>
  {%- endfor -%}
</section>
{% schema %}
{ "name": "Blog", "settings": [] }
{% endschema %}`;

  const mainArticleSection = `<article class="yf-container">
  <h1>{{ article.title }}</h1>
  <small>{{ article.published_at | date: '%B %-d, %Y' }} · {{ article.author }}</small>
  <div>{{ article.content }}</div>
</article>
{% schema %}
{ "name": "Article", "settings": [] }
{% endschema %}`;

  const mainCartSection = `<section class="yf-container yf-cart">
  <h1>Your cart</h1>
  {%- if cart.item_count > 0 -%}
    {%- form 'cart', cart -%}
      <table>
        <thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead>
        <tbody>
          {%- for item in cart.items -%}
            <tr>
              <td><a href="{{ item.url }}">{{ item.product.title }}</a> — {{ item.variant.title }}</td>
              <td><input type="number" name="updates[]" value="{{ item.quantity }}" min="0"></td>
              <td>{{ item.final_line_price | money }}</td>
            </tr>
          {%- endfor -%}
        </tbody>
      </table>
      <p>Subtotal: {{ cart.total_price | money }}</p>
      <button type="submit" name="checkout">Checkout</button>
    {%- endform -%}
  {%- else -%}
    <div class="yf-empty"><p>Your cart is empty.</p><a class="yf-cta" href="{{ routes.all_products_collection_url }}">Browse products</a></div>
  {%- endif -%}
</section>
{% schema %}
{ "name": "Cart", "settings": [] }
{% endschema %}`;

  const mainSearchSection = `<section class="yf-container">
  <h1>Search</h1>
  <form action="{{ routes.search_url }}" method="get" class="yf-form">
    <input type="search" name="q" value="{{ search.terms | escape }}" placeholder="Search products, articles, pages">
    <button type="submit">Search</button>
  </form>
  {%- if search.performed -%}
    <p>{{ search.results_count }} result{% if search.results_count != 1 %}s{% endif %} for "{{ search.terms }}".</p>
    <div class="yf-product-grid">
      {%- for item in search.results -%}
        <a class="yf-product-card" href="{{ item.url }}">
          <h3>{{ item.title }}</h3>
          <p>{{ item.object_type }}</p>
        </a>
      {%- endfor -%}
    </div>
  {%- endif -%}
</section>
{% schema %}
{ "name": "Search", "settings": [] }
{% endschema %}`;

  const main404Section = `<section class="yf-empty">
  <p style="letter-spacing:0.18em;text-transform:uppercase;opacity:0.5;">Page not found</p>
  <h1 style="font-size:clamp(4rem,12vw,10rem);margin:8px 0 32px;font-family:var(--yf-font-secondary);">404</h1>
  <p>The page you were looking for doesn't exist — it may have moved.</p>
  <a class="yf-cta" href="{{ routes.root_url }}">Go home</a>
</section>
{% schema %}
{ "name": "404", "settings": [] }
{% endschema %}`;

  // --- Customer sections ----------------------------------------------------
  const mainCustomerAccountSection = `<section class="yf-container">
  <h1>Hi, {{ customer.first_name | default: customer.name }}</h1>
  <p><a href="{{ routes.account_logout_url }}">Log out</a></p>
  <div class="yf-account">
    <section>
      <h2>Recent orders</h2>
      {%- if customer.orders.size > 0 -%}
        <ul>
          {%- for order in customer.orders -%}
            <li><a href="{{ order.customer_url }}">#{{ order.name }}</a> · {{ order.created_at | date: '%B %-d, %Y' }} · {{ order.total_price | money }}</li>
          {%- endfor -%}
        </ul>
      {%- else -%}
        <p>No orders yet.</p>
      {%- endif -%}
    </section>
    <section>
      <h2>Addresses</h2>
      <p><a href="{{ routes.account_addresses_url }}">Manage addresses</a></p>
    </section>
  </div>
</section>
{% schema %}
{ "name": "Account", "settings": [] }
{% endschema %}`;

  const mainCustomerLoginSection = `<section class="yf-container">
  <h1>Log in</h1>
  {%- form 'customer_login', class: 'yf-form' -%}
    {{ form.errors | default_errors }}
    <label for="CustomerEmail">Email</label>
    <input type="email" id="CustomerEmail" name="customer[email]" autocomplete="email" required>
    <label for="CustomerPassword">Password</label>
    <input type="password" id="CustomerPassword" name="customer[password]" autocomplete="current-password" required>
    <button type="submit">Log in</button>
  {%- endform -%}
  <p><a href="{{ routes.account_register_url }}">Create account</a> · <a href="{{ routes.account_recover_url }}">Forgot password?</a></p>
</section>
{% schema %}
{ "name": "Login", "settings": [] }
{% endschema %}`;

  const mainCustomerRegisterSection = `<section class="yf-container">
  <h1>Create account</h1>
  {%- form 'create_customer', class: 'yf-form' -%}
    {{ form.errors | default_errors }}
    <input type="text" name="customer[first_name]" placeholder="First name" autocomplete="given-name">
    <input type="text" name="customer[last_name]" placeholder="Last name" autocomplete="family-name">
    <input type="email" name="customer[email]" placeholder="Email" autocomplete="email" required>
    <input type="password" name="customer[password]" placeholder="Password" autocomplete="new-password" required>
    <button type="submit">Create</button>
  {%- endform -%}
</section>
{% schema %}
{ "name": "Register", "settings": [] }
{% endschema %}`;

  const mainCustomerResetPasswordSection = `<section class="yf-container">
  <h1>Reset your password</h1>
  {%- form 'recover_customer_password', class: 'yf-form' -%}
    {{ form.errors | default_errors }}
    <input type="email" name="email" placeholder="Email" autocomplete="email" required>
    <button type="submit">Send reset email</button>
  {%- endform -%}
</section>
{% schema %}
{ "name": "Reset password", "settings": [] }
{% endschema %}`;

  const mainCustomerActivateAccountSection = `<section class="yf-container">
  <h1>Activate your account</h1>
  {%- form 'activate_customer_password', class: 'yf-form' -%}
    {{ form.errors | default_errors }}
    <input type="password" name="customer[password]" placeholder="Password" autocomplete="new-password" required>
    <input type="password" name="customer[password_confirmation]" placeholder="Confirm password" autocomplete="new-password" required>
    <button type="submit">Activate</button>
  {%- endform -%}
</section>
{% schema %}
{ "name": "Activate account", "settings": [] }
{% endschema %}`;

  const mainCustomerAddressesSection = `<section class="yf-container">
  <h1>Addresses</h1>
  <p><a href="{{ routes.account_url }}">Back to account</a></p>
  {%- for address in customer.addresses -%}
    <article style="border:1px solid color-mix(in srgb,var(--yf-fg) 12%,transparent);padding:16px;border-radius:8px;margin-bottom:12px;">
      <p>{{ address | format_address }}</p>
    </article>
  {%- endfor -%}
</section>
{% schema %}
{ "name": "Addresses", "settings": [] }
{% endschema %}`;

  const mainCustomerOrderSection = `<section class="yf-container">
  <h1>Order {{ order.name }}</h1>
  <p>{{ order.created_at | date: '%B %-d, %Y' }} — {{ order.financial_status_label }}</p>
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead>
    <tbody>
      {%- for line in order.line_items -%}
        <tr><td>{{ line.title }}</td><td>{{ line.quantity }}</td><td>{{ line.price | money }}</td></tr>
      {%- endfor -%}
    </tbody>
  </table>
  <p>Total: {{ order.total_price | money }}</p>
</section>
{% schema %}
{ "name": "Order", "settings": [] }
{% endschema %}`;

  // --- templates/*.json — one per canonical Shopify route ------------------
  const indexTemplate = `{
  "sections": {
    "hero": {
      "type": "hero",
      "settings": {
        "cta_label": "Shop now",
        "cta_url": "shopify://collections/all"
      }
    },
    "features": { "type": "feature-grid" }
  },
  "order": ["hero", "features"]
}`;

  const templateFor = (mainType: string) => `{
  "sections": { "main": { "type": "${mainType}" } },
  "order": ["main"]
}`;

  // --- templates/password.liquid + gift_card.liquid (must be .liquid) ------
  const passwordTemplate = `<!doctype html>
<html lang="{{ request.locale.iso_code }}" data-theme="light">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>{{ shop.name }}</title>
    {{ 'base.css' | asset_url | stylesheet_tag }}
  </head>
  <body>
    <section class="yf-empty">
      <h1>{{ shop.name }}</h1>
      <p>We're opening soon. Enter the password to preview.</p>
      {%- form 'storefront_password', class: 'yf-form' -%}
        {{ form.errors | default_errors }}
        <input type="password" name="password" placeholder="Password" required>
        <button type="submit">Enter</button>
      {%- endform -%}
    </section>
    {% render 'yf-dark-toggle' %}
  </body>
</html>`;

  const giftCardTemplate = `<!doctype html>
<html lang="{{ request.locale.iso_code }}" data-theme="light">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Gift card — {{ shop.name }}</title>
    {{ 'base.css' | asset_url | stylesheet_tag }}
  </head>
  <body>
    <section class="yf-container yf-empty">
      <h1>Gift card</h1>
      <p>{{ gift_card.balance | money }} · {{ gift_card.currency }}</p>
      <p style="font-family:monospace;letter-spacing:0.15em;">{{ gift_card.code | format_code }}</p>
      {%- if gift_card.expired -%}
        <p><em>This gift card has expired.</em></p>
      {%- endif -%}
      <a class="yf-cta" href="{{ shop.url }}">Shop now</a>
    </section>
    {% render 'yf-dark-toggle' %}
  </body>
</html>`;

  // --- config/settings_schema.json -----------------------------------------
  const settingsSchema = `[
  { "name": "theme_info", "theme_name": "Yappaflow — ${escapeJson(industry)}", "theme_version": "0.1.0", "theme_author": "Yappaflow" },
  {
    "name": "Colors",
    "settings": [
      { "type": "color", "id": "color_background", "label": "Background", "default": "${bg}" },
      { "type": "color", "id": "color_foreground", "label": "Foreground", "default": "${fg}" },
      { "type": "color", "id": "color_accent", "label": "Accent", "default": "${accent}" }
    ]
  },
  {
    "name": "Typography",
    "settings": [
      { "type": "font_picker", "id": "font_primary", "label": "Primary font", "default": "assistant_n4" }
    ]
  }
]`;

  // --- locales/en.default.json --------------------------------------------
  // Shopify's Theme Check expects the accessibility.skip_to_text key to exist
  // because our layout calls `{{ 'accessibility.skip_to_text' | t }}`.
  const localeEn = JSON.stringify(
    {
      general: {
        search: { title: "Search" },
        accessibility: { skip_to_text: "Skip to content" },
      },
    },
    null,
    2,
  );

  const files: BuildOutput["files"] = [
    // Layout
    { path: "layout/theme.liquid", content: themeLiquid },

    // Assets
    { path: "assets/base.css", content: baseCss },

    // Snippets
    { path: "snippets/yf-dark-toggle.liquid", content: darkToggleSnippet },

    // Sections — homepage components
    { path: "sections/announcement-bar.liquid", content: announcementBarSection },
    { path: "sections/header.liquid", content: headerSection },
    { path: "sections/footer.liquid", content: footerSection },
    { path: "sections/hero.liquid", content: heroSection },
    { path: "sections/feature-grid.liquid", content: featureGridSection },

    // Sections — per-template main-*
    { path: "sections/main-product.liquid", content: mainProductSection },
    { path: "sections/main-collection.liquid", content: mainCollectionSection },
    { path: "sections/main-list-collections.liquid", content: mainListCollectionsSection },
    { path: "sections/main-page.liquid", content: mainPageSection },
    { path: "sections/main-blog.liquid", content: mainBlogSection },
    { path: "sections/main-article.liquid", content: mainArticleSection },
    { path: "sections/main-cart.liquid", content: mainCartSection },
    { path: "sections/main-search.liquid", content: mainSearchSection },
    { path: "sections/main-404.liquid", content: main404Section },

    // Sections — customer account
    { path: "sections/main-customer-account.liquid", content: mainCustomerAccountSection },
    { path: "sections/main-customer-login.liquid", content: mainCustomerLoginSection },
    { path: "sections/main-customer-register.liquid", content: mainCustomerRegisterSection },
    { path: "sections/main-customer-reset-password.liquid", content: mainCustomerResetPasswordSection },
    { path: "sections/main-customer-activate-account.liquid", content: mainCustomerActivateAccountSection },
    { path: "sections/main-customer-addresses.liquid", content: mainCustomerAddressesSection },
    { path: "sections/main-customer-order.liquid", content: mainCustomerOrderSection },

    // Templates — JSON (OS 2.0)
    { path: "templates/index.json", content: indexTemplate },
    { path: "templates/product.json", content: templateFor("main-product") },
    { path: "templates/collection.json", content: templateFor("main-collection") },
    { path: "templates/list-collections.json", content: templateFor("main-list-collections") },
    { path: "templates/page.json", content: templateFor("main-page") },
    { path: "templates/blog.json", content: templateFor("main-blog") },
    { path: "templates/article.json", content: templateFor("main-article") },
    { path: "templates/cart.json", content: templateFor("main-cart") },
    { path: "templates/search.json", content: templateFor("main-search") },
    { path: "templates/404.json", content: templateFor("main-404") },
    { path: "templates/customers/account.json", content: templateFor("main-customer-account") },
    { path: "templates/customers/login.json", content: templateFor("main-customer-login") },
    { path: "templates/customers/register.json", content: templateFor("main-customer-register") },
    { path: "templates/customers/reset_password.json", content: templateFor("main-customer-reset-password") },
    { path: "templates/customers/activate_account.json", content: templateFor("main-customer-activate-account") },
    { path: "templates/customers/addresses.json", content: templateFor("main-customer-addresses") },
    { path: "templates/customers/order.json", content: templateFor("main-customer-order") },

    // Templates — Liquid (still required as .liquid by Shopify)
    { path: "templates/password.liquid", content: passwordTemplate },
    { path: "templates/gift_card.liquid", content: giftCardTemplate },

    // Config
    { path: "config/settings_schema.json", content: settingsSchema },
    { path: "config/settings_data.json", content: `{ "current": {} }` },

    // Locales
    { path: "locales/en.default.json", content: localeEn },

    // README
    {
      path: "README.md",
      content: `# Shopify theme (Yappaflow skeleton)

Every canonical Shopify route is wired — product, collection, cart, page, blog,
article, search, 404, customer account flow, password, gift_card.

## Upload

\`\`\`sh
shopify theme push
\`\`\`

Or via admin: Online Store → Themes → "Upload theme" with this folder zipped.

## Customize

- **Colors / fonts**: Theme editor → Theme settings → Colors / Typography.
  DNA-derived tokens are prefilled; merchants tweak without re-running Yappaflow.
- **Copy**: Theme editor → Home page → Hero / Feature grid → edit inline.
  Placeholders like \`[[ body for ... ]]\` mark what needs real copy.
- **Menu**: Store nav lives in the \`main-menu\` linklist (default Shopify convention).
  If it doesn't exist yet, the header falls back to Home / Catalog / Cart.

## What's not here yet

- Rich product pages (variant media swapping, reviews integration)
- Collection filters (Shopify facets API integration)
- Metaobject-backed marketing blocks
- Multi-language locales beyond \`en.default.json\`

Those are Phase 7 adapter upgrades — canonical structure is present so merchants
can run the theme today and extend without restructuring.
`,
    },
  ];

  return {
    platform: "shopify",
    files,
    summary: `Shopify OS 2.0 theme with ${files.length} files. Every canonical route has a template + main-* section. Light theme default with a dark toggle rendered from snippets/yf-dark-toggle.liquid.`,
    nextSteps: [
      "shopify theme push  (or upload the zipped folder via admin)",
      "Fill placeholder copy in sections/hero.liquid and sections/feature-grid.liquid",
      "Preview each route: /, /products/<handle>, /collections/<handle>, /cart, /pages/<handle>, /blogs/<handle>, /search, /account",
      "Publish the theme once reviewed (Online Store → Themes → Publish)",
    ],
    doctrineUsed: DESIGN_DOCTRINE,
  };
}

function defaultHeading(b: Brief): string {
  return `[[ headline for ${b.industry} / ${b.subcategory} ]]`;
}

function defaultSections(b: Brief): string[] {
  return b.content_model?.length
    ? b.content_model.slice(0, 4)
    : ["What it is", "How it works", "Proof", "Start now"];
}

/**
 * Escape arbitrary (possibly LLM-authored) text so it's safe to drop into the
 * *text* content of a Liquid template.
 *
 * Covers:
 *   - Liquid tokens: `{{`, `}}`, `{%`, `%}` (blocks Liquid from trying to parse
 *     whatever the model wrote as a tag or output)
 *   - HTML specials: `&`, `<`, `>`, `"`, `'` (blocks HTML injection when the
 *     escaped string lands inside an element body OR an attribute value)
 *
 * The order matters: escape `&` first so subsequent replacements don't turn
 * `&amp;` into `&amp;amp;`.
 *
 * This is deliberately stricter than Shopify's `| escape` filter because we're
 * escaping at authoring time (string concatenation into a .liquid file), not
 * at render time. At render time the storefront already re-parses the output.
 */
function escapeLiquid(s: string): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\{\{/g, "&#123;&#123;")
    .replace(/\}\}/g, "&#125;&#125;")
    .replace(/\{%/g, "&#123;%")
    .replace(/%\}/g, "%&#125;");
}

/** JSON-string escape for interpolating into a settings_schema.json literal. */
function escapeJson(s: string): string {
  if (s == null) return "";
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

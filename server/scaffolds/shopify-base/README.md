# Shopify base scaffold

Pre-built, fully-functional Shopify 2.0 theme that ships as the foundation for
every Yappaflow Shopify build. Every file in here is copied verbatim into the
generated theme. The AI's job is narrowed to a **brand layer** that overrides
the design tokens in `config/settings_data.json` (colors, fonts, copy, section
composition) — the plumbing (cart, product, collection, search, customer
account, checkout-integration) is already solved here.

## How theming flows

1. `layout/theme.liquid` injects Shopify `settings.*` values as CSS custom
   properties in a `<style>` block at the top of `<head>`.
2. `assets/base.css` reads those CSS variables — no hard-coded brand colors
   anywhere.
3. The AI emits `config/settings_data.json` with brand-specific values for
   palette + fonts + section content. Changing those flips the entire theme
   without touching Liquid or CSS.

## Hybrid product fallback

`sections/featured-products.liquid` has two render paths:

- **Real products exist** (`collection.products.size > 0`) → Liquid loop
  over the configured collection.
- **No products yet** (typical for a ZIP preview before the merchant has
  imported the CSV) → static blocks populated at generate-time from
  `Project.identity.products`. The blocks are written into
  `settings_data.json` server-side, not by the AI.

Same pattern lets us ship a preview-correct theme AND a runtime-correct theme
from one file.

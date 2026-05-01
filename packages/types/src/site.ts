/**
 * SiteProject — the canonical, builder-first representation of a Yappaflow
 * site. Output of the AI generation stage, input of the in-house builder,
 * input of every CMS adapter-v2.
 *
 * Shape chosen 2026-04-23 (see BUILDER-PIVOT.md): "Option C hybrid". Sections
 * are typed blocks drawn from the MVP library (packages/sections), and their
 * content is schema-constrained per section type — rigid enough to map
 * deterministically to Liquid / PHP / TSX, loose enough that the AI can still
 * make creative choices inside a section.
 *
 * The AI produces a SiteProject. The builder lets the agency tweak it. An
 * adapter walks it and emits CMS files. The DNA is passed through unchanged
 * for provenance and for render-time token resolution; it is not re-validated
 * here because it already has its own verification path (DNA extractor →
 * merge → SQLite cache).
 *
 * v2 → v3 (2026-04-30): adds top-level `productLibrary` so products live in
 * the SiteProject (not just in localStorage on the builder). Library is the
 * single source of truth: product-grid sections reference items by id, the
 * product-detail-on-/products/<handle> pages hydrate from it, and CMS adapters
 * read it once and decide whether to render static markup or wire up native
 * CMS Products (Shopify/IKAS/WooCommerce) per page kind.
 */

import { z } from "zod";
import { BriefSchema } from "./brief.js";
import { AnimationPresetSchema, AssetRefSchema, StyleDeltaSchema } from "./tokens.js";
import type { MergedDna } from "./dna.js";

/**
 * The 10 section types that ship in Phase 7. Order here is intentional:
 * globals (header/footer/announcement-bar) first, then page sections roughly
 * in "usual order of appearance" so the builder's insert menu reads naturally.
 *
 * Phase 8.5+ additions (logo-bar, faq, pricing, contact-form, team-grid,
 * blog-list, image-gallery, video, stats-band, newsletter) append to this
 * list. DO NOT reorder — adapters key their mapper tables on these values.
 */
export const SECTION_TYPES = [
  "header",
  "footer",
  "announcement-bar",
  "hero",
  "feature-grid",
  "feature-row",
  "product-grid",
  "cta-band",
  "testimonial",
  "rich-text",
  // Phase 8b — yappaflow-ui Exhibit-backed section types. Each wraps one
  // component from packages/yappaflow-ui's exhibits layer.
  "faq",
  "pricing",
  "stats-band",
  "timeline",
  "logo-cloud",
  "team",
  "newsletter",
  "contact",
  // Phase 8d — dedicated single-product detail page section.
  "product-detail",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];
export const SectionTypeSchema = z.enum(SECTION_TYPES);

/**
 * A Section is a typed block with freeform-but-schema-constrained content.
 *
 * `content` is deliberately `z.record(z.unknown())` at the SiteProject level:
 * each section module in @yappaflow/sections ships its own stricter schema
 * (the `contentSchema` export) that the MCP assembler and the builder use
 * to validate content shape per type. Keeping the top-level Section schema
 * untyped avoids a circular dependency between @yappaflow/types and
 * @yappaflow/sections — sections consume types, not the other way round.
 */
export const SectionSchema = z.object({
  id: z.string().min(1),
  type: SectionTypeSchema,
  /** Named variant from the section's variants.ts — validated per-type. */
  variant: z.string().optional(),
  /** Section-specific content; validate against the section's own schema. */
  content: z.record(z.string(), z.unknown()),
  /** Style deltas from the DNA baseline. Empty object means "use DNA defaults". */
  style: StyleDeltaSchema.default({}),
  /** Optional animation preset, serialized to data-yf-anim="..." on export. */
  animation: AnimationPresetSchema.optional(),
});
export type Section = z.infer<typeof SectionSchema>;

/** SEO metadata for a page. */
export const PageSeoSchema = z.object({
  description: z.string().default(""),
  ogImage: AssetRefSchema.optional(),
});
export type PageSeo = z.infer<typeof PageSeoSchema>;

/**
 * Page kind — tells CMS adapters how to map this page onto the target's
 * native model. `content` is the default and lands as a generic CMS page
 * (Shopify Pages, WordPress pages, Webflow CMS items). `product` carries a
 * single product detail and gets routed through each platform's native
 * product API (Shopify Products, IKAS Products, WooCommerce). `product-index`
 * is the catalog landing page (`/products`) and stays a content page on every
 * target — the listing comes from native collection logic, not body HTML.
 *
 * v1 SiteProjects (no `kind`) are migrated on load: slugs starting with
 * `/products/` and not equal to `/products` become `product`; `/products`
 * becomes `product-index`; everything else becomes `content`.
 */
export const PAGE_KINDS = ["content", "product", "product-index"] as const;
export type PageKind = (typeof PAGE_KINDS)[number];
export const PageKindSchema = z.enum(PAGE_KINDS);

/**
 * A Page is an ordered list of sections with routing + SEO. Slug matches the
 * URL path the adapter will mount it at. `/` is always the home page.
 *
 * `kind` is load-bearing for CMS export: adapters must respect it. Defaults
 * to `content` when absent (handles old fixtures + legacy tests).
 *
 * `productHandle` is required when kind === "product" so the adapter knows
 * which library product this page describes; the field is unused for other
 * kinds. Validation is enforced by `assertValidPage` rather than a Zod refine
 * so older content + the migration path don't have to fight the schema.
 */
export const PageSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  seo: PageSeoSchema.default({ description: "" }),
  sections: z.array(SectionSchema).default([]),
  kind: PageKindSchema.default("content"),
  productHandle: z.string().optional(),
});
export type Page = z.infer<typeof PageSchema>;

/**
 * Globals — sections that live outside any single page's flow. The adapter
 * renders them once and includes them in the layout wrapper.
 *
 * announcementBar is optional because not every site wants one. header and
 * footer are required: every adapter assumes they exist.
 */
export const SiteGlobalsSchema = z.object({
  header: SectionSchema,
  footer: SectionSchema,
  announcementBar: SectionSchema.optional(),
});
export type SiteGlobals = z.infer<typeof SiteGlobalsSchema>;

/**
 * A canonical product record. Lives in `SiteProject.productLibrary` and is
 * the single source of truth for every product surface in the site:
 *   - product-grid sections store `productIds` and hydrate cards from here
 *   - kind="product" pages reference the matching record via `productHandle`
 *   - CMS adapters read this once to decide whether to emit a native CMS
 *     product (Shopify Product / IKAS Product / WooCommerce CPT) or a static
 *     fallback page
 *
 * Shape mirrors how Shopify / WooCommerce / IKAS model products so the
 * adapters have a clean mapping target. `id` is the internal builder id
 * (stable across edits); `handle` is the URL/CMS slug. Adapters key off
 * `handle` when wiring to platform product APIs.
 *
 * Pricing is stored as a pre-formatted display string per Phase 7 doctrine
 * — adapters do not re-format. Currency is carried separately so adapters
 * targeting non-string-driven price models (Shopify Buy SDK, IKAS GraphQL)
 * have what they need to reconstruct a numeric price when relevant.
 */
export const ProductSchema = z.object({
  /** Builder-stable id. Persists across slug renames. */
  id: z.string().min(1),
  /** URL slug + CMS handle. Drives `/products/<handle>` and platform mapping. */
  handle: z.string().min(1),
  title: z.string().min(1),
  /** Display price as pre-formatted string (e.g. "$42", "€38,00"). */
  price: z.string().min(1),
  /** Optional strike-through original price. */
  compareAtPrice: z.string().optional(),
  currency: z.string().default("USD"),
  /** Marketing copy for the product detail page. */
  description: z.string().default(""),
  /** Ordered images. First is hero, rest are gallery thumbnails. min(1). */
  images: z.array(AssetRefSchema).min(1),
  /** Variant pickers (Size: S/M/L, Color: ...). Agency-edited. */
  variantGroups: z
    .array(
      z.object({
        label: z.string().min(1),
        options: z.array(z.string().min(1)).min(1),
      }),
    )
    .default([]),
  /** Spec table rows on the detail page. */
  specs: z
    .array(z.object({ label: z.string().min(1), value: z.string().min(1) }))
    .default([]),
  /** Free-form tags used by the builder UI for filtering. */
  tags: z.array(z.string()).default([]),
});
export type Product = z.infer<typeof ProductSchema>;

/**
 * The SiteProject itself. `dna` is validated structurally (must be an object
 * with a schemaVersion field) but not field-by-field — that's MergedDna's job
 * upstream. The TypeScript type narrows `dna` to MergedDna via the re-type
 * below so consumers get full autocomplete on DNA internals.
 *
 * `productLibrary` is the catalog of products available in this site. It is
 * the single source of truth: product-grid sections reference these by id;
 * adapters read this list once to decide CMS-product mapping. Defaults to
 * an empty array for non-commerce sites — no product surfaces required.
 */
export const SiteProjectSchema = z.object({
  schemaVersion: z.literal(3),
  brief: BriefSchema,
  dna: z.object({ schemaVersion: z.literal(1) }).passthrough(),
  pages: z.array(PageSchema).min(1),
  globals: SiteGlobalsSchema,
  productLibrary: z.array(ProductSchema).default([]),
});

/**
 * Public SiteProject type. We widen Zod's inferred `dna` (passthrough object)
 * to the full MergedDna — the data IS a MergedDna in practice; we just skip
 * re-validating its internals at the SiteProject boundary.
 */
export type SiteProject = Omit<z.infer<typeof SiteProjectSchema>, "dna"> & {
  dna: MergedDna;
};

/**
 * Current SiteProject schema version. Bump + migrate on breaking shape changes.
 *
 * v1 → v2 (2026-04-27): adds `kind` and optional `productHandle` to Page so
 * CMS adapters can route each page to the target's native product / page API
 * instead of dumping everything as a generic content page. Migration is in
 * apps/builder/src/lib/persistence.ts (slug-prefix inference) and the MCP
 * assembler stamps the new shape directly.
 *
 * v2 → v3 (2026-04-30): adds `productLibrary` at the top level. The library
 * becomes the single source of truth for product data; product-grid sections
 * reference items by id rather than embedding copies. Migration extracts any
 * inline `products[]` arrays from existing product-grid sections into the
 * library, dedupes by handle, and rewrites those sections to use `productIds`.
 * Pre-existing localStorage products-store entries (builder-only) are merged
 * in on first load so no agency loses their catalog. See
 * apps/builder/src/lib/persistence.ts for the migration code.
 */
export const SITE_PROJECT_SCHEMA_VERSION = 3 as const;

/**
 * Infer page kind from slug — single source of truth. Used by:
 *   - the persistence migration (v1 → v2 stamping on load),
 *   - the builder's upsertProductPage / upsertProductsIndexPage actions,
 *   - the MCP assembler when seeding e-commerce briefs.
 *
 * Convention: `/products/<handle>` is a product, `/products` exactly is the
 * catalog index, anything else is content. If we ever change this routing
 * convention, changing it in one place propagates to every consumer.
 */
export function inferPageKind(slug: string): PageKind {
  const normalized = slug.startsWith("/") ? slug : `/${slug}`;
  if (normalized === "/products") return "product-index";
  if (normalized.startsWith("/products/") && normalized.length > "/products/".length) {
    return "product";
  }
  return "content";
}

/**
 * Pull the product handle out of a `/products/<handle>` slug, or null if the
 * slug doesn't fit that shape. Used by the migration to fill in
 * `productHandle` on legacy v1 pages without re-running the products panel.
 */
export function productHandleFromSlug(slug: string): string | null {
  const normalized = slug.startsWith("/") ? slug : `/${slug}`;
  if (!normalized.startsWith("/products/")) return null;
  const handle = normalized.slice("/products/".length).split("/")[0] ?? "";
  return handle || null;
}

/**
 * Find a product in the library by id. Returns undefined when not found —
 * callers should render a placeholder rather than crash, because a referenced
 * product can disappear between persisted state and a fresh library load
 * (e.g. agency edited the library on another device).
 */
export function findProductById(
  library: readonly Product[],
  id: string,
): Product | undefined {
  return library.find((p) => p.id === id);
}

/**
 * Find a product by handle. Used when resolving `/products/<handle>` pages —
 * the page stores `productHandle`, not `productId`, because handles are the
 * stable identifier across CMS exports (a Shopify product's id changes per
 * environment, the handle does not).
 */
export function findProductByHandle(
  library: readonly Product[],
  handle: string,
): Product | undefined {
  return library.find((p) => p.handle === handle);
}

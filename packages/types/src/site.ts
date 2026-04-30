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
 * The SiteProject itself. `dna` is validated structurally (must be an object
 * with a schemaVersion field) but not field-by-field — that's MergedDna's job
 * upstream. The TypeScript type narrows `dna` to MergedDna via the re-type
 * below so consumers get full autocomplete on DNA internals.
 */
export const SiteProjectSchema = z.object({
  schemaVersion: z.literal(2),
  brief: BriefSchema,
  dna: z.object({ schemaVersion: z.literal(1) }).passthrough(),
  pages: z.array(PageSchema).min(1),
  globals: SiteGlobalsSchema,
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
 */
export const SITE_PROJECT_SCHEMA_VERSION = 2 as const;

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

import { z } from "zod";
import { AssetRefSchema, LinkSchema } from "../internal/primitives.js";

/**
 * Legacy embedded product card. Pre-v3 SiteProjects stored an array of these
 * directly on the product-grid section. v3 keeps the shape exported so
 * renderers + adapters can fall back to it when no library hydration is
 * available, and so the builder migration can read old projects without a
 * branch.
 *
 * `handle` is the platform-agnostic slug (Shopify handle, IKAS product slug,
 * etc.); adapters read it to link the card to whichever native storefront URL
 * the target CMS produces.
 */
export const ProductCardSchema = z.object({
  id: z.string(),
  handle: z.string(),
  title: z.string(),
  /** Display price as a pre-formatted string. Adapters do not re-format. */
  price: z.string(),
  currency: z.string().default("USD"),
  image: AssetRefSchema,
  href: z.string(),
  /** Optional secondary price for strike-through display (original price). */
  compareAtPrice: z.string().optional(),
});
export type ProductCard = z.infer<typeof ProductCardSchema>;

/**
 * Product-grid content shape.
 *
 * Two binding modes coexist (decided 2026-04-30 to support the v2→v3
 * library-as-source-of-truth migration without breaking old SiteProjects):
 *
 *   - `mode: "library"` — the section references products by id. The renderer
 *     hydrates each card from `SiteProject.productLibrary` via the
 *     `ProductLibraryContext`. This is the new default for AI-generated and
 *     builder-curated grids; library edits flow into every grid that
 *     references the product without any sync logic.
 *
 *   - `mode: "manual"` — the section embeds full ProductCard copies in
 *     `products`. Used by legacy v2 SiteProjects (preserved on load) and by
 *     ad-hoc one-off grids the agency wants disconnected from the library.
 *
 * Validation accepts either shape. Empty grids (no products + no productIds)
 * are tolerated at the schema level so the builder can stage in-progress
 * edits; the renderer shows a placeholder.
 */
export const ProductGridContentSchema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  subhead: z.string().default(""),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  /** Binding mode. Defaults to "manual" so v2 fixtures parse unchanged. */
  mode: z.enum(["library", "manual"]).default("manual"),
  /** Library-bound product ids. Populated when mode === "library". */
  productIds: z.array(z.string()).default([]),
  /**
   * Inline product cards. Required pre-v3, optional v3+. The renderer falls
   * back to this when mode === "manual" or when library hydration produces
   * no cards (referenced ids no longer exist).
   */
  products: z.array(ProductCardSchema).default([]),
  /** Optional "view all" link below the grid. */
  ctaAll: LinkSchema.optional(),
});

export type ProductGridContent = z.infer<typeof ProductGridContentSchema>;

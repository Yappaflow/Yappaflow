import { z } from "zod";
import { AssetRefSchema, LinkSchema } from "../internal/primitives.js";

/**
 * Single-product page schema — the canonical product-detail shape.
 *
 * Gallery of images on the left, structured info on the right (title,
 * price, variant pickers, description, specs table, CTA). Schema shape
 * deliberately mirrors how Shopify, WooCommerce, and BigCommerce model a
 * product so the CMS adapters-v2 have a clean mapping target.
 */

export const ProductVariantGroupSchema = z.object({
  label: z.string(),
  options: z.array(z.string()).min(1),
});
export type ProductVariantGroup = z.infer<typeof ProductVariantGroupSchema>;

export const ProductSpecSchema = z.object({
  label: z.string(),
  value: z.string(),
});
export type ProductSpec = z.infer<typeof ProductSpecSchema>;

export const ProductDetailContentSchema = z.object({
  /**
   * Library binding (v3+). When set, the renderer hydrates title/price/
   * compareAtPrice/currency/description/images/variantGroups/specs from the
   * matching `SiteProject.productLibrary` entry. Inline fields below stay
   * authoritative for presentation (eyebrow, primaryCta/secondaryCta) so
   * each detail page can have its own merchandising voice without polluting
   * the shared library record.
   *
   * Fall back to inline content when:
   *   - productId is unset (legacy v2 SiteProjects)
   *   - the referenced product was deleted
   *   - no ProductLibraryProvider is mounted in the tree (e.g. an old
   *     adapter call site that hasn't been migrated yet)
   */
  productId: z.string().optional(),
  /** Breadcrumb-style eyebrow above the heading, e.g. "Apparel / Tees". */
  eyebrow: z.string().optional(),
  title: z.string(),
  price: z.string(),
  compareAtPrice: z.string().optional(),
  currency: z.string().default("USD"),
  description: z.string().default(""),
  /** Ordered list of images — first is hero, rest render as thumbnails. */
  images: z.array(AssetRefSchema).min(1),
  /** Variant option groups (Size: S/M/L, Color: Black/White). Agency-edited. */
  variantGroups: z.array(ProductVariantGroupSchema).default([]),
  /** Spec table rows (Material, Weight, Dimensions). */
  specs: z.array(ProductSpecSchema).default([]),
  /** Primary CTA — usually "Add to cart" linking to /cart or similar. */
  primaryCta: LinkSchema,
  /** Optional secondary CTA — e.g. "Ask a question" */
  secondaryCta: LinkSchema.optional(),
});
export type ProductDetailContent = z.infer<typeof ProductDetailContentSchema>;

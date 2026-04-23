import { z } from "zod";
import { AssetRefSchema, LinkSchema } from "../internal/primitives.js";

/**
 * A product card. `handle` is the platform-agnostic slug (Shopify handle,
 * IKAS product slug, etc.); adapters read it to link the card to whichever
 * native storefront URL the target CMS produces.
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

export const ProductGridContentSchema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  subhead: z.string().default(""),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  products: z.array(ProductCardSchema).min(1),
  /** Optional "view all" link below the grid. */
  ctaAll: LinkSchema.optional(),
});

export type ProductGridContent = z.infer<typeof ProductGridContentSchema>;

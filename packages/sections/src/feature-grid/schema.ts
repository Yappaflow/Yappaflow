import { z } from "zod";
import { AssetRefSchema } from "../internal/primitives.js";

export const FeatureItemSchema = z.object({
  title: z.string(),
  body: z.string(),
  /** Lucide icon name for the `icons` variant, ignored by `images` variant. */
  icon: z.string().optional(),
  /** Image for the `images` variant, ignored by `icons` variant. */
  image: AssetRefSchema.optional(),
});
export type FeatureItem = z.infer<typeof FeatureItemSchema>;

export const FeatureGridContentSchema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  subhead: z.string().default(""),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  features: z.array(FeatureItemSchema).min(1),
});

export type FeatureGridContent = z.infer<typeof FeatureGridContentSchema>;

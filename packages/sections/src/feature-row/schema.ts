import { z } from "zod";
import { AssetRefSchema, LinkSchema } from "../internal/primitives.js";

export const FeatureRowContentSchema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  body: z.string(),
  /** Optional bullet points under the body. */
  bullets: z.array(z.string()).default([]),
  media: AssetRefSchema,
  cta: LinkSchema.optional(),
});

export type FeatureRowContent = z.infer<typeof FeatureRowContentSchema>;

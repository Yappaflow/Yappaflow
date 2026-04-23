import { z } from "zod";
import { AssetRefSchema, LinkSchema } from "../internal/primitives.js";

export const HeroContentSchema = z.object({
  /** Short label above the heading — category, status, new-release badge. */
  eyebrow: z.string().optional(),
  heading: z.string(),
  subhead: z.string().default(""),
  primaryCta: LinkSchema,
  secondaryCta: LinkSchema.optional(),
  /** Background or companion media. Required for the fullscreen-media variant. */
  media: AssetRefSchema.optional(),
});

export type HeroContent = z.infer<typeof HeroContentSchema>;

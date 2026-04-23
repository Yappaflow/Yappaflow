import { z } from "zod";
import { AssetRefSchema, LinkSchema } from "../internal/primitives.js";

export const HeaderContentSchema = z.object({
  logo: z.object({
    text: z.string(),
    image: AssetRefSchema.optional(),
  }),
  nav: z.array(LinkSchema).default([]),
  /** Single prominent CTA in the nav bar. Optional — not every site wants one. */
  cta: LinkSchema.optional(),
});

export type HeaderContent = z.infer<typeof HeaderContentSchema>;

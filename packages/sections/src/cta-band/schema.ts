import { z } from "zod";
import { LinkSchema } from "../internal/primitives.js";

export const CtaBandContentSchema = z.object({
  heading: z.string(),
  subhead: z.string().default(""),
  primaryCta: LinkSchema,
  secondaryCta: LinkSchema.optional(),
});

export type CtaBandContent = z.infer<typeof CtaBandContentSchema>;

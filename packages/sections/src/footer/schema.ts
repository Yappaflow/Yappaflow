import { z } from "zod";
import { LinkSchema, SocialLinkSchema } from "../internal/primitives.js";

export const FooterColumnSchema = z.object({
  heading: z.string(),
  links: z.array(LinkSchema).default([]),
});
export type FooterColumn = z.infer<typeof FooterColumnSchema>;

export const FooterContentSchema = z.object({
  /** Short tagline shown near the brand mark. */
  tagline: z.string().default(""),
  columns: z.array(FooterColumnSchema).default([]),
  socials: z.array(SocialLinkSchema).default([]),
  /** Bottom-strip text — copyright, VAT, etc. */
  legal: z.string().default(""),
});

export type FooterContent = z.infer<typeof FooterContentSchema>;

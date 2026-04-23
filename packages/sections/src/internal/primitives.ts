/**
 * Small Zod primitives shared across section content schemas. Keeping the
 * shapes consistent here means "a link is a link" everywhere — the builder
 * right rail can render one control per shape, and adapters can ship one
 * mapper per shape.
 */

import { z } from "zod";
import { AssetRefSchema } from "@yappaflow/types";

export { AssetRefSchema };

/** A labeled link — the canonical nav / CTA shape. */
export const LinkSchema = z.object({
  label: z.string(),
  href: z.string(),
  /** Opens in a new tab when true. Adapters set target=_blank + rel=noopener. */
  external: z.boolean().optional(),
});
export type Link = z.infer<typeof LinkSchema>;

/** A social profile link. Platform is a free-form string so new platforms don't need a type bump. */
export const SocialLinkSchema = z.object({
  platform: z.string(),
  href: z.string(),
  label: z.string().optional(),
});
export type SocialLink = z.infer<typeof SocialLinkSchema>;

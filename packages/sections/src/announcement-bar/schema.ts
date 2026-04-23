import { z } from "zod";
import { LinkSchema } from "../internal/primitives.js";

export const AnnouncementBarContentSchema = z.object({
  message: z.string(),
  /** Optional CTA link tucked to the right of the message. */
  cta: LinkSchema.optional(),
  /** When true, render a dismiss control in the adapter/builder. */
  dismissible: z.boolean().default(false),
});

export type AnnouncementBarContent = z.infer<typeof AnnouncementBarContentSchema>;

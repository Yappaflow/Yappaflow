import { z } from "zod";

export const NewsletterContentSchema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  subheading: z.string().optional(),
  submitLabel: z.string().default("Subscribe"),
  placeholder: z.string().default("you@studio.com"),
  action: z.string().default(""),
  fineprint: z.string().optional(),
});
export type NewsletterContent = z.infer<typeof NewsletterContentSchema>;

import { z } from "zod";

export const ContactDetailRowSchema = z.object({
  label: z.string(),
  value: z.string(),
  href: z.string().optional(),
});
export type ContactDetailRow = z.infer<typeof ContactDetailRowSchema>;

export const ContactContentSchema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  subheading: z.string().optional(),
  rows: z.array(ContactDetailRowSchema).min(1),
  includeForm: z.boolean().default(false),
  formAction: z.string().default(""),
});
export type ContactContent = z.infer<typeof ContactContentSchema>;

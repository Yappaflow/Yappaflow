import { z } from "zod";

export const FAQBlockSchema = z.object({
  question: z.string(),
  answer: z.string(),
});
export type FAQBlock = z.infer<typeof FAQBlockSchema>;

export const FAQContentSchema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  subheading: z.string().optional(),
  blocks: z.array(FAQBlockSchema).min(1),
});
export type FAQContent = z.infer<typeof FAQContentSchema>;

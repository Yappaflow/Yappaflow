import { z } from "zod";
import { AssetRefSchema } from "../internal/primitives.js";

export const TestimonialItemSchema = z.object({
  quote: z.string(),
  author: z.string(),
  role: z.string().optional(),
  avatar: AssetRefSchema.optional(),
  companyLogo: AssetRefSchema.optional(),
});
export type TestimonialItem = z.infer<typeof TestimonialItemSchema>;

export const TestimonialContentSchema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  items: z.array(TestimonialItemSchema).min(1),
});

export type TestimonialContent = z.infer<typeof TestimonialContentSchema>;

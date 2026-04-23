import { z } from "zod";

export const PricingTierSchema = z.object({
  name: z.string(),
  price: z.string(),
  period: z.string().optional(),
  description: z.string().optional(),
  features: z.array(z.string()).default([]),
  cta: z.object({ label: z.string(), href: z.string() }),
  featured: z.boolean().optional(),
});
export type PricingTier = z.infer<typeof PricingTierSchema>;

export const PricingContentSchema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  subheading: z.string().optional(),
  tiers: z.array(PricingTierSchema).min(1),
});
export type PricingContent = z.infer<typeof PricingContentSchema>;

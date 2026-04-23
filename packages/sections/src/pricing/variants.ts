export const PRICING_VARIANTS = ["default"] as const;
export type PricingVariant = (typeof PRICING_VARIANTS)[number];
export const DEFAULT_PRICING_VARIANT: PricingVariant = "default";

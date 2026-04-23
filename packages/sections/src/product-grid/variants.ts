export const PRODUCT_GRID_VARIANTS = ["card", "minimal"] as const;
export type ProductGridVariant = (typeof PRODUCT_GRID_VARIANTS)[number];
export const DEFAULT_PRODUCT_GRID_VARIANT: ProductGridVariant = "card";

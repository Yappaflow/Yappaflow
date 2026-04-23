export const PRODUCT_DETAIL_VARIANTS = ["gallery-left", "stacked"] as const;
export type ProductDetailVariant = (typeof PRODUCT_DETAIL_VARIANTS)[number];
export const DEFAULT_PRODUCT_DETAIL_VARIANT: ProductDetailVariant = "gallery-left";

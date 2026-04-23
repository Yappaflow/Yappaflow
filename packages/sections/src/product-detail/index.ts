import { defineSection } from "../internal/define-section.js";
import { ProductDetailContentSchema, type ProductDetailContent } from "./schema.js";
import { DEFAULT_PRODUCT_DETAIL_CONTENT } from "./default.js";
import {
  PRODUCT_DETAIL_VARIANTS,
  DEFAULT_PRODUCT_DETAIL_VARIANT,
  type ProductDetailVariant,
} from "./variants.js";
import { ProductDetailSection } from "./render.js";

export const productDetailDefinition = defineSection<
  "product-detail",
  ProductDetailContent,
  ProductDetailVariant
>({
  type: "product-detail",
  contentSchema: ProductDetailContentSchema,
  variants: PRODUCT_DETAIL_VARIANTS,
  defaultVariant: DEFAULT_PRODUCT_DETAIL_VARIANT,
  defaultContent: DEFAULT_PRODUCT_DETAIL_CONTENT,
  Component: ProductDetailSection,
});

export {
  ProductDetailContentSchema,
  ProductDetailSection,
  PRODUCT_DETAIL_VARIANTS,
  DEFAULT_PRODUCT_DETAIL_VARIANT,
};
export type { ProductDetailContent, ProductDetailVariant };

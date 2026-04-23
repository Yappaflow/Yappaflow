import { defineSection } from "../internal/define-section.js";
import { ProductGridContentSchema, type ProductGridContent } from "./schema.js";
import { DEFAULT_PRODUCT_GRID_CONTENT } from "./default.js";
import {
  PRODUCT_GRID_VARIANTS,
  DEFAULT_PRODUCT_GRID_VARIANT,
  type ProductGridVariant,
} from "./variants.js";
import { ProductGridSection } from "./render.js";

export const productGridDefinition = defineSection<
  "product-grid",
  ProductGridContent,
  ProductGridVariant
>({
  type: "product-grid",
  contentSchema: ProductGridContentSchema,
  variants: PRODUCT_GRID_VARIANTS,
  defaultVariant: DEFAULT_PRODUCT_GRID_VARIANT,
  defaultContent: DEFAULT_PRODUCT_GRID_CONTENT,
  Component: ProductGridSection,
});

export {
  ProductGridContentSchema,
  ProductGridSection,
  PRODUCT_GRID_VARIANTS,
  DEFAULT_PRODUCT_GRID_VARIANT,
};
export type { ProductGridContent, ProductGridVariant };

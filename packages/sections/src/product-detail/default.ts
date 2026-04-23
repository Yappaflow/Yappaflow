import type { ProductDetailContent } from "./schema.js";

export const DEFAULT_PRODUCT_DETAIL_CONTENT: ProductDetailContent = {
  eyebrow: "Apparel / Tees",
  title: "Classic tee",
  price: "$42",
  compareAtPrice: "$54",
  currency: "USD",
  description:
    "Heavyweight cotton. Cut and sewn in Portugal. Softens with every wash — the one you'll reach for on the third day in a row.",
  images: [
    {
      kind: "image",
      url: "/images/products/classic-tee-1.jpg",
      alt: "Classic tee — front",
      width: 1200,
      height: 1500,
    },
    {
      kind: "image",
      url: "/images/products/classic-tee-2.jpg",
      alt: "Classic tee — back",
      width: 1200,
      height: 1500,
    },
    {
      kind: "image",
      url: "/images/products/classic-tee-3.jpg",
      alt: "Classic tee — detail",
      width: 1200,
      height: 1500,
    },
  ],
  variantGroups: [
    { label: "Size", options: ["XS", "S", "M", "L", "XL"] },
    { label: "Color", options: ["Black", "Sand", "White"] },
  ],
  specs: [
    { label: "Material", value: "100% long-staple cotton" },
    { label: "Weight", value: "240 g/m²" },
    { label: "Fit", value: "Relaxed" },
    { label: "Made in", value: "Portugal" },
  ],
  primaryCta: { label: "Add to cart", href: "/cart/add?id=classic-tee" },
  secondaryCta: { label: "Ask a question", href: "/contact" },
};

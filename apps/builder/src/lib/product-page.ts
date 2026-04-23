import type { LibraryProduct } from "./products-store";
import type { TemplateSectionSpec } from "./page-templates";

/**
 * Shopify-style product routing — every library product has a page at
 * `/products/<handle>`. Helpers here keep that convention in one place
 * so the products-panel, the project store, and the export path all
 * agree on how a product's page is named + seeded.
 */

export function productPageSlug(handle: string): string {
  return `/products/${handle}`;
}

/**
 * Section specs seeded into a newly-auto-created product page.
 * Product-detail carries the catalog data (title, price, image, CTA);
 * the related-products grid is a placeholder the agency can populate
 * from the library or leave generic.
 */
export function buildProductPageSections(
  product: LibraryProduct,
): TemplateSectionSpec[] {
  return [
    {
      type: "product-detail",
      variant: "gallery-left",
      contentOverrides: buildProductDetailContent(product),
    },
    {
      type: "product-grid",
      variant: "card",
      contentOverrides: {
        eyebrow: "Related",
        heading: "You might also like",
        columns: 3,
      },
    },
  ];
}

/**
 * Fresh product-detail content derived from a library product. Used both
 * at page creation and on library update to re-seed the existing page's
 * product-detail section so the canvas reflects edits instantly.
 */
export function buildProductDetailContent(
  product: LibraryProduct,
): Record<string, unknown> {
  return {
    eyebrow: "Shop",
    title: product.title,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    currency: product.currency ?? "USD",
    description: "",
    images: [
      {
        kind: "image",
        url: product.image.url,
        alt: product.image.alt ?? product.title,
      },
    ],
    variantGroups: [],
    specs: [],
    primaryCta: {
      label: "Add to cart",
      href: `/cart/add?id=${product.id}`,
    },
    secondaryCta: {
      label: "Ask a question",
      href: "/contact",
    },
  };
}

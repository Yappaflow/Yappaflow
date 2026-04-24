import type { LibraryProduct } from "./products-store";
import type { TemplateSectionSpec } from "./page-templates";
import type { Page, Section } from "@yappaflow/types";
import { SECTION_DATA } from "@yappaflow/sections/data";

/**
 * Shopify-style product routing — every library product has a page at
 * `/products/<handle>`. Helpers here keep that convention in one place
 * so the products-panel, the project store, and the export path all
 * agree on how a product's page is named + seeded.
 */

export function productPageSlug(handle: string): string {
  return `/products/${handle}`;
}

export function slugifyHandle(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "product"
  );
}

/**
 * Build a fully-renderable Page from a library product. Used by
 * ProjectPageView as a dynamic fallback when no stored page exists for a
 * product handle — so every product automatically works at /products/<handle>
 * without requiring an explicit stored page.
 */
export function buildDynamicProductPage(
  product: LibraryProduct,
  allProducts: LibraryProduct[],
): Page {
  const detailData = SECTION_DATA["product-detail"];
  const gridData = SECTION_DATA["product-grid"];

  const related = allProducts
    .filter((p) => p.id !== product.id)
    .slice(0, 3)
    .map((p) => ({
      id: p.id,
      handle: p.handle,
      title: p.title,
      price: p.price,
      currency: p.currency,
      image: {
        kind: "image" as const,
        url: p.image.url,
        alt: p.image.alt ?? p.title,
      },
      href: productPageSlug(p.handle),
    }));

  const sections: Section[] = [
    {
      id: "dyn_detail",
      type: "product-detail",
      variant: "gallery-left",
      content: {
        ...(detailData.defaultContent as Record<string, unknown>),
        ...buildProductDetailContent(product),
      },
      style: {},
    },
    {
      id: "dyn_related",
      type: "product-grid",
      variant: "card",
      content: {
        ...(gridData.defaultContent as Record<string, unknown>),
        eyebrow: "Related",
        heading: "You might also like",
        columns: 3,
        products: related,
      },
      style: {},
    },
  ];

  return {
    id: `dyn_${product.id}`,
    slug: productPageSlug(product.handle),
    title: product.title,
    seo: { description: `${product.title} — shop on our store.` },
    sections,
  };
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

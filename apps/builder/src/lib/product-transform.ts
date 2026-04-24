import type { LibraryProduct } from "./products-store";
import type { ServerProduct } from "./server-api";

/**
 * Transform a LibraryProduct into the shape a product-grid section expects
 * in `content.products[i]`. Used in two places:
 *
 *   1. When the user drags a product from the library onto a product-grid
 *      section — editor-shell's drag-end handler consumes this.
 *   2. When a library product is edited — the project store walks every
 *      product-grid section and replaces matching products with the
 *      transformed output of this function so the canvas reflects the
 *      library change immediately.
 *
 * The SiteProject remains fully self-contained: library data is embedded
 * into section.content.products. A later CMS export doesn't need library
 * access — all required fields are already in the SiteProject JSON.
 */
export function libraryToProductCard(
  product: LibraryProduct,
): Record<string, unknown> {
  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    price: product.price,
    currency: product.currency ?? "USD",
    ...(product.compareAtPrice ? { compareAtPrice: product.compareAtPrice } : {}),
    image: {
      kind: "image" as const,
      url: product.image.url,
      alt: product.image.alt ?? product.title,
    },
    href: product.href,
  };
}

/**
 * Convert a server-side IProduct (from /deploy/projects/:id/products) into
 * the LibraryProduct shape the builder uses. The handle is derived from the
 * product name so it's stable across syncs.
 */
export function serverProductToLibrary(
  product: ServerProduct,
): Omit<LibraryProduct, "id"> {
  const handle =
    product.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "product";
  const symbol = product.currency === "USD" || !product.currency ? "$" : `${product.currency} `;
  return {
    title: product.name,
    handle,
    price: `${symbol}${product.price}`,
    currency: product.currency ?? "USD",
    image: { url: product.images?.[0] ?? "", alt: product.name },
    href: `/products/${handle}`,
  };
}

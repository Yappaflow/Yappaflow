import { redirect } from "next/navigation";

/**
 * Products catalog index — `/products`.
 * Redirects to the preview shell with hash routing to the catalog page,
 * which the preview renders as a product-grid page at slug `/products`.
 */
export default async function ProductsIndexPage() {
  redirect("/p/sample/preview#/products");
}

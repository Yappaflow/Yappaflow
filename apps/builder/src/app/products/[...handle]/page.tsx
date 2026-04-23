import { redirect } from "next/navigation";

/**
 * Friendly redirect for direct-slug URLs like `/products/classic-tee`.
 * Redirects to the preview route with the slug in the hash — the preview
 * shell picks it up and opens the right page.
 *
 * (The preview shell uses hash-based deep linking to avoid a Next.js
 * route conflict that arose from catch-all path segments; see
 * preview-shell.tsx for the full story.)
 */
export default async function ProductsRedirect({
  params,
}: {
  params: Promise<{ handle: string[] }>;
}) {
  const { handle } = await params;
  const handlePath = handle.join("/");
  redirect(`/p/sample/preview#/products/${handlePath}`);
}

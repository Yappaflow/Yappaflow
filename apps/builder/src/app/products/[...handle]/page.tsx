import { redirect } from "next/navigation";

/**
 * Friendly redirect for direct-slug URLs.
 *
 * In exported sites, `/products/<handle>` is a real file. On the builder
 * domain it's a virtual slug that only resolves inside the preview — the
 * Next.js app itself doesn't know about it. Rather than throw a 404, we
 * redirect to the preview route for the sample project so agencies who
 * type a full URL in the browser land somewhere useful.
 *
 * When real projects land (post Phase 10.5 server wiring), this route
 * could resolve the projectId from session/cookie. For now, "sample" is
 * the dev demo project and works for anyone poking around.
 */
export default async function ProductsRedirect({
  params,
}: {
  params: Promise<{ handle: string[] }>;
}) {
  const { handle } = await params;
  const handlePath = handle.join("/");
  redirect(`/p/sample/preview/products/${handlePath}`);
}

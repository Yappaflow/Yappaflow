import { ProjectPageView } from "@/components/project-page-view";

/**
 * Single product detail route. Like /products, ProjectPageView resolves the
 * project id from query / persistence index / sample fallback so the page
 * shows the correct product no matter which project the agency is editing.
 *
 * If no stored page exists at this slug, ProjectPageView falls back to
 * `buildDynamicProductPage` so any library product is reachable here even
 * before the agency saves an explicit page for it.
 */
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ handle: string[] }>;
}) {
  const { handle } = await params;
  const slug = `/products/${handle.join("/")}`;
  return <ProjectPageView slug={slug} />;
}

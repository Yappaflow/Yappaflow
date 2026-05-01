import { Suspense } from "react";
import { ProjectPageView } from "@/components/project-page-view";

/**
 * Single product detail route. Like /products, ProjectPageView resolves the
 * project id from query / persistence index / sample fallback so the page
 * shows the correct product no matter which project the agency is editing.
 *
 * If no stored page exists at this slug, ProjectPageView falls back to
 * `buildDynamicProductPage` so any library product is reachable here even
 * before the agency saves an explicit page for it.
 *
 * Wrapped in <Suspense> for the same reason as /products — ProjectPageView
 * calls `useSearchParams()` and Next.js 15 requires a boundary around any
 * client component that does so during static prerender.
 */
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ handle: string[] }>;
}) {
  const { handle } = await params;
  const slug = `/products/${handle.join("/")}`;
  return (
    <Suspense fallback={<ProductDetailLoading />}>
      <ProjectPageView slug={slug} />
    </Suspense>
  );
}

function ProductDetailLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-white text-neutral-600">
      <p className="text-xs uppercase tracking-[0.2em] opacity-60">Loading…</p>
    </main>
  );
}

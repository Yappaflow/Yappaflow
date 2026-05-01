import { Suspense } from "react";
import { ProjectPageView } from "@/components/project-page-view";

/**
 * Public catalog landing. ProjectPageView resolves the active projectId
 * from `?p=<id>` (preview links) → most-recent-saved project → "sample"
 * fallback, so this route reflects whichever site the agency is actually
 * editing instead of always showing the bundled fixture.
 *
 * Wrapped in <Suspense> because ProjectPageView calls `useSearchParams()`
 * inside a client component — Next.js 15 fails the static prerender
 * otherwise (CSR-bailout error). The fallback is what gets prerendered;
 * the real view streams in on the client. Page is functionally CSR-only
 * anyway (reads from localStorage in useEffect), so this just makes the
 * boundary explicit.
 */
export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProjectPageView slug="/products" />
    </Suspense>
  );
}

function ProductsLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-white text-neutral-600">
      <p className="text-xs uppercase tracking-[0.2em] opacity-60">Loading…</p>
    </main>
  );
}

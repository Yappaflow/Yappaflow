import { ProjectPageView } from "@/components/project-page-view";

/**
 * Public catalog landing. ProjectPageView resolves the active projectId
 * from `?p=<id>` (preview links) → most-recent-saved project → "sample"
 * fallback, so this route reflects whichever site the agency is actually
 * editing instead of always showing the bundled fixture.
 */
export default function ProductsPage() {
  return <ProjectPageView slug="/products" />;
}

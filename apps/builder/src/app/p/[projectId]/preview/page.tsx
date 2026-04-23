import { PreviewShell } from "./preview-shell";

/**
 * `/p/[projectId]/preview` — full-bleed preview.
 *
 * Single route that handles all preview URLs. Deep-linking for specific
 * pages uses the URL hash:
 *
 *   /p/sample/preview                                  → home (slug "/")
 *   /p/sample/preview#/about                           → About page
 *   /p/sample/preview#/products/classic-tee            → product page
 *
 * Hash-based because path segments (catch-all routes) collide with the
 * bare-/preview route in Next's App Router. Hash is fully client-side,
 * keeps URLs shareable, and back/forward browser buttons still fire
 * `hashchange` naturally.
 */
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <PreviewShell projectId={projectId} />;
}

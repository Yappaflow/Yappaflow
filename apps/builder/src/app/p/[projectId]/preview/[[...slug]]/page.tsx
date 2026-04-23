import { PreviewShell } from "../preview-shell";

/**
 * `/p/[projectId]/preview/[[...slug]]` — catch-all preview route.
 *
 *   /p/sample/preview                       → home (slug "/")
 *   /p/sample/preview/about                 → About page (slug "/about")
 *   /p/sample/preview/products/classic-tee  → Classic tee product page
 *
 * The optional catch-all `[[...slug]]` means the bare `/preview` URL still
 * matches (slug = undefined). Deep-link URLs are now shareable — the
 * PreviewShell uses pushState on internal navigation to keep the bar in
 * sync, and back/forward browser buttons work naturally.
 */
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ projectId: string; slug?: string[] }>;
}) {
  const resolved = await params;
  const slugParts = resolved.slug ?? [];
  const initialSlug = slugParts.length ? `/${slugParts.join("/")}` : "/";
  return <PreviewShell projectId={resolved.projectId} initialSlug={initialSlug} />;
}

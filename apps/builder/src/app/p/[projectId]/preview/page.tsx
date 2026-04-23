import { PreviewShell } from "./preview-shell";

/**
 * `/p/[projectId]/preview` — full-bleed preview.
 *
 * Server component is thin: reads the param, delegates to the client-side
 * PreviewShell. Project data lives in localStorage, so all rendering is
 * client-driven. GSAP animations fire on mount and on scroll like they
 * will on a real exported site.
 */
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <PreviewShell projectId={projectId} />;
}

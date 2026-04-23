import { EditorShell } from "./editor-shell";

/**
 * `/p/[projectId]` — the editor route.
 *
 * Server component is deliberately thin: it reads the dynamic param and
 * hands off to EditorShell, which lives client-side because the entire
 * builder experience is client state (Zustand + localStorage). Phase 10.5
 * adds a server-side fetch here for projects coming from the studio flow.
 */
export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <EditorShell projectId={projectId} />;
}

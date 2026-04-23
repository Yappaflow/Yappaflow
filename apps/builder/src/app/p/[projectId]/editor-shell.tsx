"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProjectStore, startAutosave } from "@/lib/store";
import { buildSampleSiteProject } from "@/fixtures/sample-project";
import { LoadFromJsonModal } from "@/components/load-from-json";
import { ThemeToggle } from "@/components/theme-toggle";
import { TopBar } from "@/components/top-bar";
import { LeftRail } from "@/components/left-rail";
import { Canvas } from "@/components/canvas";
import { RightRail } from "@/components/right-rail";
import { useEditorShortcuts } from "@/lib/use-editor-shortcuts";

/**
 * Three-column editor shell.
 *
 * Layout uses flex rather than grid because flex with `flex-1 min-w-0`
 * behaves predictably for scroll containers — grid rows default to `auto`
 * and silently grow with content, which is what killed the canvas scroll
 * in the first attempt. Each column wraps its child in a flex container so
 * `h-full` inside the column resolves correctly.
 */
export function EditorShell({ projectId }: { projectId: string }) {
  const hydrate = useProjectStore((s) => s.hydrate);
  const project = useProjectStore((s) => s.project);
  const replaceProject = useProjectStore((s) => s.replaceProject);

  const [loadOpen, setLoadOpen] = useState(false);

  useEffect(() => {
    const fallback = projectId === "sample" ? buildSampleSiteProject() : null;
    hydrate(projectId, fallback);
  }, [projectId, hydrate]);

  useEffect(() => {
    return startAutosave();
  }, []);

  useEditorShortcuts();

  if (!project) {
    return <ProjectNotFound projectId={projectId} onLoad={replaceProject} />;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar onLoadJson={() => setLoadOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <div className="flex w-[260px] shrink-0 flex-col overflow-hidden">
          <LeftRail />
        </div>
        <main className="flex min-w-0 flex-1 flex-col overflow-auto bg-neutral-100/60 dark:bg-neutral-950">
          <Canvas />
        </main>
        <div className="flex w-[320px] shrink-0 flex-col overflow-hidden">
          <RightRail />
        </div>
      </div>
      {loadOpen ? (
        <LoadFromJsonModal
          onClose={() => setLoadOpen(false)}
          onLoad={(p) => {
            replaceProject(p);
            setLoadOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function ProjectNotFound({
  projectId,
  onLoad,
}: {
  projectId: string;
  onLoad: (project: ReturnType<typeof buildSampleSiteProject>) => void;
}) {
  const [loadOpen, setLoadOpen] = useState(false);
  return (
    <main className="min-h-dvh px-6 py-10 md:px-10">
      <header className="mb-10 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.22em] opacity-60">
          Yappaflow · Builder
        </span>
        <ThemeToggle />
      </header>
      <section className="max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight">
          Project <code className="font-mono text-base opacity-70">{projectId}</code>{" "}
          not found.
        </h1>
        <p className="mt-4 opacity-70">
          Nothing saved under this id in localStorage yet. Load a SiteProject
          from JSON to start editing it, or open the bundled sample.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setLoadOpen(true)}
            className="rounded-full border border-current/20 px-4 py-2 text-sm hover:border-current/40"
          >
            Paste SiteProject JSON
          </button>
          <Link
            href="/p/sample"
            className="rounded-full bg-ink px-4 py-2 text-sm text-paper dark:bg-paper dark:text-ink"
          >
            Open sample project
          </Link>
        </div>
      </section>
      {loadOpen ? (
        <LoadFromJsonModal
          onClose={() => setLoadOpen(false)}
          onLoad={(p) => {
            onLoad(p);
            setLoadOpen(false);
          }}
        />
      ) : null}
    </main>
  );
}

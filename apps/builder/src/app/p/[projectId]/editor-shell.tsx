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
 *   ┌────────────────────────────────────────────────────────────┐
 *   │  TopBar (title · save status · viewport · load · theme)    │
 *   ├────────┬──────────────────────────────────┬────────────────┤
 *   │        │                                  │                │
 *   │ Left   │         Canvas (iframe-less)     │   Right rail   │
 *   │ rail   │      renders SiteProject via     │   properties   │
 *   │        │      @yappaflow/sections         │                │
 *   └────────┴──────────────────────────────────┴────────────────┘
 *
 * The store is the single source of truth. Selection flows both ways — click
 * a section in the left rail OR click in the canvas; both dispatch
 * `selectSection`. The right rail edits content in place and autosaves
 * through the module-level subscription started on mount.
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
      {/*
        Grid children default to `min-height: auto`, which makes them grow to
        fit their content — killing any `overflow-auto` set inside them. The
        combo `min-h-0` + `overflow-hidden` on BOTH the grid and each column
        wrapper gives each column a bounded height, so the inner scrollers
        (canvas, left rail sections list, right rail properties panel) can
        clip and scroll independently.
      */}
      <div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)_320px] overflow-hidden">
        <div className="min-h-0 overflow-hidden">
          <LeftRail />
        </div>
        <main className="min-h-0 min-w-0 overflow-hidden">
          <Canvas />
        </main>
        <div className="min-h-0 overflow-hidden">
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

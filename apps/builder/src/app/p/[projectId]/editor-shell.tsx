"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useProjectStore, startAutosave } from "@/lib/store";
import { buildSampleSiteProject } from "@/fixtures/sample-project";
import { LoadFromJsonModal } from "@/components/load-from-json";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Phase 8a editor shell.
 *
 * For this chunk the shell is deliberately minimal — a debug sidebar that
 * shows the project title, page count, section count, a list of the home
 * page's sections, and a handful of mutation buttons that exercise the
 * store's actions. This proves the Zustand wiring, the autosave
 * round-trip, and the Load-from-JSON path.
 *
 * Phase 8b replaces this with the real three-column layout: left rail
 * (section list), iframe canvas (centre), right rail (property editor).
 * The debug UI below disappears then — it's scaffolding.
 */
export function EditorShell({ projectId }: { projectId: string }) {
  const hydrate = useProjectStore((s) => s.hydrate);
  const project = useProjectStore((s) => s.project);
  const dirty = useProjectStore((s) => s.dirty);
  const lastSavedAt = useProjectStore((s) => s.lastSavedAt);
  const selection = useProjectStore((s) => s.selection);
  const selectSection = useProjectStore((s) => s.selectSection);
  const moveSection = useProjectStore((s) => s.moveSection);
  const removeSection = useProjectStore((s) => s.removeSection);
  const insertSection = useProjectStore((s) => s.insertSection);
  const updateSectionContent = useProjectStore((s) => s.updateSectionContent);
  const replaceProject = useProjectStore((s) => s.replaceProject);

  const [loadOpen, setLoadOpen] = useState(false);

  // Hydrate the store from localStorage, falling back to the bundled sample
  // when the route is `/p/sample`. Any other projectId with nothing in
  // storage shows the "project not found" state below.
  useEffect(() => {
    const fallback = projectId === "sample" ? buildSampleSiteProject() : null;
    hydrate(projectId, fallback);
  }, [projectId, hydrate]);

  useEffect(() => {
    return startAutosave();
  }, []);

  const homePage = project?.pages[0] ?? null;
  const firstSectionHeading = useMemo(() => {
    const s = homePage?.sections.find((sec) => sec.type === "hero");
    const heading =
      s && typeof (s.content as { heading?: unknown }).heading === "string"
        ? ((s.content as { heading: string }).heading as string)
        : null;
    return heading;
  }, [homePage]);

  if (!project) {
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
            Project <code className="font-mono text-base opacity-70">{projectId}</code> not found.
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
              replaceProject(p);
              setLoadOpen(false);
            }}
          />
        ) : null}
      </main>
    );
  }

  return (
    <main className="min-h-dvh px-6 py-10 md:px-10">
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.22em] opacity-60">
          <span>Yappaflow · Builder</span>
          <span aria-hidden="true">·</span>
          <span className="lowercase tracking-normal opacity-80">
            {project.pages[0]?.title ?? "untitled"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <SaveStatus dirty={dirty} lastSavedAt={lastSavedAt} />
          <button
            onClick={() => setLoadOpen(true)}
            className="rounded-full border border-current/20 px-3 py-1.5 hover:border-current/40"
          >
            Load JSON
          </button>
          <ThemeToggle />
        </div>
      </header>

      <section className="grid gap-10 md:grid-cols-[320px_1fr]">
        <aside className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider opacity-60">
              Sections
            </h2>
            <ul className="mt-3 space-y-1">
              {homePage?.sections.map((section, i) => {
                const selected =
                  selection?.pageId === homePage.id &&
                  selection?.sectionId === section.id;
                return (
                  <li
                    key={section.id}
                    className={`group flex items-center gap-1 rounded border px-2 py-1.5 text-sm ${
                      selected
                        ? "border-current/40 bg-current/5"
                        : "border-transparent hover:border-current/20"
                    }`}
                  >
                    <button
                      onClick={() => selectSection(homePage.id, section.id)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <span className="w-6 font-mono text-xs opacity-40">
                        {(i + 1).toString().padStart(2, "0")}
                      </span>
                      <span className="flex-1">{section.type}</span>
                      <span className="text-xs opacity-50">
                        {section.variant}
                      </span>
                    </button>
                    <div className="flex opacity-0 transition group-hover:opacity-100">
                      <IconButton
                        label="Move up"
                        onClick={() => moveSection(homePage.id, section.id, "up")}
                        disabled={i === 0}
                      >
                        ↑
                      </IconButton>
                      <IconButton
                        label="Move down"
                        onClick={() =>
                          moveSection(homePage.id, section.id, "down")
                        }
                        disabled={i === homePage.sections.length - 1}
                      >
                        ↓
                      </IconButton>
                      <IconButton
                        label="Remove section"
                        onClick={() => removeSection(homePage.id, section.id)}
                      >
                        ×
                      </IconButton>
                    </div>
                  </li>
                );
              })}
            </ul>
            <button
              onClick={() => {
                if (!homePage) return;
                insertSection(homePage.id, "rich-text", homePage.sections.length);
              }}
              className="mt-3 w-full rounded border border-dashed border-current/30 py-2 text-sm hover:border-current/60"
            >
              + Add rich-text (Phase 8c ships the full picker)
            </button>
          </div>
        </aside>

        <div className="space-y-8">
          <header>
            <p className="text-xs uppercase tracking-[0.22em] opacity-60">
              {project.brief.industry}
              {project.brief.subcategory
                ? ` · ${project.brief.subcategory}`
                : ""}
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
              {firstSectionHeading ?? project.pages[0]?.title ?? "Untitled"}
            </h1>
            <p className="mt-3 text-sm opacity-60">
              {homePage?.sections.length ?? 0} sections · {project.pages.length} page
              {project.pages.length === 1 ? "" : "s"} · schema v
              {project.schemaVersion}
            </p>
          </header>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider opacity-60">
              Selected section
            </h2>
            {selection ? (
              <SelectedSectionPanel
                onPatchHeading={(heading) => {
                  updateSectionContent(selection.pageId, selection.sectionId, {
                    heading,
                  });
                }}
              />
            ) : (
              <p className="text-sm opacity-60">Nothing selected.</p>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider opacity-60">
              Phase 8 · next up
            </h2>
            <ol className="list-decimal space-y-1 pl-5 text-sm opacity-70">
              <li>
                <strong>8b</strong> — iframe canvas + skeleton Tailwind on sections.
              </li>
              <li>
                <strong>8c</strong> — full section picker + per-type insert menu.
              </li>
              <li>
                <strong>8d</strong> — schema-driven right rail.
              </li>
              <li>
                <strong>8e</strong> — inline contentEditable in canvas.
              </li>
              <li>
                <strong>8f</strong> — top bar, preview mode, keyboard shortcuts.
              </li>
            </ol>
          </section>
        </div>
      </section>

      {loadOpen ? (
        <LoadFromJsonModal
          onClose={() => setLoadOpen(false)}
          onLoad={(p) => {
            replaceProject(p);
            setLoadOpen(false);
          }}
        />
      ) : null}
    </main>
  );
}

function IconButton({
  children,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded text-xs opacity-60 hover:bg-current/10 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-20"
    >
      {children}
    </button>
  );
}

function SaveStatus({
  dirty,
  lastSavedAt,
}: {
  dirty: boolean;
  lastSavedAt: number | null;
}) {
  if (dirty) return <span className="opacity-70">Saving…</span>;
  if (lastSavedAt == null) return <span className="opacity-40">Not saved yet</span>;
  const secondsAgo = Math.max(0, Math.floor((Date.now() - lastSavedAt) / 1000));
  return (
    <span className="opacity-60">
      Saved {secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`}
    </span>
  );
}

function SelectedSectionPanel({
  onPatchHeading,
}: {
  onPatchHeading: (heading: string) => void;
}) {
  const selection = useProjectStore((s) => s.selection);
  const section = useProjectStore((s) => {
    if (!s.project || !s.selection) return null;
    const page = s.project.pages.find((p) => p.id === s.selection!.pageId);
    return page?.sections.find((x) => x.id === s.selection!.sectionId) ?? null;
  });

  if (!section || !selection) return null;

  const heading =
    typeof (section.content as { heading?: unknown }).heading === "string"
      ? ((section.content as { heading: string }).heading as string)
      : "";

  return (
    <div className="space-y-3 rounded-lg border border-current/10 p-4 text-sm">
      <div className="flex items-center gap-2">
        <span className="opacity-60">type</span>
        <code className="font-mono text-xs">{section.type}</code>
        <span className="opacity-60">·</span>
        <span className="opacity-60">variant</span>
        <code className="font-mono text-xs">{section.variant ?? "—"}</code>
      </div>
      {"heading" in section.content ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wider opacity-60">
            heading
          </span>
          <input
            value={heading}
            onChange={(e) => onPatchHeading(e.target.value)}
            className="rounded border border-current/20 bg-transparent px-3 py-2 text-sm focus:border-current/60 focus:outline-none"
          />
          <span className="text-xs opacity-50">
            Edit a field, reload the page — your change should still be here.
          </span>
        </label>
      ) : (
        <p className="text-xs opacity-60">
          This section type doesn&apos;t expose a <code>heading</code> field.
          Switch to a hero / feature-grid / etc. from the left rail to try
          inline editing.
        </p>
      )}
    </div>
  );
}

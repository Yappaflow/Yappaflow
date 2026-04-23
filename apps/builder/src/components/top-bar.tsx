"use client";

import Link from "next/link";
import { Eye, ExternalLink, RotateCw } from "lucide-react";
import { useProjectStore } from "@/lib/store";
import { ViewportSwitcher } from "./viewport-switcher";
import { ThemeToggle } from "./theme-toggle";
import { ExportButton } from "./export-button";

export function TopBar({
  onLoadJson,
  projectId,
}: {
  onLoadJson: () => void;
  projectId: string;
}) {
  const project = useProjectStore((s) => s.project);
  const activePageId = useProjectStore((s) => s.activePageId);
  const dirty = useProjectStore((s) => s.dirty);
  const lastSavedAt = useProjectStore((s) => s.lastSavedAt);
  const replayAnimations = useProjectStore((s) => s.replayAnimations);
  const previewMode = useProjectStore((s) => s.previewMode);
  const setPreviewMode = useProjectStore((s) => s.setPreviewMode);

  const activePage =
    project?.pages.find((p) => p.id === activePageId) ?? project?.pages[0];
  const pageTitle = activePage?.title ?? "untitled";

  if (previewMode) {
    return (
      <header className="flex items-center justify-between gap-3 border-b border-current/10 bg-black/80 px-4 py-2 text-xs text-white backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="font-medium">Preview</span>
          <span className="opacity-60">·</span>
          <span className="opacity-80">{pageTitle}</span>
        </div>
        <button
          onClick={() => setPreviewMode(false)}
          className="rounded-full border border-white/25 px-3 py-1 hover:border-white/60"
        >
          Exit preview
        </button>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-current/10 px-5 py-3">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-[11px] uppercase tracking-[0.22em] opacity-60 hover:opacity-100"
        >
          Yappaflow · Builder
        </Link>
        <span aria-hidden="true" className="opacity-30">
          /
        </span>
        <span className="text-sm font-medium">{pageTitle}</span>
        <SaveIndicator dirty={dirty} lastSavedAt={lastSavedAt} />
      </div>

      <div className="flex items-center gap-3">
        <ViewportSwitcher />
        <button
          onClick={replayAnimations}
          title="Replay all GSAP animations"
          className="inline-flex items-center gap-1.5 rounded-full border border-current/20 px-3 py-1.5 text-xs hover:border-current/40"
        >
          <RotateCw className="h-3 w-3" aria-hidden="true" />
          Replay
        </button>
        <button
          onClick={() => setPreviewMode(true)}
          title="Preview this page without builder chrome (Esc to exit)"
          className="inline-flex items-center gap-1.5 rounded-full border border-current/20 px-3 py-1.5 text-xs hover:border-current/40"
        >
          <Eye className="h-3 w-3" aria-hidden="true" />
          Preview
        </button>
        <a
          href={`/p/${projectId}/preview`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open a full preview in a new tab — navigate between pages"
          className="inline-flex items-center gap-1.5 rounded-full border border-current/20 px-3 py-1.5 text-xs hover:border-current/40"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          Open
        </a>
        <button
          onClick={onLoadJson}
          className="rounded-full border border-current/20 px-3 py-1.5 text-xs hover:border-current/40"
        >
          Load JSON
        </button>
        <ExportButton />
        <ThemeToggle />
      </div>
    </header>
  );
}

function SaveIndicator({
  dirty,
  lastSavedAt,
}: {
  dirty: boolean;
  lastSavedAt: number | null;
}) {
  if (dirty) {
    return (
      <span className="ml-2 inline-flex items-center gap-1.5 text-xs opacity-60">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
        Saving…
      </span>
    );
  }
  if (lastSavedAt == null) {
    return <span className="ml-2 text-xs opacity-40">Not saved</span>;
  }
  const secondsAgo = Math.max(0, Math.floor((Date.now() - lastSavedAt) / 1000));
  return (
    <span className="ml-2 inline-flex items-center gap-1.5 text-xs opacity-60">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {secondsAgo < 5 ? "Saved" : `Saved ${secondsAgo}s ago`}
    </span>
  );
}

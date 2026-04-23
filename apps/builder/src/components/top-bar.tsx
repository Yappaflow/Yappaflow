"use client";

import Link from "next/link";
import { RotateCw } from "lucide-react";
import { useProjectStore } from "@/lib/store";
import { ViewportSwitcher } from "./viewport-switcher";
import { ThemeToggle } from "./theme-toggle";
import { ExportButton } from "./export-button";

export function TopBar({ onLoadJson }: { onLoadJson: () => void }) {
  const project = useProjectStore((s) => s.project);
  const dirty = useProjectStore((s) => s.dirty);
  const lastSavedAt = useProjectStore((s) => s.lastSavedAt);
  const replayAnimations = useProjectStore((s) => s.replayAnimations);

  const pageTitle = project?.pages[0]?.title ?? "untitled";

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

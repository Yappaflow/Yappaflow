"use client";

import { useProjectStore, type Viewport } from "@/lib/store";

const VIEWPORTS: Array<{ id: Viewport; label: string; icon: string }> = [
  { id: "mobile", label: "Mobile", icon: "▯" },
  { id: "tablet", label: "Tablet", icon: "▭" },
  { id: "desktop", label: "Desktop", icon: "▬" },
];

export function ViewportSwitcher() {
  const viewport = useProjectStore((s) => s.viewport);
  const setViewport = useProjectStore((s) => s.setViewport);

  return (
    <div
      role="tablist"
      aria-label="Canvas viewport"
      className="inline-flex rounded-full border border-current/15 p-0.5"
    >
      {VIEWPORTS.map((v) => {
        const active = viewport === v.id;
        return (
          <button
            key={v.id}
            role="tab"
            aria-selected={active}
            onClick={() => setViewport(v.id)}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs transition ${
              active
                ? "bg-ink text-paper dark:bg-paper dark:text-ink"
                : "opacity-60 hover:opacity-100"
            }`}
          >
            <span aria-hidden="true">{v.icon}</span>
            <span>{v.label}</span>
          </button>
        );
      })}
    </div>
  );
}

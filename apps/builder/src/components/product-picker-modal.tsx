"use client";

import { useEffect, useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";
import type { Product } from "@yappaflow/types";
import { useProjectStore } from "@/lib/store";

/**
 * In-page modal for picking which products appear in a product-grid section.
 *
 * Opens automatically after a product-grid is inserted (via the Insert
 * palette) and on demand from the right-rail inspector. The agency picks a
 * subset of `SiteProject.productLibrary`; on confirm the section's content
 * gets `mode: "library"` + `productIds: [picked]`. Choosing nothing and
 * confirming = "show all from library" (`productIds: []`).
 *
 * Lives in the same window — never opens a popup or new tab. Closes on
 * Escape, click outside the dialog, Cancel button, or Confirm button.
 *
 * Reads its target section from `useProjectStore.productPickerSectionId`.
 * Renders nothing when the field is null, so editor-shell can mount it
 * unconditionally.
 */
export function ProductPickerModal() {
  const project = useProjectStore((s) => s.project);
  const sectionId = useProjectStore((s) => s.productPickerSectionId);
  const close = useProjectStore((s) => s.closeProductPicker);
  const updateSectionContent = useProjectStore(
    (s) => s.updateSectionContent,
  );

  // Locate the target section (page + section) the picker is editing.
  const target = useMemo(() => {
    if (!project || !sectionId) return null;
    for (const page of project.pages) {
      const section = page.sections.find((s) => s.id === sectionId);
      if (section) return { pageId: page.id, section };
    }
    return null;
  }, [project, sectionId]);

  const library: readonly Product[] = project?.productLibrary ?? [];

  // Local selection state. Seeds from the section's existing productIds so
  // re-opening the picker on an existing grid lets the agency tweak rather
  // than reset.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // "showAll" = render the whole library at runtime (productIds: []).
  // Distinct from "all checkboxes ticked" so future library additions also
  // show up automatically.
  const [showAll, setShowAll] = useState<boolean>(false);

  useEffect(() => {
    if (!target) return;
    const content = target.section.content as {
      mode?: unknown;
      productIds?: unknown;
    };
    const ids = Array.isArray(content.productIds)
      ? (content.productIds as string[])
      : [];
    const inLibraryMode = content.mode === "library";
    setSelected(new Set(ids));
    // Treat "library mode + empty productIds" as the show-all sentinel.
    setShowAll(inLibraryMode && ids.length === 0);
  }, [target]);

  // Escape closes the modal. Only attached when open.
  useEffect(() => {
    if (!sectionId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sectionId, close]);

  if (!sectionId || !target) return null;

  function toggle(id: string) {
    setShowAll(false);
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setShowAll(false);
    setSelected(new Set(library.map((p) => p.id)));
  }

  function clearAll() {
    setShowAll(false);
    setSelected(new Set());
  }

  function confirm() {
    const productIds = showAll ? [] : Array.from(selected);
    updateSectionContent(target!.pageId, target!.section.id, {
      mode: "library",
      productIds,
    });
    close();
  }

  const count = showAll ? library.length : selected.size;
  const summary = showAll
    ? `Show every product in the library (${library.length})`
    : count === 0
      ? "Pick at least one product or choose Show all"
      : `${count} of ${library.length} selected`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-picker-title"
      onClick={close}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-white/10 bg-paper shadow-2xl dark:bg-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-current/10 px-6 py-4">
          <div>
            <h2
              id="product-picker-title"
              className="text-lg font-semibold"
            >
              Pick products for this grid
            </h2>
            <p className="mt-1 text-xs opacity-60">
              The grid renders these products live from your library — edits
              you make in the Products panel propagate here automatically.
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-lg opacity-60 hover:bg-current/10 hover:opacity-100"
          >
            ×
          </button>
        </header>

        <div className="flex items-center gap-3 border-b border-current/10 px-6 py-3 text-xs">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="font-medium">
              Show all products (auto-include new ones)
            </span>
          </label>
          <span className="ml-auto opacity-50">·</span>
          <button
            onClick={selectAll}
            disabled={showAll}
            className="rounded px-2 py-1 hover:bg-current/10 disabled:opacity-40"
          >
            Select all
          </button>
          <button
            onClick={clearAll}
            disabled={showAll}
            className="rounded px-2 py-1 hover:bg-current/10 disabled:opacity-40"
          >
            Clear
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3">
          {library.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center text-sm opacity-60">
              <ShoppingBag className="h-6 w-6 opacity-50" aria-hidden="true" />
              <p>Your product library is empty.</p>
              <p className="text-xs opacity-70">
                Open the Products panel and click + New to add some.
              </p>
            </div>
          ) : (
            <ul className="grid gap-1.5">
              {library.map((p) => {
                const checked = showAll || selected.has(p.id);
                const hero = p.images[0];
                return (
                  <li key={p.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded border p-2 transition ${
                        checked
                          ? "border-current/40 bg-current/5"
                          : "border-current/15 hover:border-current/30 hover:bg-current/5"
                      } ${showAll ? "opacity-80" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={showAll}
                        onChange={() => toggle(p.id)}
                        className="h-4 w-4 rounded"
                      />
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-current/5">
                        {hero?.url ? (
                          <img
                            src={hero.url}
                            alt={hero.alt ?? p.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ShoppingBag
                            className="h-4 w-4 opacity-50"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {p.title}
                        </div>
                        <div className="truncate text-[11px] opacity-60">
                          {p.price}
                          {" · "}
                          <span className="font-mono opacity-70">
                            {p.handle}
                          </span>
                        </div>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-current/10 px-6 py-3">
          <span className="text-xs opacity-60">{summary}</span>
          <div className="flex gap-2">
            <button
              onClick={close}
              className="rounded-full border border-current/20 px-4 py-2 text-sm hover:border-current/40"
            >
              Cancel
            </button>
            <button
              onClick={confirm}
              disabled={!showAll && selected.size === 0 && library.length > 0}
              className="rounded-full bg-ink px-4 py-2 text-sm text-paper hover:opacity-90 disabled:opacity-40 dark:bg-paper dark:text-ink"
            >
              Use these
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

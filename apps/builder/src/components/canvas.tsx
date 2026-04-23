"use client";

import { useCallback, useState, type MouseEvent } from "react";
import { useDroppable, useDndMonitor } from "@dnd-kit/core";
import { SECTIONS } from "@yappaflow/sections";
import type { Section, SiteProject } from "@yappaflow/types";
import { useProjectStore, type Viewport } from "@/lib/store";
import { dropZoneId, type DropZoneData } from "@/lib/dnd";

/**
 * Canvas renders the SiteProject and exposes:
 *   - Click-to-select for every section
 *   - Hover outline for discovery
 *   - Selected outline ring
 *   - Drop zones between each section (and top/bottom of the page list)
 *     that accept drags from the Insert palette. When the user drops a
 *     palette card on a zone, the section inserts at that zone's index.
 */

const VIEWPORT_STYLE: Record<Viewport, { maxWidth: string; label: string }> = {
  mobile: { maxWidth: "390px", label: "iPhone 14" },
  tablet: { maxWidth: "820px", label: "iPad" },
  desktop: { maxWidth: "100%", label: "Desktop" },
};

export function Canvas() {
  const project = useProjectStore((s) => s.project);
  const viewport = useProjectStore((s) => s.viewport);
  const selection = useProjectStore((s) => s.selection);
  const selectSection = useProjectStore((s) => s.selectSection);

  // Whether a palette drag is in-flight. When true, drop zones become
  // visible (otherwise they stay at zero height — invisible but still
  // occupying the DOM so section hover/selection keeps working).
  const [paletteActive, setPaletteActive] = useState(false);

  useDndMonitor({
    onDragStart(event) {
      const kind = (event.active.data.current as { kind?: string } | undefined)?.kind;
      if (kind === "palette-card") setPaletteActive(true);
    },
    onDragEnd() {
      setPaletteActive(false);
    },
    onDragCancel() {
      setPaletteActive(false);
    },
  });

  const onCanvasClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!project) return;
      const target = event.target as HTMLElement;
      // Never follow links inside the canvas — the builder is a design tool.
      const anchor = target.closest("a");
      if (anchor) event.preventDefault();

      const sectionEl = target.closest<HTMLElement>("[data-yf-section-id]");
      if (!sectionEl) {
        selectSection(null, null);
        return;
      }
      const id = sectionEl.dataset.yfSectionId;
      if (!id) return;
      const owner = findSectionOwner(project, id);
      if (owner) selectSection(owner.pageId, owner.sectionId);
    },
    [project, selectSection],
  );

  if (!project) return null;

  const homePage = project.pages[0];
  const { header, footer, announcementBar } = project.globals;
  const { maxWidth, label } = VIEWPORT_STYLE[viewport];
  const pageSections = homePage?.sections ?? [];

  const selectedRing = selection?.sectionId
    ? `[data-yf-section-id="${escapeForAttrSelector(selection.sectionId)}"] {
         outline: 2px solid rgb(37 99 235);
         outline-offset: -2px;
       }`
    : "";
  const hoverRules = `
    [data-yf-section]:hover {
      outline: 1px dashed rgba(37, 99, 235, 0.45);
      outline-offset: -1px;
      cursor: pointer;
    }
  `;

  return (
    <div className="flex w-full flex-col items-center p-6">
      <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-neutral-400">
        {label} · {maxWidth === "100%" ? "fluid" : maxWidth}
      </div>
      <div
        style={{ maxWidth, width: "100%" }}
        className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-[max-width] duration-200 ease-out"
        onClickCapture={onCanvasClick}
      >
        <style dangerouslySetInnerHTML={{ __html: `${hoverRules}${selectedRing}` }} />
        {announcementBar ? <RenderSection section={announcementBar} /> : null}
        {header ? <RenderSection section={header} /> : null}

        {/* Drop zone at the top of the page (index 0). */}
        <CanvasDropZone atIndex={0} visible={paletteActive} />

        {pageSections.map((s, i) => (
          <div key={s.id}>
            <RenderSection section={s} />
            <CanvasDropZone atIndex={i + 1} visible={paletteActive} />
          </div>
        ))}

        {footer ? <RenderSection section={footer} /> : null}
      </div>
    </div>
  );
}

/**
 * A canvas drop zone. Renders with zero visible height when not actively
 * being dragged into (so section hover/click stays clean), expands to a
 * visible band during a palette drag, and brightens while `isOver`.
 */
function CanvasDropZone({
  atIndex,
  visible,
}: {
  atIndex: number;
  visible: boolean;
}) {
  const data: DropZoneData = { kind: "canvas-drop-zone", atIndex };
  const { isOver, setNodeRef } = useDroppable({
    id: dropZoneId(atIndex),
    data,
  });

  return (
    <div
      ref={setNodeRef}
      aria-hidden="true"
      className={`relative transition-all duration-150 ${
        visible ? "h-10" : "h-0"
      }`}
    >
      {visible ? (
        <div
          className={`absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-full border border-dashed transition-colors ${
            isOver
              ? "border-blue-500 bg-blue-500/10"
              : "border-neutral-300 bg-transparent"
          }`}
          style={{ height: "32px" }}
        >
          <div className="flex h-full items-center justify-center text-[11px] uppercase tracking-[0.2em] text-neutral-500">
            {isOver ? "Release to insert here" : "Drop a section"}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RenderSection({ section }: { section: Section }) {
  const def = SECTIONS[section.type];
  if (!def) {
    return (
      <div className="bg-red-50 p-4 text-sm text-red-700">
        Unknown section type: <code>{section.type}</code>
      </div>
    );
  }
  const Component = def.Component;
  return <Component section={section} />;
}

function findSectionOwner(
  project: SiteProject,
  sectionId: string,
): { pageId: string; sectionId: string } | null {
  for (const page of project.pages) {
    if (page.sections.some((s) => s.id === sectionId)) {
      return { pageId: page.id, sectionId };
    }
  }
  const g = project.globals;
  const slots: Array<"header" | "footer" | "announcementBar"> = [
    "header",
    "footer",
    "announcementBar",
  ];
  for (const slot of slots) {
    if (g[slot]?.id === sectionId) {
      return { pageId: `__globals__:${slot}`, sectionId };
    }
  }
  return null;
}

function escapeForAttrSelector(value: string): string {
  return value.replace(/"/g, '\\"').replace(/\\/g, "\\\\");
}

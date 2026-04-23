"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useDroppable, useDndMonitor } from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import { SECTIONS, SectionEditContext } from "@yappaflow/sections";
import type { Section, SiteProject } from "@yappaflow/types";
import { useProjectStore, type Viewport } from "@/lib/store";
import {
  dropZoneId,
  productGridDropId,
  type DropZoneData,
  type ProductGridDropData,
} from "@/lib/dnd";
import { playAllInContainer } from "@/lib/gsap-reveal";

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
  const updateSectionContent = useProjectStore((s) => s.updateSectionContent);
  const updateGlobalContent = useProjectStore((s) => s.updateGlobalContent);

  // Whether a palette drag is in-flight. When true, drop zones become
  // visible (otherwise they stay at zero height — invisible but still
  // occupying the DOM so section hover/selection keeps working).
  const [paletteActive, setPaletteActive] = useState(false);

  // Canvas inner ref — the GSAP reveal runtime queries this subtree for
  // [data-yf-anim] elements whenever the project changes and plays each
  // preset once. That covers mount (fresh load), section insert, variant
  // change, animation preset change — all of which re-render the canvas
  // and thus trigger this effect.
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const animationKey = buildAnimationKey(project);
  const animationEpoch = useProjectStore((s) => s.animationEpoch);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    // Defer one frame so the just-inserted DOM elements exist when GSAP
    // reads their bounding box. React 18+ flushes synchronously on most
    // renders but edge cases with concurrent mode benefit from rAF.
    let frame = 0;
    const cleanups: Array<() => void> = [];
    frame = requestAnimationFrame(() => {
      cleanups.push(...playAllInContainer(el));
    });
    return () => {
      cancelAnimationFrame(frame);
      cleanups.forEach((c) => c());
    };
    // Re-run on project changes so newly-inserted sections get their
    // animations. We key on a string of section-id × animation-preset
    // pairs to avoid re-running on every unrelated content change.
    // `animationEpoch` lets the top bar's Replay button force a re-run.
  }, [animationKey, animationEpoch]);

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
        ref={canvasRef}
        style={{ maxWidth, width: "100%" }}
        className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-[max-width] duration-200 ease-out"
        onClickCapture={onCanvasClick}
      >
        <style dangerouslySetInnerHTML={{ __html: `${hoverRules}${selectedRing}` }} />
        {announcementBar ? (
          <EditableSection
            section={announcementBar}
            onPatch={(patch) =>
              updateGlobalContent("announcementBar", patch)
            }
          />
        ) : null}
        {header ? (
          <EditableSection
            section={header}
            onPatch={(patch) => updateGlobalContent("header", patch)}
          />
        ) : null}

        {/* Drop zone at the top of the page (index 0). */}
        <CanvasDropZone atIndex={0} visible={paletteActive} />

        {pageSections.map((s, i) => {
          const onPatch = (patch: Record<string, unknown>) => {
            if (!homePage) return;
            updateSectionContent(homePage.id, s.id, patch);
          };
          return (
            <div key={s.id}>
              {s.type === "product-grid" && homePage ? (
                <ProductGridDropTarget pageId={homePage.id} sectionId={s.id}>
                  <EditableSection section={s} onPatch={onPatch} />
                </ProductGridDropTarget>
              ) : (
                <EditableSection section={s} onPatch={onPatch} />
              )}
              <CanvasDropZone atIndex={i + 1} visible={paletteActive} />
            </div>
          );
        })}

        {footer ? (
          <EditableSection
            section={footer}
            onPatch={(patch) => updateGlobalContent("footer", patch)}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * A canvas drop zone. Zero visible height when no palette drag is in flight
 * (so section hover/click stays clean). Framer Motion AnimatePresence
 * animates the zone opening to 40px when a drag starts, and brightens its
 * border + label when the pointer is over it.
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
    <div ref={setNodeRef} aria-hidden="true" className="relative">
      <AnimatePresence initial={false}>
        {visible ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 40, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 38 }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ scale: 0.98 }}
              animate={{ scale: isOver ? 1.02 : 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
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
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Wraps a product-grid section so it becomes a drop target for library
 * products. Highlights on isOver with a ring — the user sees their drop
 * would land on this specific grid. Drop logic is in editor-shell's
 * handleDragEnd.
 */
function ProductGridDropTarget({
  pageId,
  sectionId,
  children,
}: {
  pageId: string;
  sectionId: string;
  children: React.ReactNode;
}) {
  const data: ProductGridDropData = {
    kind: "product-grid-drop",
    pageId,
    sectionId,
  };
  const { isOver, setNodeRef } = useDroppable({
    id: productGridDropId(sectionId),
    data,
  });
  return (
    <div
      ref={setNodeRef}
      className={
        isOver
          ? "relative outline-dashed outline-2 outline-offset-[-4px] outline-emerald-500"
          : "relative"
      }
    >
      {isOver ? (
        <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white shadow-md">
          Add product
        </div>
      ) : null}
      {children}
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

/**
 * Renders a section inside a SectionEditContext provider so any EditableText
 * inside can flush field-path edits back to the store. Dot-path fields walk
 * one level deep into nested objects (e.g. `primaryCta.label` →
 * `{primaryCta: {...existing, label: value}}`). Deeper nesting can be added
 * when a section actually needs it.
 */
function EditableSection({
  section,
  onPatch,
}: {
  section: Section;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  const contextValue = {
    onEdit(field: string, value: string) {
      const parts = field.split(".");
      if (parts.length === 1) {
        onPatch({ [field]: value });
        return;
      }
      const [root, ...rest] = parts;
      if (!root) return;
      const existing =
        ((section.content as Record<string, unknown>)[root] as
          | Record<string, unknown>
          | undefined) ?? {};
      const next: Record<string, unknown> = { ...existing };
      // Single-level nested support covers every current case
      // (primaryCta.label, secondaryCta.label, cta.label, logo.text, etc.).
      const leaf = rest[rest.length - 1];
      if (!leaf) return;
      next[leaf] = value;
      onPatch({ [root]: next });
    },
  };
  return (
    <SectionEditContext.Provider value={contextValue}>
      <RenderSection section={section} />
    </SectionEditContext.Provider>
  );
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

/**
 * Cache key for the GSAP reveal effect. We want the reveal to run when the
 * set of sections changes (insert/remove/reorder) or any animation preset
 * changes — but NOT on every content keystroke. Hashing just the relevant
 * fields achieves that.
 */
function buildAnimationKey(project: SiteProject | null): string {
  if (!project) return "";
  const parts: string[] = [];
  for (const slot of ["announcementBar", "header", "footer"] as const) {
    const s = project.globals[slot];
    if (s) parts.push(`${slot}:${s.id}:${s.animation ?? ""}`);
  }
  for (const page of project.pages) {
    for (const section of page.sections) {
      parts.push(`${section.id}:${section.animation ?? ""}`);
    }
  }
  return parts.join("|");
}

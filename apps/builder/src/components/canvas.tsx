"use client";

import { useCallback, type MouseEvent } from "react";
import { SECTIONS } from "@yappaflow/sections";
import type { Section, SiteProject } from "@yappaflow/types";
import { useProjectStore, type Viewport } from "@/lib/store";

/**
 * Canvas — renders the SiteProject visually using the section library's
 * React components. Click anywhere inside a section to select it; the
 * selected section gets an outline (injected via a tiny <style> block so we
 * don't have to clone or wrap the section markup).
 *
 * Phase 8 (this push) renders inline — no iframe isolation yet. The section
 * library uses utility-class styling that doesn't cascade, so the risk of
 * styles leaking into the builder chrome is low. If it becomes a problem we
 * migrate to an iframe postMessage bridge in 8.5 without touching the store.
 */

// Desktop renders at the canvas container's natural width (up to its
// `max-w-6xl` inside the section components). Mobile/tablet clamp to real
// device widths so agencies can verify responsive breakpoints.
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

  const onCanvasClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!project) return;
      const target = event.target as HTMLElement;
      // Never follow links inside the canvas — the builder is a design tool,
      // not a browser. preventDefault on clicks that would navigate away.
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

  const selectedRing = selection?.sectionId
    ? `[data-yf-section-id="${escapeForAttrSelector(selection.sectionId)}"] {
         outline: 2px solid rgb(37 99 235);
         outline-offset: -2px;
       }`
    : "";

  // Webflow-style hover affordance — a faint dashed outline shows the user
  // a section is clickable. Suppressed on the selected one (solid blue takes
  // priority). Scoped to this canvas so it doesn't leak to any other sections
  // elsewhere in the builder.
  const hoverRules = `
    [data-yf-section]:hover {
      outline: 1px dashed rgba(37, 99, 235, 0.45);
      outline-offset: -1px;
      cursor: pointer;
    }
  `;

  return (
    <div className="flex h-full w-full flex-col items-center overflow-auto bg-neutral-100/60 p-6 dark:bg-neutral-950">
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
        {homePage?.sections.map((s) => (
          <RenderSection key={s.id} section={s} />
        ))}
        {footer ? <RenderSection section={footer} /> : null}
      </div>
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

/**
 * Minimal CSS-attribute-selector escaping. Section ids only contain
 * ASCII + `_` today, but we shield against the odd future id that might
 * carry a quote or backslash just in case.
 */
function escapeForAttrSelector(value: string): string {
  return value.replace(/"/g, '\\"').replace(/\\/g, "\\\\");
}

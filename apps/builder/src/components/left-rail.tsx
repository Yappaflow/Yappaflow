"use client";

import { useState } from "react";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SectionType } from "@yappaflow/types";
import { useProjectStore } from "@/lib/store";
import type { SortableSectionData } from "@/lib/dnd";
import { InsertPanel } from "./insert-panel";
import { ProductsPanel } from "./products-panel";
import { NewPageModal } from "./new-page-modal";
import { iconForSection } from "@/lib/section-icons";

type Panel = "layers" | "insert" | "products";

/**
 * Left rail — two panels switched via a pill-tab bar:
 *
 *   LAYERS — globals list + current page's section list (sortable, click to
 *            select, hover for move/dup/delete actions).
 *   INSERT — palette of draggable section/component cards. Drag from here
 *            onto a canvas drop zone to insert at a specific position, or
 *            click a card to append at the end.
 *
 * DndContext lives in editor-shell.tsx and wraps both sidebars + canvas, so
 * both the sortable list and the palette cards participate in the same drag
 * universe.
 */
export function LeftRail() {
  const project = useProjectStore((s) => s.project);
  const activePageId = useProjectStore((s) => s.activePageId);
  const selection = useProjectStore((s) => s.selection);
  const selectSection = useProjectStore((s) => s.selectSection);
  const removeSection = useProjectStore((s) => s.removeSection);
  const duplicateSection = useProjectStore((s) => s.duplicateSection);
  const setActivePageId = useProjectStore((s) => s.setActivePageId);
  const removePage = useProjectStore((s) => s.removePage);
  const addPage = useProjectStore((s) => s.addPage);

  const [panel, setPanel] = useState<Panel>("layers");
  const [newPageOpen, setNewPageOpen] = useState(false);

  if (!project) return null;
  const page =
    project.pages.find((p) => p.id === activePageId) ?? project.pages[0];
  if (!page) return null;

  const globals = project.globals;
  const globalEntries: Array<{
    slot: "announcementBar" | "header" | "footer";
    label: string;
    section: typeof globals.header | undefined;
  }> = [
    { slot: "announcementBar", label: "Announcement bar", section: globals.announcementBar },
    { slot: "header", label: "Header", section: globals.header },
    { slot: "footer", label: "Footer", section: globals.footer },
  ];

  return (
    <aside className="flex h-full flex-col border-r border-current/10">
      <div className="flex items-center gap-1 border-b border-current/10 px-3 py-2">
        <PanelTab active={panel === "layers"} onClick={() => setPanel("layers")}>
          Layers
        </PanelTab>
        <PanelTab active={panel === "insert"} onClick={() => setPanel("insert")}>
          Insert
        </PanelTab>
        <PanelTab active={panel === "products"} onClick={() => setPanel("products")}>
          Products
        </PanelTab>
      </div>

      {panel === "layers" ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-current/10 px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-60">
                Pages
                <span className="ml-1 opacity-50">· {project.pages.length}</span>
              </h2>
              <button
                onClick={() => setNewPageOpen(true)}
                className="rounded-full border border-current/20 px-2 py-0.5 text-[11px] hover:border-current/40"
                title="Add page"
              >
                + Page
              </button>
            </div>
            <ul className="mt-2 space-y-0.5">
              {project.pages.map((p) => {
                const isActive = p.id === page.id;
                return (
                  <li key={p.id}>
                    <div
                      className={`group flex items-center gap-1 rounded px-2 py-1.5 text-sm transition ${
                        isActive
                          ? "bg-current/10"
                          : "opacity-70 hover:bg-current/5 hover:opacity-100"
                      }`}
                    >
                      <button
                        onClick={() => setActivePageId(p.id)}
                        className="flex flex-1 items-center gap-2 text-left"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isActive ? "bg-blue-500" : "bg-current/30"
                          }`}
                          aria-hidden="true"
                        />
                        <span className="flex-1 truncate">{p.title}</span>
                        <span className="font-mono text-[10px] opacity-50">
                          {p.slug}
                        </span>
                      </button>
                      {project.pages.length > 1 ? (
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete page "${p.title}"? Its sections will be lost.`,
                              )
                            ) {
                              removePage(p.id);
                            }
                          }}
                          aria-label="Delete page"
                          className="flex h-6 w-6 items-center justify-center rounded text-xs opacity-0 transition hover:bg-current/15 hover:opacity-100 group-hover:opacity-60"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="border-b border-current/10 px-4 py-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-60">
              Globals
            </h2>
            <ul className="mt-2 space-y-0.5">
              {globalEntries.map(({ slot, label, section }) => {
                if (!section) return null;
                const selected =
                  selection?.pageId === `__globals__:${slot}` &&
                  selection.sectionId === section.id;
                const Icon = iconForSection(section.type);
                return (
                  <li key={slot}>
                    <button
                      onClick={() =>
                        selectSection(`__globals__:${slot}`, section.id)
                      }
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition ${
                        selected
                          ? "bg-current/10 text-current"
                          : "opacity-70 hover:bg-current/5 hover:opacity-100"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
                      <span className="flex-1 truncate text-left">{label}</span>
                      <span className="text-[10px] uppercase tracking-wider opacity-60">
                        {section.variant}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex-1 overflow-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-60">
                {page.title} · Sections
              </h2>
              <span className="text-[10px] opacity-40">
                {page.sections.length}
              </span>
            </div>

            <SortableContext
              items={page.sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="mt-2 space-y-0.5">
                {page.sections.map((section, i) => {
                  const selected =
                    selection?.pageId === page.id &&
                    selection.sectionId === section.id;
                  return (
                    <SortableSectionRow
                      key={section.id}
                      id={section.id}
                      index={i}
                      type={section.type as SectionType}
                      variant={section.variant ?? ""}
                      selected={selected}
                      onSelect={() => selectSection(page.id, section.id)}
                      onRemove={() => removeSection(page.id, section.id)}
                      onDuplicate={() => duplicateSection(page.id, section.id)}
                    />
                  );
                })}
              </ul>
            </SortableContext>

            {page.sections.length === 0 ? (
              <button
                onClick={() => setPanel("insert")}
                className="mt-3 w-full rounded border border-dashed border-current/30 py-6 text-xs opacity-70 transition hover:border-current/60 hover:opacity-100"
              >
                No sections yet. Open Insert to add one.
              </button>
            ) : null}
          </div>
        </div>
      ) : panel === "insert" ? (
        <InsertPanel />
      ) : (
        <ProductsPanel />
      )}

      {newPageOpen ? (
        <NewPageModal
          existingSlugs={project.pages.map((p) => p.slug)}
          onClose={() => setNewPageOpen(false)}
          onCreate={({ title, slug, sections }) => {
            if (project.pages.length >= 15) {
              const proceed = window.confirm(
                "You already have 15 pages. Most sites ship with ≤ 10. Add anyway?",
              );
              if (!proceed) return;
            }
            addPage({ title, slug, sections });
            setNewPageOpen(false);
          }}
        />
      ) : null}
    </aside>
  );
}

function PanelTab({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-selected={active}
      className={`rounded-md px-3 py-1.5 text-xs transition ${
        active
          ? "bg-current/10 text-current"
          : "opacity-60 hover:bg-current/5 hover:opacity-100"
      }`}
    >
      {children}
    </button>
  );
}

function SortableSectionRow({
  id,
  index,
  type,
  variant,
  selected,
  onSelect,
  onRemove,
  onDuplicate,
}: {
  id: string;
  index: number;
  type: SectionType;
  variant: string;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const data: SortableSectionData = { kind: "sortable-section", sectionId: id };
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data });
  const Icon = iconForSection(type);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <div
        className={`group flex items-center gap-1 rounded px-1 py-1.5 text-sm transition ${
          selected ? "bg-current/10" : "hover:bg-current/5"
        }`}
      >
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="flex h-7 w-5 cursor-grab items-center justify-center rounded opacity-60 transition hover:bg-current/10 hover:opacity-100 active:cursor-grabbing"
        >
          <DragHandleGlyph />
        </button>
        <button
          onClick={onSelect}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className="w-5 font-mono text-[10px] opacity-40">
            {(index + 1).toString().padStart(2, "0")}
          </span>
          <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
          <span className="flex-1 truncate">{type}</span>
          <span className="text-[10px] uppercase tracking-wider opacity-50">
            {variant}
          </span>
        </button>
        <div className="flex opacity-0 transition group-hover:opacity-100">
          <IconButton label="Duplicate" onClick={onDuplicate}>
            ⎘
          </IconButton>
          <IconButton label="Remove" onClick={onRemove}>
            ×
          </IconButton>
        </div>
      </div>
    </li>
  );
}

function IconButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded text-xs opacity-60 hover:bg-current/15 hover:opacity-100"
    >
      {children}
    </button>
  );
}

function DragHandleGlyph() {
  // Slightly larger than before — 8×12 with 1.25px dots reads clearly at
  // opacity 60 on both light and dark chrome. Kept as a dotted grip
  // because that's the pattern users recognise as "draggable" across
  // Webflow, Notion, Figma plugins, Linear's list view, etc.
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor" aria-hidden="true">
      <circle cx="2" cy="2" r="1.25" />
      <circle cx="6" cy="2" r="1.25" />
      <circle cx="2" cy="6" r="1.25" />
      <circle cx="6" cy="6" r="1.25" />
      <circle cx="2" cy="10" r="1.25" />
      <circle cx="6" cy="10" r="1.25" />
    </svg>
  );
}

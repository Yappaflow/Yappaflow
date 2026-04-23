"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SectionType } from "@yappaflow/types";
import { useProjectStore } from "@/lib/store";
import { SectionPicker } from "./section-picker";

export function LeftRail() {
  const project = useProjectStore((s) => s.project);
  const selection = useProjectStore((s) => s.selection);
  const selectSection = useProjectStore((s) => s.selectSection);
  const removeSection = useProjectStore((s) => s.removeSection);
  const duplicateSection = useProjectStore((s) => s.duplicateSection);
  const insertSection = useProjectStore((s) => s.insertSection);
  const reorderSections = useProjectStore((s) => s.reorderSections);

  const [pickerOpen, setPickerOpen] = useState(false);

  // PointerSensor with a small activation distance keeps accidental drags
  // from firing when the user just wanted to click the row to select.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!project) return null;
  const page = project.pages[0];
  if (!page) return null;

  function handlePick(type: SectionType) {
    if (!page) return;
    insertSection(page.id, type, page.sections.length);
    setPickerOpen(false);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !page) return;
    const oldIndex = page.sections.findIndex((s) => s.id === active.id);
    const newIndex = page.sections.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(page.sections, oldIndex, newIndex);
    reorderSections(
      page.id,
      reordered.map((s) => s.id),
    );
  }

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
            return (
              <li key={slot}>
                <button
                  onClick={() =>
                    selectSection(`__globals__:${slot}`, section.id)
                  }
                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm transition ${
                    selected
                      ? "bg-current/10 text-current"
                      : "opacity-70 hover:bg-current/5 hover:opacity-100"
                  }`}
                >
                  <span className="truncate">{label}</span>
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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
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
                    type={section.type}
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
        </DndContext>

        <button
          onClick={() => setPickerOpen(true)}
          className="mt-3 w-full rounded border border-dashed border-current/30 py-2 text-xs opacity-70 transition hover:border-current/60 hover:opacity-100"
        >
          + Add section
        </button>
      </div>

      {pickerOpen ? (
        <SectionPicker
          onClose={() => setPickerOpen(false)}
          onPick={handlePick}
        />
      ) : null}
    </aside>
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
  type: string;
  variant: string;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

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
          className="flex h-6 w-4 cursor-grab items-center justify-center opacity-30 transition hover:opacity-80 active:cursor-grabbing"
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
  return (
    <svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor" aria-hidden="true">
      <circle cx="1" cy="1" r="1" />
      <circle cx="5" cy="1" r="1" />
      <circle cx="1" cy="5" r="1" />
      <circle cx="5" cy="5" r="1" />
      <circle cx="1" cy="9" r="1" />
      <circle cx="5" cy="9" r="1" />
    </svg>
  );
}

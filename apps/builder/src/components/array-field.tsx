"use client";

import { useId, useState } from "react";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

/**
 * Generic array-of-objects editor for section content fields. Rows are
 * independently collapsible, each with a drag handle for reorder, keyboard
 * up/down buttons for accessibility, and per-column editable fields when
 * expanded.
 *
 * Uses its OWN DndContext (not the editor-shell one) so that dragging items
 * inside this array can't accidentally trigger section-level reordering.
 * The contexts are isolated — no id collisions because we generate a
 * unique id prefix per ArrayField instance via React's `useId()`.
 */

export interface ArrayFieldColumn {
  key: string;
  label?: string;
  kind?: "text" | "textarea" | "url" | "number";
  placeholder?: string;
  /** For nested single-level objects (e.g. product.image.url). */
  nestedKey?: string;
}

export function ArrayField({
  label,
  value,
  columns,
  makeBlankItem,
  onChange,
  itemLabel,
}: {
  label: string;
  value: Array<Record<string, unknown>>;
  columns: ArrayFieldColumn[];
  makeBlankItem: () => Record<string, unknown>;
  onChange: (next: Array<Record<string, unknown>>) => void;
  itemLabel?: (item: Record<string, unknown>, index: number) => string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(
    value.length > 0 ? 0 : null,
  );
  const fieldId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // Stable per-index sortable ids, scoped to this field's useId prefix so
  // multiple ArrayField instances on the same page don't collide.
  const sortableIds = value.map((_, i) => `${fieldId}-row-${i}`);

  function setAt(index: number, next: Record<string, unknown>) {
    const copy = [...value];
    copy[index] = next;
    onChange(copy);
  }

  function addItem() {
    const copy = [...value, makeBlankItem()];
    onChange(copy);
    setOpenIndex(copy.length - 1);
  }

  function removeAt(index: number) {
    const copy = value.filter((_, i) => i !== index);
    onChange(copy);
    setOpenIndex(null);
  }

  function moveItem(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= value.length) return;
    onChange(arrayMove(value, index, target));
    setOpenIndex(target);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortableIds.indexOf(String(active.id));
    const newIndex = sortableIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(value, oldIndex, newIndex));
    // Keep the dragged item in its now-new position opened if it was open.
    setOpenIndex((current) => {
      if (current == null) return null;
      if (current === oldIndex) return newIndex;
      return current;
    });
  }

  return (
    <fieldset className="mb-4 rounded border border-current/10">
      <legend className="mx-3 px-1 text-[11px] font-medium uppercase tracking-[0.18em] opacity-60">
        {label}
      </legend>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <ul className="divide-y divide-current/10">
            {value.map((item, i) => (
              <SortableArrayRow
                key={sortableIds[i]}
                sortableId={sortableIds[i]!}
                index={i}
                item={item}
                columns={columns}
                open={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                onMoveUp={() => moveItem(i, "up")}
                onMoveDown={() => moveItem(i, "down")}
                onRemove={() => removeAt(i)}
                onChange={(next) => setAt(i, next)}
                canMoveUp={i > 0}
                canMoveDown={i < value.length - 1}
                label={
                  itemLabel
                    ? itemLabel(item, i)
                    : (item.title as string) ||
                      (item.author as string) ||
                      (item.heading as string) ||
                      `Item ${i + 1}`
                }
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <div className="p-2">
        <button
          onClick={addItem}
          className="w-full rounded border border-dashed border-current/25 py-1.5 text-xs opacity-70 transition hover:border-current/50 hover:opacity-100"
        >
          + Add item
        </button>
      </div>
    </fieldset>
  );
}

function SortableArrayRow({
  sortableId,
  index,
  item,
  label,
  columns,
  open,
  onToggle,
  onMoveUp,
  onMoveDown,
  onRemove,
  onChange,
  canMoveUp,
  canMoveDown,
}: {
  sortableId: string;
  index: number;
  item: Record<string, unknown>;
  label: string;
  columns: ArrayFieldColumn[];
  open: boolean;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onChange: (next: Record<string, unknown>) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <div className="flex items-center gap-1 px-2 py-2">
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="flex h-6 w-3 cursor-grab items-center justify-center opacity-30 transition hover:opacity-80 active:cursor-grabbing"
        >
          <DragHandleGlyph />
        </button>
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left text-sm"
        >
          <span className="w-5 font-mono text-[10px] opacity-40">
            {(index + 1).toString().padStart(2, "0")}
          </span>
          <span className="flex-1 truncate">{label}</span>
          <span className="text-[10px] opacity-50">{open ? "▾" : "▸"}</span>
        </button>
        <MiniButton label="Move up" onClick={onMoveUp} disabled={!canMoveUp}>
          ↑
        </MiniButton>
        <MiniButton label="Move down" onClick={onMoveDown} disabled={!canMoveDown}>
          ↓
        </MiniButton>
        <MiniButton label="Remove" onClick={onRemove}>
          ×
        </MiniButton>
      </div>
      {open ? (
        <div className="space-y-2 border-t border-current/10 bg-current/[0.02] p-3">
          {columns.map((col) => {
            const raw = col.nestedKey
              ? ((item[col.key] as Record<string, unknown> | undefined)?.[
                  col.nestedKey
                ] as string | number | undefined)
              : (item[col.key] as string | number | undefined);
            const value = raw == null ? "" : String(raw);
            return (
              <label
                key={`${col.key}${col.nestedKey ?? ""}`}
                className="flex flex-col gap-1"
              >
                <span className="text-[10px] uppercase tracking-wider opacity-50">
                  {col.label ?? `${col.key}${col.nestedKey ? "." + col.nestedKey : ""}`}
                </span>
                {col.kind === "textarea" ? (
                  <textarea
                    value={value}
                    placeholder={col.placeholder}
                    onChange={(e) => {
                      const next = cloneItem(item);
                      setNested(next, col, e.target.value);
                      onChange(next);
                    }}
                    rows={3}
                    className="rounded border border-current/20 bg-transparent px-2 py-1.5 text-sm focus:border-current/60 focus:outline-none"
                  />
                ) : (
                  <input
                    type={col.kind === "number" ? "number" : "text"}
                    value={value}
                    placeholder={col.placeholder}
                    onChange={(e) => {
                      const next = cloneItem(item);
                      const val =
                        col.kind === "number"
                          ? Number(e.target.value)
                          : e.target.value;
                      setNested(next, col, val);
                      onChange(next);
                    }}
                    className="rounded border border-current/20 bg-transparent px-2 py-1.5 text-sm focus:border-current/60 focus:outline-none"
                  />
                )}
              </label>
            );
          })}
        </div>
      ) : null}
    </li>
  );
}

function cloneItem(item: Record<string, unknown>): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...item };
  for (const [k, v] of Object.entries(copy)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      copy[k] = { ...(v as Record<string, unknown>) };
    }
  }
  return copy;
}

function setNested(
  target: Record<string, unknown>,
  col: ArrayFieldColumn,
  value: string | number,
): void {
  if (col.nestedKey) {
    const existing = (target[col.key] as Record<string, unknown>) ?? {};
    target[col.key] = { ...existing, [col.nestedKey]: value };
  } else {
    target[col.key] = value;
  }
}

function MiniButton({
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
      className="flex h-6 w-6 items-center justify-center rounded text-xs opacity-50 hover:bg-current/15 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-20"
    >
      {children}
    </button>
  );
}

function DragHandleGlyph() {
  return (
    <svg
      width="6"
      height="10"
      viewBox="0 0 6 10"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="1" cy="1" r="1" />
      <circle cx="5" cy="1" r="1" />
      <circle cx="1" cy="5" r="1" />
      <circle cx="5" cy="5" r="1" />
      <circle cx="1" cy="9" r="1" />
      <circle cx="5" cy="9" r="1" />
    </svg>
  );
}

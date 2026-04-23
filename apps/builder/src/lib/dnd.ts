"use client";

import type { SectionType } from "@yappaflow/types";

/**
 * Shared dnd-kit data payloads.
 *
 * Both `useSortable` (reordering sections in the list) and `useDraggable`
 * (dragging a palette card onto the canvas) fire through the SAME
 * DndContext at the editor-shell level. `handleDragEnd` needs to know
 * which kind of drag it's seeing — that discriminator lives in the
 * `data.current.kind` field we stamp on every draggable and droppable.
 */

export type DragKind = "palette-card" | "sortable-section";

export interface PaletteCardData {
  kind: "palette-card";
  type: SectionType;
}

export interface SortableSectionData {
  kind: "sortable-section";
  sectionId: string;
}

export interface DropZoneData {
  kind: "canvas-drop-zone";
  /** Index within the current page's sections[] to insert at. */
  atIndex: number;
}

export type ActiveDragData = PaletteCardData | SortableSectionData;
export type OverDropData = DropZoneData | SortableSectionData;

/** Stable droppable id for a drop zone at position `atIndex`. */
export function dropZoneId(atIndex: number): string {
  return `canvas-drop-zone:${atIndex}`;
}

/** Stable draggable id for a palette card. */
export function paletteDraggableId(type: SectionType): string {
  return `palette:${type}`;
}

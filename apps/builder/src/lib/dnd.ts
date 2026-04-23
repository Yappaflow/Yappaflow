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

export type DragKind =
  | "palette-card"
  | "sortable-section"
  | "library-product";

export interface PaletteCardData {
  kind: "palette-card";
  type: SectionType;
}

export interface SortableSectionData {
  kind: "sortable-section";
  sectionId: string;
}

export interface LibraryProductData {
  kind: "library-product";
  productId: string;
}

export interface DropZoneData {
  kind: "canvas-drop-zone";
  /** Index within the current page's sections[] to insert at. */
  atIndex: number;
}

/** A product-grid section acting as a drop target for library products. */
export interface ProductGridDropData {
  kind: "product-grid-drop";
  pageId: string;
  sectionId: string;
}

export type ActiveDragData =
  | PaletteCardData
  | SortableSectionData
  | LibraryProductData;
export type OverDropData =
  | DropZoneData
  | SortableSectionData
  | ProductGridDropData;

/** Stable droppable id for a drop zone at position `atIndex`. */
export function dropZoneId(atIndex: number): string {
  return `canvas-drop-zone:${atIndex}`;
}

/** Stable draggable id for a palette card. */
export function paletteDraggableId(type: SectionType): string {
  return `palette:${type}`;
}

/** Stable draggable id for a library product card. */
export function libraryProductDraggableId(productId: string): string {
  return `library-product:${productId}`;
}

/** Stable droppable id for a product-grid section. */
export function productGridDropId(sectionId: string): string {
  return `product-grid:${sectionId}`;
}

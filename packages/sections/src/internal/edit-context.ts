"use client";

import { createContext } from "react";

/**
 * Optional per-section edit bridge.
 *
 * When a Section is rendered inside the builder's canvas, the canvas wraps
 * it in a `<SectionEditContext.Provider>` whose `onEdit` callback flushes
 * the user's inline text edits into the project store. When rendered
 * anywhere else (CMS export, SSR preview, marketing page embedding), the
 * context is null and `EditableText` falls back to a plain read-only node.
 *
 * Field paths use dot notation (`"heading"`, `"primaryCta.label"`). The
 * receiver is responsible for walking the path into `section.content`.
 */

export interface SectionEditContextValue {
  onEdit(field: string, value: string): void;
}

export const SectionEditContext = createContext<SectionEditContextValue | null>(
  null,
);

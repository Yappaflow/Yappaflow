"use client";

import { useEffect } from "react";
import { useProjectStore } from "./store";

/**
 * Builder-wide keyboard shortcuts, inspired by how Webflow and Framer bind
 * editor-level actions to the document. All shortcuts no-op when the user
 * is focused inside an input / textarea / contenteditable — so typing "d" in
 * the heading field doesn't accidentally delete the section.
 *
 *   Delete / Backspace  → remove selected section
 *   Alt + ↑ / Alt + ↓   → move selected section up / down
 *   Cmd/Ctrl + D        → duplicate selected section
 *   Escape              → clear selection
 */
export function useEditorShortcuts(): void {
  useEffect(() => {
    function isTypingTarget(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      return false;
    }

    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      const state = useProjectStore.getState();
      const selection = state.selection;
      const project = state.project;
      if (!project) return;

      // Only handle page-section shortcuts, not globals (reorder/delete on
      // globals doesn't make sense — they're required).
      const onPageSection =
        selection && !selection.pageId.startsWith("__globals__:");
      const isMeta = e.metaKey || e.ctrlKey;

      if (e.key === "Escape") {
        state.selectSection(null, null);
        return;
      }

      if (!onPageSection) return;

      // TypeScript narrowing — after the guard, selection is non-null.
      const sel = selection!;

      if ((e.key === "Delete" || e.key === "Backspace") && !isMeta) {
        e.preventDefault();
        state.removeSection(sel.pageId, sel.sectionId);
        return;
      }

      if (e.altKey && e.key === "ArrowUp") {
        e.preventDefault();
        state.moveSection(sel.pageId, sel.sectionId, "up");
        return;
      }
      if (e.altKey && e.key === "ArrowDown") {
        e.preventDefault();
        state.moveSection(sel.pageId, sel.sectionId, "down");
        return;
      }

      if (isMeta && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        state.duplicateSection(sel.pageId, sel.sectionId);
        return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

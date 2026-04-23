/**
 * LocalStorage persistence for the builder.
 *
 * Phase 8 is client-only: every SiteProject the user edits is serialised to
 * localStorage under `yf.project.<projectId>` and re-loaded on next visit.
 * A lightweight index at `yf.projects` tracks which projectIds we have,
 * useful for the future project-list UI (Phase 10.5) but already populated
 * here so the migration is trivial.
 *
 * Phase 10.5 replaces this with a short-lived server cache for the initial
 * handoff from the studio flow; the builder will still use localStorage as
 * the authoritative copy while editing.
 */

import type { SiteProject } from "@yappaflow/types";

const PROJECT_KEY = (id: string) => `yf.project.${id}`;
const INDEX_KEY = "yf.projects";

type PersistedEntry = {
  projectId: string;
  savedAt: number;
  project: SiteProject;
};

export function loadProjectFromStorage(projectId: string): SiteProject | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROJECT_KEY(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedEntry;
    return parsed.project ?? null;
  } catch {
    return null;
  }
}

export function saveProjectToStorage(
  projectId: string,
  project: SiteProject,
): number {
  if (typeof window === "undefined") return 0;
  const savedAt = Date.now();
  try {
    const entry: PersistedEntry = { projectId, savedAt, project };
    window.localStorage.setItem(PROJECT_KEY(projectId), JSON.stringify(entry));
    updateIndex(projectId, savedAt);
  } catch (err) {
    // Quota exceeded or private-mode. Surface in devtools but don't crash.
    console.warn("[yf] localStorage save failed:", err);
  }
  return savedAt;
}

export function clearProjectFromStorage(projectId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROJECT_KEY(projectId));
    removeFromIndex(projectId);
  } catch {
    /* best-effort */
  }
}

export function listProjectIds(): Array<{ projectId: string; savedAt: number }> {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Array<{ projectId: string; savedAt: number }>;
  } catch {
    return [];
  }
}

function updateIndex(projectId: string, savedAt: number): void {
  const current = listProjectIds();
  const without = current.filter((e) => e.projectId !== projectId);
  const next = [{ projectId, savedAt }, ...without].slice(0, 50);
  try {
    window.localStorage.setItem(INDEX_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function removeFromIndex(projectId: string): void {
  const current = listProjectIds().filter((e) => e.projectId !== projectId);
  try {
    window.localStorage.setItem(INDEX_KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
}

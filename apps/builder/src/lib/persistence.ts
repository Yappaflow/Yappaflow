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

import {
  SITE_PROJECT_SCHEMA_VERSION,
  inferPageKind,
  productHandleFromSlug,
  type Page,
  type SiteProject,
} from "@yappaflow/types";

const PROJECT_KEY = (id: string) => `yf.project.${id}`;
const INDEX_KEY = "yf.projects";

type PersistedEntry = {
  projectId: string;
  savedAt: number;
  project: SiteProject;
};

/**
 * Migrate a previously-persisted SiteProject up to the current schema
 * version. Cheap and idempotent — runs on every load, returns the same
 * reference if nothing needs changing. Designed so callers can stash the
 * result and never look at schemaVersion themselves.
 *
 * v1 → v2: stamps `kind` on every page (slug-based inference) and fills in
 * `productHandle` for `/products/<handle>` pages so the CMS export can route
 * them to product APIs without re-running the products panel.
 */
function migrateProject(project: SiteProject): SiteProject {
  // Cast: incoming localStorage data may legitimately have older schemaVersion.
  // We ignore z.literal at the type level here because we're the migrator.
  const incomingVersion = (project as { schemaVersion?: number }).schemaVersion ?? 1;
  if (incomingVersion >= SITE_PROJECT_SCHEMA_VERSION) {
    // Defensive: even at the current version, an older builder could have
    // written pages without `kind` (e.g. before this migration shipped).
    // Backfill missing kinds without changing version.
    const needsBackfill = project.pages.some((p) => p.kind === undefined);
    if (!needsBackfill) return project;
    return { ...project, pages: project.pages.map(stampKind) };
  }
  return {
    ...project,
    schemaVersion: SITE_PROJECT_SCHEMA_VERSION,
    pages: project.pages.map(stampKind),
  };
}

function stampKind(page: Page): Page {
  if (page.kind) return page;
  const kind = inferPageKind(page.slug);
  const productHandle =
    kind === "product" ? productHandleFromSlug(page.slug) ?? undefined : undefined;
  return {
    ...page,
    kind,
    ...(productHandle ? { productHandle } : {}),
  };
}

export function loadProjectFromStorage(projectId: string): SiteProject | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROJECT_KEY(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedEntry;
    if (!parsed.project) return null;
    return migrateProject(parsed.project);
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

/**
 * Pick the projectId to render on the public-facing showcase routes
 * (`/products`, `/products/[handle]`). Strategy:
 *   1. Honour an explicit ?p=<id> query string (preview link from the editor).
 *   2. Otherwise the most-recently-saved project, if any.
 *   3. Otherwise "sample" so the dev fixture still renders out of the box.
 *
 * Phase 10.5 will replace this with a deterministic project router; for
 * now this keeps the showcase routes useful without having to know the
 * project id ahead of time.
 */
export function resolveShowcaseProjectId(searchParam?: string | null): string {
  if (searchParam && searchParam.length > 0) return searchParam;
  const recent = listProjectIds();
  if (recent.length > 0 && recent[0]?.projectId) return recent[0].projectId;
  return "sample";
}

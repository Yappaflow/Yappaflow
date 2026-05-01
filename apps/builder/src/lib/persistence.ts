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
  type Product,
  type Section,
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
 *
 * v2 → v3: extracts product cards embedded in product-grid sections (legacy
 * `products[]` arrays) into the new top-level `productLibrary`, dedupes by
 * id+handle, and rewrites those sections to library mode + productIds. The
 * legacy `products[]` array stays as a fallback (mode:"manual" alongside),
 * but only until the next save — by then the library copy is authoritative.
 */
function migrateProject(project: SiteProject): SiteProject {
  // Cast: incoming localStorage data may legitimately have older schemaVersion.
  // We ignore z.literal at the type level here because we're the migrator.
  const incomingVersion = (project as { schemaVersion?: number }).schemaVersion ?? 1;
  // Step 1: kind/productHandle backfill (v1 → v2 doctrine, idempotent at v3).
  let next: SiteProject = project;
  if (incomingVersion < 2 || project.pages.some((p) => p.kind === undefined)) {
    next = { ...next, pages: next.pages.map(stampKind) };
  }
  // Step 2: productLibrary extraction (v2 → v3). Run when the field is
  // absent or empty AND there are inline products to harvest. Idempotent:
  // running on an already-migrated v3 project is a no-op when the library
  // is already populated.
  const existingLibrary = (next as { productLibrary?: Product[] }).productLibrary ?? [];
  if (incomingVersion < 3 || existingLibrary.length === 0) {
    const harvested = harvestProductLibrary(next.pages, existingLibrary);
    if (harvested.length > 0) {
      next = {
        ...next,
        pages: next.pages.map((p) => ({
          ...p,
          sections: p.sections.map((s) => rewriteGridToLibrary(s, harvested)),
        })),
        productLibrary: harvested,
      };
    } else if (existingLibrary.length === 0) {
      // No products anywhere — still need the field present for v3.
      next = { ...next, productLibrary: [] };
    }
  }
  // Always stamp the version last so partial migrations don't lie about
  // their state.
  if (incomingVersion < SITE_PROJECT_SCHEMA_VERSION) {
    next = { ...next, schemaVersion: SITE_PROJECT_SCHEMA_VERSION };
  }
  return next;
}

/**
 * Walk every product-grid section in the project and pull inline product
 * cards into a deduped `Product[]`. Existing library entries are kept
 * verbatim — they win on id collision, which preserves any agency edits
 * that didn't make it back into the grid section.
 *
 * The projection from ProductCard → Product fills the new fields with
 * sensible defaults: empty description, empty variantGroups/specs, single
 * image (the card's hero), tags []. The agency can flesh them out later
 * via the Products panel.
 */
function harvestProductLibrary(
  pages: readonly Page[],
  existing: readonly Product[],
): Product[] {
  const byId = new Map<string, Product>(existing.map((p) => [p.id, p]));
  for (const page of pages) {
    for (const section of page.sections) {
      if (section.type !== "product-grid") continue;
      const cards = (section.content as { products?: unknown[] }).products;
      if (!Array.isArray(cards)) continue;
      for (const raw of cards) {
        const card = raw as {
          id?: unknown;
          handle?: unknown;
          title?: unknown;
          price?: unknown;
          currency?: unknown;
          compareAtPrice?: unknown;
          image?: unknown;
        };
        const id = typeof card.id === "string" ? card.id : null;
        const handle = typeof card.handle === "string" ? card.handle : null;
        const title = typeof card.title === "string" ? card.title : null;
        const price = typeof card.price === "string" ? card.price : null;
        if (!id || !handle || !title || !price) continue;
        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          handle,
          title,
          price,
          currency: typeof card.currency === "string" ? card.currency : "USD",
          ...(typeof card.compareAtPrice === "string"
            ? { compareAtPrice: card.compareAtPrice }
            : {}),
          description: "",
          images:
            card.image && typeof card.image === "object"
              ? [card.image as Product["images"][number]]
              : [{ kind: "image", url: "", alt: title }],
          variantGroups: [],
          specs: [],
          tags: [],
        });
      }
    }
  }
  return Array.from(byId.values());
}

/**
 * Rewrite a product-grid section to library mode when every embedded card
 * resolves to a library product. If any card can't be matched (e.g. a
 * one-off custom card the agency hand-edited), leave the section in manual
 * mode untouched — better to keep a stale snapshot than silently lose data.
 */
function rewriteGridToLibrary(
  section: Section,
  library: readonly Product[],
): Section {
  if (section.type !== "product-grid") return section;
  const content = section.content as {
    mode?: unknown;
    productIds?: unknown;
    products?: unknown;
  };
  // Already library-bound — leave it alone.
  if (content.mode === "library") return section;
  const cards = Array.isArray(content.products) ? content.products : [];
  if (cards.length === 0) return section;
  const ids: string[] = [];
  for (const raw of cards) {
    const id = (raw as { id?: unknown }).id;
    if (typeof id !== "string") return section; // bail to manual
    if (!library.some((p) => p.id === id)) return section; // bail to manual
    ids.push(id);
  }
  return {
    ...section,
    content: {
      ...(section.content as Record<string, unknown>),
      mode: "library",
      productIds: ids,
      // Keep the cards as a fallback for adapters that haven't migrated yet.
      // The renderer prefers library hydration when it has both.
    },
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

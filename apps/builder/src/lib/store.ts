/**
 * Zustand store for the builder.
 *
 * Single source of truth for: the SiteProject being edited, the current
 * selection (page + section), the viewport preset, preview mode, and dirty
 * state. Every mutation goes through an action here so we can keep autosave
 * + undo history (Phase 8.5) centralised.
 *
 * Phase 8a: actions cover the "shape the page" moves — update section
 * content/variant/style/animation, move section up/down, insert/remove.
 * Page-level moves (create page, rename, delete) aren't wired yet because
 * the Phase 8 MVP is single-page; we'll layer them in 8.5.
 */

"use client";

import { create } from "zustand";
import type {
  AnimationPreset,
  Section,
  SectionType,
  SiteProject,
  StyleDelta,
} from "@yappaflow/types";
import { SECTION_DATA } from "@yappaflow/sections/data";
import {
  loadProjectFromStorage,
  saveProjectToStorage,
} from "./persistence";
import { nextPageId, nextSectionId } from "./id";

export type Viewport = "mobile" | "tablet" | "desktop";

export type Selection = { pageId: string; sectionId: string } | null;

interface ProjectState {
  project: SiteProject | null;
  projectId: string | null;

  /** Currently-displayed page in the canvas/left rail. Null when project is empty. */
  activePageId: string | null;

  selection: Selection;
  viewport: Viewport;
  previewMode: boolean;

  dirty: boolean;
  lastSavedAt: number | null;

  /** Monotonic counter — incrementing forces canvas to replay animations. */
  animationEpoch: number;

  // Lifecycle
  hydrate(projectId: string, fallback: SiteProject | null): void;
  replaceProject(project: SiteProject): void;

  // Selection
  selectSection(pageId: string | null, sectionId: string | null): void;

  // Viewport / preview
  setViewport(v: Viewport): void;
  setPreviewMode(on: boolean): void;

  /** Trigger an animation replay in the canvas. */
  replayAnimations(): void;

  // Page-level lifecycle
  setActivePageId(pageId: string): void;
  addPage(params: {
    title: string;
    slug: string;
    /**
     * Optional seed sections — a template's buildSections() output. Each
     * spec becomes a real Section with the library's defaults plus any
     * contentOverrides shallow-merged on top.
     */
    sections?: Array<{
      type: SectionType;
      variant?: string;
      contentOverrides?: Record<string, unknown>;
    }>;
  }): string;
  removePage(pageId: string): void;
  renamePage(pageId: string, title: string): void;
  setPageSlug(pageId: string, slug: string): void;
  setPageSeo(
    pageId: string,
    seo: {
      description?: string;
      ogImage?:
        | {
            kind: "image" | "video" | "svg";
            url: string;
            alt?: string;
            width?: number;
            height?: number;
          }
        | undefined;
    },
  ): void;

  // Section-level mutations
  updateSectionContent(
    pageId: string,
    sectionId: string,
    patch: Record<string, unknown>,
  ): void;
  updateSectionVariant(pageId: string, sectionId: string, variant: string): void;
  updateSectionStyle(
    pageId: string,
    sectionId: string,
    patch: StyleDelta,
  ): void;
  updateSectionAnimation(
    pageId: string,
    sectionId: string,
    preset: AnimationPreset | null,
  ): void;
  moveSection(pageId: string, sectionId: string, direction: "up" | "down"): void;
  reorderSections(pageId: string, orderedIds: string[]): void;
  insertSection(pageId: string, type: SectionType, atIndex: number): string;
  removeSection(pageId: string, sectionId: string): void;
  duplicateSection(pageId: string, sectionId: string): string | null;

  // Globals
  updateGlobalContent(
    slot: "header" | "footer" | "announcementBar",
    patch: Record<string, unknown>,
  ): void;

  /** Append an already-shaped product card to a product-grid section. */
  appendProductToGrid(
    pageId: string,
    sectionId: string,
    product: Record<string, unknown>,
  ): void;

  /**
   * Broadcast a library product change into every product-grid section
   * in the current project — any product whose `id` matches gets its
   * embedded copy replaced with `product`. SiteProject stays self-
   * contained; canvas reflects library edits instantly.
   */
  syncLibraryProduct(
    productId: string,
    product: Record<string, unknown>,
  ): void;

  /**
   * Shopify-style sync — every library product owns one page at
   * `/products/<handle>`. This action creates the page if absent, or
   * updates its product-detail section if present. Optionally migrates
   * the page's slug when the handle changed.
   */
  upsertProductPage(params: {
    handle: string;
    previousHandle?: string;
    title: string;
    pageSections: Array<{
      type: import("@yappaflow/types").SectionType;
      variant?: string;
      contentOverrides?: Record<string, unknown>;
    }>;
    productDetailContent: Record<string, unknown>;
  }): void;

  /** Remove the auto-generated product page for a given handle, if any. */
  removeProductPageByHandle(handle: string): void;

  /**
   * Create or refresh the `/products` catalog page. Pass the current full
   * list of product cards (already shaped for product-grid content) so the
   * grid always mirrors the library. Called by the products panel after every
   * add / remove operation.
   */
  upsertProductsIndexPage(productCards: Array<Record<string, unknown>>): void;

  /**
   * Mirror Shopify / IKAS storefront defaults: the home page surfaces a
   * featured-products strip that stays in sync with the library. This action
   * looks for an existing product-grid on the home page (preferring the
   * stable HOME_FEATURED_GRID_ID, falling back to the first product-grid
   * found) and replaces its `products` array with the supplied cards. If
   * the home page has no product-grid yet, one is inserted just below the
   * hero so new sites get the section out of the box. Pass an empty array
   * to leave the section in place but emptied (lets the agency curate
   * manually without losing the slot).
   */
  upsertHomeFeaturedGrid(productCards: Array<Record<string, unknown>>): void;

  // Manual save (autosave also fires on every mutation — see subscribe below).
  save(): void;
}

/**
 * Internal mutator — every state-changing action clones the SiteProject,
 * applies the change, sets dirty, and lets the subscription autosave it.
 * We deliberately don't use Immer here — the state graph is shallow enough
 * that typed spreads stay readable, and keeping zustand un-middlewared keeps
 * the bundle light.
 */
function mutateProject(
  state: ProjectState,
  fn: (project: SiteProject) => SiteProject,
): Partial<ProjectState> {
  if (!state.project) return {};
  return {
    project: fn(state.project),
    dirty: true,
  };
}

function mapSectionInPage(
  project: SiteProject,
  pageId: string,
  sectionId: string,
  map: (section: Section) => Section,
): SiteProject {
  return {
    ...project,
    pages: project.pages.map((page) => {
      if (page.id !== pageId) return page;
      return {
        ...page,
        sections: page.sections.map((section) =>
          section.id === sectionId ? map(section) : section,
        ),
      };
    }),
  };
}

function mapPage(
  project: SiteProject,
  pageId: string,
  map: (page: SiteProject["pages"][number]) => SiteProject["pages"][number],
): SiteProject {
  return {
    ...project,
    pages: project.pages.map((page) => (page.id === pageId ? map(page) : page)),
  };
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  project: null,
  projectId: null,
  activePageId: null,
  selection: null,
  viewport: "desktop",
  previewMode: false,
  dirty: false,
  lastSavedAt: null,
  animationEpoch: 0,

  hydrate(projectId, fallback) {
    const fromStorage = loadProjectFromStorage(projectId);
    const project = fromStorage ?? fallback;
    if (!project) {
      set({ projectId, project: null, selection: null, activePageId: null });
      return;
    }
    const firstPage = project.pages[0];
    set({
      projectId,
      project,
      activePageId: firstPage?.id ?? null,
      selection: firstPage?.sections[0]
        ? { pageId: firstPage.id, sectionId: firstPage.sections[0].id }
        : null,
      dirty: false,
      lastSavedAt: fromStorage ? Date.now() : null,
    });
  },

  replaceProject(project) {
    const firstPage = project.pages[0];
    set({
      project,
      activePageId: firstPage?.id ?? null,
      selection: firstPage?.sections[0]
        ? { pageId: firstPage.id, sectionId: firstPage.sections[0].id }
        : null,
      dirty: true,
    });
  },

  setActivePageId(pageId) {
    const state = get();
    if (!state.project) return;
    if (!state.project.pages.some((p) => p.id === pageId)) return;
    // Clear selection when switching pages so the right rail doesn't keep
    // showing a section from the previous page.
    set({ activePageId: pageId, selection: null });
  },

  addPage({ title, slug, sections: sectionSpecs }) {
    const id = nextPageId();
    // Materialise the template's section specs into real Section instances.
    // Default variant + default content come from the sections library, and
    // contentOverrides (per-template tweaks) shallow-merge on top — so the
    // About template's hero lands with "About us" instead of the generic
    // "Design that earns its keep" default.
    const seededSections: Section[] = (sectionSpecs ?? []).map((spec) => {
      const data = SECTION_DATA[spec.type];
      return {
        id: nextSectionId(),
        type: spec.type,
        variant: spec.variant ?? data.defaultVariant,
        content: {
          ...(data.defaultContent as Record<string, unknown>),
          ...(spec.contentOverrides ?? {}),
        },
        style: {},
      };
    });
    set((state) => {
      if (!state.project) return {};
      const newPage = {
        id,
        slug: slug || "/",
        title: title || "Untitled",
        seo: { description: "" },
        kind: "content" as const,
        sections: seededSections,
      };
      // Auto-link into the header's nav so new pages immediately surface in
      // the site's navigation. Existing entries are preserved; the user can
      // reorder / remove in the right rail as usual.
      const header = state.project.globals.header;
      const currentNav = (
        (header?.content as { nav?: Array<{ label: string; href: string }> })
          ?.nav ?? []
      ) as Array<{ label: string; href: string }>;
      const alreadyLinked = currentNav.some(
        (entry) => entry.href === (slug || "/"),
      );
      const nextHeader =
        header && !alreadyLinked
          ? {
              ...header,
              content: {
                ...header.content,
                nav: [...currentNav, { label: title || "Untitled", href: slug || "/" }],
              },
            }
          : header;

      return {
        project: {
          ...state.project,
          pages: [...state.project.pages, newPage],
          globals: nextHeader
            ? { ...state.project.globals, header: nextHeader }
            : state.project.globals,
        },
        activePageId: id,
        selection: null,
        dirty: true,
      };
    });
    return id;
  },

  removePage(pageId) {
    set((state) => {
      if (!state.project) return {};
      if (state.project.pages.length <= 1) return {}; // Never delete last page.
      const nextPages = state.project.pages.filter((p) => p.id !== pageId);
      const nextActive =
        state.activePageId === pageId
          ? nextPages[0]?.id ?? null
          : state.activePageId;
      const nextSelection =
        state.selection && state.selection.pageId === pageId
          ? null
          : state.selection;
      return {
        project: { ...state.project, pages: nextPages },
        activePageId: nextActive,
        selection: nextSelection,
        dirty: true,
      };
    });
  },

  renamePage(pageId, title) {
    set((state) =>
      mutateProject(state, (project) =>
        mapPage(project, pageId, (p) => ({ ...p, title })),
      ),
    );
  },

  setPageSlug(pageId, slug) {
    set((state) =>
      mutateProject(state, (project) =>
        mapPage(project, pageId, (p) => ({ ...p, slug })),
      ),
    );
  },

  setPageSeo(pageId, seo) {
    set((state) =>
      mutateProject(state, (project) =>
        mapPage(project, pageId, (p) => ({
          ...p,
          seo: { ...p.seo, ...seo },
        })),
      ),
    );
  },

  selectSection(pageId, sectionId) {
    if (!pageId || !sectionId) {
      set({ selection: null });
      return;
    }
    set({ selection: { pageId, sectionId } });
  },

  setViewport(v) {
    set({ viewport: v });
  },

  setPreviewMode(on) {
    set({ previewMode: on });
  },

  replayAnimations() {
    set((state) => ({ animationEpoch: state.animationEpoch + 1 }));
  },

  updateSectionContent(pageId, sectionId, patch) {
    set((state) =>
      mutateProject(state, (project) =>
        mapSectionInPage(project, pageId, sectionId, (section) => ({
          ...section,
          content: { ...section.content, ...patch },
        })),
      ),
    );
  },

  updateSectionVariant(pageId, sectionId, variant) {
    set((state) =>
      mutateProject(state, (project) =>
        mapSectionInPage(project, pageId, sectionId, (section) => ({
          ...section,
          variant,
        })),
      ),
    );
  },

  updateSectionStyle(pageId, sectionId, patch) {
    set((state) =>
      mutateProject(state, (project) =>
        mapSectionInPage(project, pageId, sectionId, (section) => ({
          ...section,
          style: { ...section.style, ...patch },
        })),
      ),
    );
  },

  updateSectionAnimation(pageId, sectionId, preset) {
    set((state) =>
      mutateProject(state, (project) =>
        mapSectionInPage(project, pageId, sectionId, (section) => {
          if (preset === null || preset === "none") {
            // Drop the key entirely so serialised JSON stays tidy.
            const { animation: _drop, ...rest } = section;
            return rest as Section;
          }
          return { ...section, animation: preset };
        }),
      ),
    );
  },

  moveSection(pageId, sectionId, direction) {
    set((state) =>
      mutateProject(state, (project) =>
        mapPage(project, pageId, (page) => {
          const index = page.sections.findIndex((s) => s.id === sectionId);
          if (index < 0) return page;
          const target = direction === "up" ? index - 1 : index + 1;
          if (target < 0 || target >= page.sections.length) return page;
          const reordered = [...page.sections];
          const [moved] = reordered.splice(index, 1);
          if (!moved) return page;
          reordered.splice(target, 0, moved);
          return { ...page, sections: reordered };
        }),
      ),
    );
  },

  reorderSections(pageId, orderedIds) {
    set((state) =>
      mutateProject(state, (project) =>
        mapPage(project, pageId, (page) => {
          const byId = new Map(page.sections.map((s) => [s.id, s]));
          const next: Section[] = [];
          // Apply the requested order; any ids missing from the current page
          // are ignored (stale input). Any sections not mentioned retain
          // their original position at the end — defensive, so a race never
          // silently drops sections.
          const seen = new Set<string>();
          for (const id of orderedIds) {
            const s = byId.get(id);
            if (s) {
              next.push(s);
              seen.add(id);
            }
          }
          for (const s of page.sections) {
            if (!seen.has(s.id)) next.push(s);
          }
          return { ...page, sections: next };
        }),
      ),
    );
  },

  insertSection(pageId, type, atIndex) {
    const data = SECTION_DATA[type];
    const newSection: Section = {
      id: nextSectionId(),
      type,
      variant: data.defaultVariant,
      content: { ...(data.defaultContent as Record<string, unknown>) },
      style: {},
    };
    set((state) =>
      mutateProject(state, (project) =>
        mapPage(project, pageId, (page) => {
          const clamped = Math.max(0, Math.min(atIndex, page.sections.length));
          const next = [...page.sections];
          next.splice(clamped, 0, newSection);
          return { ...page, sections: next };
        }),
      ),
    );
    // Select the just-inserted section so the right rail opens on it.
    set({ selection: { pageId, sectionId: newSection.id } });
    return newSection.id;
  },

  duplicateSection(pageId, sectionId) {
    const state = get();
    if (!state.project) return null;
    const page = state.project.pages.find((p) => p.id === pageId);
    const source = page?.sections.find((s) => s.id === sectionId);
    if (!page || !source) return null;
    const copy: Section = {
      ...source,
      id: nextSectionId(),
      // Structured-ish clone for content: `{...source.content}` is shallow,
      // but nested arrays/objects will share references with the original.
      // For now this is fine — the builder only edits through immutable-set
      // actions, so the shared references never get mutated in place.
      content: { ...(source.content as Record<string, unknown>) },
      style: { ...source.style },
    };
    const index = page.sections.findIndex((s) => s.id === sectionId);
    set((stateInner) =>
      mutateProject(stateInner, (project) =>
        mapPage(project, pageId, (p) => {
          const next = [...p.sections];
          next.splice(index + 1, 0, copy);
          return { ...p, sections: next };
        }),
      ),
    );
    set({ selection: { pageId, sectionId: copy.id } });
    return copy.id;
  },

  removeSection(pageId, sectionId) {
    let nextSelection: Selection = null;
    set((state) => {
      if (!state.project) return {};
      // Compute the new selection first, based on the pre-mutation ordering.
      const page = state.project.pages.find((p) => p.id === pageId);
      if (page) {
        const index = page.sections.findIndex((s) => s.id === sectionId);
        if (index >= 0) {
          const neighbour =
            page.sections[index + 1] ?? page.sections[index - 1];
          if (neighbour) {
            nextSelection = { pageId, sectionId: neighbour.id };
          }
        }
      }
      return mutateProject(state, (project) =>
        mapPage(project, pageId, (p) => ({
          ...p,
          sections: p.sections.filter((s) => s.id !== sectionId),
        })),
      );
    });
    set({ selection: nextSelection });
  },

  updateGlobalContent(slot, patch) {
    set((state) => {
      if (!state.project) return {};
      const current = state.project.globals[slot];
      if (!current) return {};
      return {
        project: {
          ...state.project,
          globals: {
            ...state.project.globals,
            [slot]: {
              ...current,
              content: { ...current.content, ...patch },
            },
          },
        },
        dirty: true,
      };
    });
  },

  upsertProductPage({ handle, previousHandle, title, pageSections, productDetailContent }) {
    set((state) => {
      if (!state.project) return {};
      const newSlug = `/products/${handle}`;
      const previousSlug = previousHandle
        ? `/products/${previousHandle}`
        : newSlug;

      // Find the page — prefer previous-slug match (handle just changed),
      // fall back to new-slug match (page already exists at the new slug).
      const existingIndex = state.project.pages.findIndex(
        (p) => p.slug === previousSlug || p.slug === newSlug,
      );

      if (existingIndex >= 0) {
        // Update in place: move the product-detail section's content to
        // reflect the latest library data, and migrate slug/title if the
        // handle changed. Preserve any user edits to OTHER sections on
        // the page (related-products grid, testimonials they added, etc.).
        // Also stamp kind + handle so legacy pages get upgraded on first
        // edit even if the persistence migration didn't catch them.
        const nextPages = state.project.pages.map((page, i) => {
          if (i !== existingIndex) return page;
          const nextSections = page.sections.map((section) => {
            if (section.type !== "product-detail") return section;
            return {
              ...section,
              content: {
                ...(section.content as Record<string, unknown>),
                ...productDetailContent,
              },
            };
          });
          return {
            ...page,
            slug: newSlug,
            title,
            kind: "product" as const,
            productHandle: handle,
            sections: nextSections,
          };
        });
        return { project: { ...state.project, pages: nextPages }, dirty: true };
      }

      // No existing page — create a fresh one with product-detail + related.
      const newPageId = nextPageId();
      const seededSections: Section[] = pageSections.map((spec) => {
        const data = SECTION_DATA[spec.type];
        return {
          id: nextSectionId(),
          type: spec.type,
          variant: spec.variant ?? data.defaultVariant,
          content: {
            ...(data.defaultContent as Record<string, unknown>),
            ...(spec.contentOverrides ?? {}),
          },
          style: {},
        };
      });
      return {
        project: {
          ...state.project,
          pages: [
            ...state.project.pages,
            {
              id: newPageId,
              slug: newSlug,
              title,
              seo: { description: `${title} — shop on our store.` },
              kind: "product" as const,
              productHandle: handle,
              sections: seededSections,
            },
          ],
        },
        dirty: true,
      };
    });
  },

  removeProductPageByHandle(handle) {
    set((state) => {
      if (!state.project) return {};
      const slug = `/products/${handle}`;
      const nextPages = state.project.pages.filter((p) => p.slug !== slug);
      if (nextPages.length === state.project.pages.length) return {};
      if (nextPages.length === 0) return {}; // Never leave project empty.
      const nextActive = state.project.pages.find((p) => p.id === state.activePageId)?.slug === slug
        ? nextPages[0]?.id ?? null
        : state.activePageId;
      return {
        project: { ...state.project, pages: nextPages },
        activePageId: nextActive,
        selection:
          state.selection &&
          state.project.pages.find((p) => p.id === state.selection!.pageId)
            ?.slug === slug
            ? null
            : state.selection,
        dirty: true,
      };
    });
  },

  upsertProductsIndexPage(productCards) {
    set((state) => {
      if (!state.project) return {};
      const slug = "/products";
      const existingIndex = state.project.pages.findIndex((p) => p.slug === slug);

      if (existingIndex >= 0) {
        // Refresh only the product-grid section's products list. Also
        // backfill kind on the catalog page if it predates the v2 migration.
        const nextPages = state.project.pages.map((page, i) => {
          if (i !== existingIndex) return page;
          const nextSections = page.sections.map((section) => {
            if (section.type !== "product-grid") return section;
            return {
              ...section,
              content: {
                ...(section.content as Record<string, unknown>),
                products: productCards,
              },
            };
          });
          return {
            ...page,
            kind: "product-index" as const,
            sections: nextSections,
          };
        });
        return { project: { ...state.project, pages: nextPages }, dirty: true };
      }

      // No catalog page yet — create one with a hero + full product grid.
      const heroData = SECTION_DATA["hero"];
      const gridData = SECTION_DATA["product-grid"];
      const newPageId = nextPageId();
      const heroSection: Section = {
        id: nextSectionId(),
        type: "hero",
        variant: "centered",
        content: {
          ...(heroData.defaultContent as Record<string, unknown>),
          eyebrow: "Shop",
          heading: "All products.",
          subhead: "Browse the full collection.",
        },
        style: {},
      };
      const gridSection: Section = {
        id: nextSectionId(),
        type: "product-grid",
        variant: "card",
        content: {
          ...(gridData.defaultContent as Record<string, unknown>),
          eyebrow: "",
          heading: "",
          columns: 4,
          products: productCards,
        },
        style: {},
      };
      return {
        project: {
          ...state.project,
          pages: [
            ...state.project.pages,
            {
              id: newPageId,
              slug,
              title: "Products",
              seo: { description: "Browse our full product catalog." },
              kind: "product-index" as const,
              sections: [heroSection, gridSection],
            },
          ],
        },
        dirty: true,
      };
    });
  },

  syncLibraryProduct(productId, product) {
    set((state) => {
      if (!state.project) return {};
      let changed = false;
      const nextPages = state.project.pages.map((page) => {
        let pageChanged = false;
        const nextSections = page.sections.map((section) => {
          if (section.type !== "product-grid") return section;
          const current = ((section.content as Record<string, unknown>)
            .products ?? []) as Array<Record<string, unknown>>;
          // Early bail: no matching product in this section.
          if (!current.some((p) => p.id === productId)) return section;
          const nextProducts = current.map((p) =>
            p.id === productId ? { ...product } : p,
          );
          pageChanged = true;
          return {
            ...section,
            content: { ...section.content, products: nextProducts },
          };
        });
        if (pageChanged) {
          changed = true;
          return { ...page, sections: nextSections };
        }
        return page;
      });
      if (!changed) return {};
      return {
        project: { ...state.project, pages: nextPages },
        dirty: true,
      };
    });
  },

  upsertHomeFeaturedGrid(productCards) {
    set((state) => {
      if (!state.project) return {};
      const HOME_FEATURED_ID = "sec_home_featured";
      // Home is the page mounted at "/". Adapters and templates rely on this
      // — if a user changed the home slug, we don't try to be clever; bail
      // out and let them seed the section manually.
      const homeIndex = state.project.pages.findIndex((p) => p.slug === "/");
      if (homeIndex < 0) return {};
      const home = state.project.pages[homeIndex]!;

      // Prefer the stable id (set in fixtures + on first auto-insert) so
      // re-syncs always hit the same section even if the user added other
      // product-grids elsewhere on the home page.
      const existingByStableId = home.sections.find(
        (s) => s.id === HOME_FEATURED_ID && s.type === "product-grid",
      );
      const existing =
        existingByStableId ??
        home.sections.find((s) => s.type === "product-grid");

      if (existing) {
        const nextSections = home.sections.map((section) =>
          section.id === existing.id
            ? {
                ...section,
                content: {
                  ...(section.content as Record<string, unknown>),
                  products: productCards,
                },
              }
            : section,
        );
        const nextPages = state.project.pages.map((p, i) =>
          i === homeIndex ? { ...p, sections: nextSections } : p,
        );
        return { project: { ...state.project, pages: nextPages }, dirty: true };
      }

      // No grid on home yet — drop one in just below the hero (or at the
      // top if there's no hero). This mirrors how Shopify and IKAS seed
      // the storefront default with a featured-products section.
      const gridData = SECTION_DATA["product-grid"];
      const heroIndex = home.sections.findIndex((s) => s.type === "hero");
      const insertAt = heroIndex >= 0 ? heroIndex + 1 : 0;
      const newSection: Section = {
        id: HOME_FEATURED_ID,
        type: "product-grid",
        variant: "card",
        content: {
          ...(gridData.defaultContent as Record<string, unknown>),
          eyebrow: "Shop",
          heading: "Featured products",
          subhead: "Hand-picked from the catalog.",
          columns: 3,
          products: productCards,
          ctaAll: { label: "View all products", href: "/products" },
        },
        style: {},
        animation: "stagger-children",
      };
      const nextSections = [...home.sections];
      nextSections.splice(insertAt, 0, newSection);
      const nextPages = state.project.pages.map((p, i) =>
        i === homeIndex ? { ...p, sections: nextSections } : p,
      );
      return { project: { ...state.project, pages: nextPages }, dirty: true };
    });
  },

  appendProductToGrid(pageId, sectionId, product) {
    set((state) =>
      mutateProject(state, (project) =>
        mapSectionInPage(project, pageId, sectionId, (section) => {
          if (section.type !== "product-grid") return section;
          const current = ((section.content as Record<string, unknown>)
            .products ?? []) as Array<Record<string, unknown>>;
          // De-dupe by id — dropping the same library product twice
          // shouldn't create duplicate entries in the grid.
          if (current.some((p) => p.id === product.id)) return section;
          return {
            ...section,
            content: { ...section.content, products: [...current, product] },
          };
        }),
      ),
    );
  },

  save() {
    const { projectId, project } = get();
    if (!projectId || !project) return;
    const savedAt = saveProjectToStorage(projectId, project);
    set({ dirty: false, lastSavedAt: savedAt });
  },
}));

/**
 * Autosave wiring. A single subscription watches `project` identity and
 * debounces the save call to 500ms after the most recent mutation. We skip
 * the save when there's nothing to write (no projectId or no project).
 *
 * This is module-level instead of a React hook so the behaviour doesn't
 * depend on which components mount — the store is always persisting.
 */
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
const AUTOSAVE_DELAY_MS = 500;

export function startAutosave(): () => void {
  // Avoid double-subscribing if the hook mounts twice (React Strict Mode dev).
  return useProjectStore.subscribe((state, prevState) => {
    if (state.project === prevState.project) return;
    if (!state.projectId || !state.project || !state.dirty) return;
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      useProjectStore.getState().save();
    }, AUTOSAVE_DELAY_MS);
  });
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { SectionType } from "@yappaflow/types";
import { useProjectStore, startAutosave } from "@/lib/store";
import { useProductsStore } from "@/lib/products-store";
import { libraryToProductCard, serverProductToLibrary } from "@/lib/product-transform";
import { fetchProjectProducts } from "@/lib/server-api";
import { buildProductDetailContent, buildProductPageSections } from "@/lib/product-page";
import { buildSampleSiteProject } from "@/fixtures/sample-project";
import { LoadFromJsonModal } from "@/components/load-from-json";
import { ThemeToggle } from "@/components/theme-toggle";
import { TopBar } from "@/components/top-bar";
import { LeftRail } from "@/components/left-rail";
import { Canvas } from "@/components/canvas";
import { RightRail } from "@/components/right-rail";
import { useEditorShortcuts } from "@/lib/use-editor-shortcuts";
import type { ActiveDragData, OverDropData } from "@/lib/dnd";

/**
 * Editor shell.
 *
 * Hosts the single DndContext the whole app drags inside. Two kinds of
 * drag operations flow through:
 *
 *   1. Sortable section reorder (from the Layers panel). `active.data` has
 *      `{ kind: "sortable-section" }`; the over target is another sortable
 *      item. Handled by computing the new order with arrayMove and calling
 *      the store's reorderSections.
 *
 *   2. Palette insert (dragging a card from the Insert panel onto a canvas
 *      drop zone). `active.data` has `{ kind: "palette-card", type }`; the
 *      over target has `{ kind: "canvas-drop-zone", atIndex }`. Handled by
 *      calling insertSection at the zone's index.
 *
 * The DragOverlay renders a floating preview card while a palette drag is
 * in flight so the user sees what they're placing.
 */
export function EditorShell({ projectId }: { projectId: string }) {
  const hydrate = useProjectStore((s) => s.hydrate);
  const project = useProjectStore((s) => s.project);
  const activePageId = useProjectStore((s) => s.activePageId);
  const previewMode = useProjectStore((s) => s.previewMode);
  const replaceProject = useProjectStore((s) => s.replaceProject);
  const reorderSections = useProjectStore((s) => s.reorderSections);
  const insertSection = useProjectStore((s) => s.insertSection);
  const appendProductToGrid = useProjectStore((s) => s.appendProductToGrid);
  const upsertProductPage = useProjectStore((s) => s.upsertProductPage);
  const upsertProductsIndexPage = useProjectStore((s) => s.upsertProductsIndexPage);

  const [loadOpen, setLoadOpen] = useState(false);
  const [activeDrag, setActiveDrag] = useState<ActiveDragData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    const fallback = projectId === "sample" ? buildSampleSiteProject() : null;
    hydrate(projectId, fallback);
  }, [projectId, hydrate]);

  useEffect(() => {
    return startAutosave();
  }, []);

  // Sync products from the server once per project load and auto-create pages.
  const syncedProjectRef = useRef<string | null>(null);
  useEffect(() => {
    if (!project || projectId === "sample") return;
    if (syncedProjectRef.current === projectId) return;
    syncedProjectRef.current = projectId;

    void (async () => {
      const serverProds = await fetchProjectProducts(projectId);
      if (serverProds.length === 0) return;

      useProductsStore.getState().hydrate();
      const newLibraryProds = useProductsStore
        .getState()
        .syncServerProducts(serverProds.map(serverProductToLibrary));

      for (const prod of newLibraryProds) {
        upsertProductPage({
          handle: prod.handle,
          title: prod.title,
          pageSections: buildProductPageSections(prod),
          productDetailContent: buildProductDetailContent(prod),
        });
      }

      if (newLibraryProds.length > 0) {
        const allCards = useProductsStore
          .getState()
          .products.map(libraryToProductCard);
        upsertProductsIndexPage(allCards);
      }
    })();
  }, [project, projectId, upsertProductPage, upsertProductsIndexPage]);

  useEditorShortcuts();

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as ActiveDragData | undefined;
    if (data) setActiveDrag(data);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    if (!project) return;
    // Always operate on the page the user is currently viewing. Before the
    // multi-page landed, this hardcoded `pages[0]` — which meant dragging
    // a section while on About silently targeted Home. Fallback to the
    // first page only if the active id is somehow stale.
    const page =
      project.pages.find((p) => p.id === activePageId) ?? project.pages[0];
    if (!page) return;

    const activeData = event.active.data.current as ActiveDragData | undefined;
    const overData = event.over?.data.current as OverDropData | undefined;
    if (!activeData || !overData) return;

    // Palette → canvas drop zone.
    if (activeData.kind === "palette-card" && overData.kind === "canvas-drop-zone") {
      insertSection(page.id, activeData.type, overData.atIndex);
      return;
    }

    // Library product → product-grid section.
    if (
      activeData.kind === "library-product" &&
      overData.kind === "product-grid-drop"
    ) {
      const product = useProductsStore
        .getState()
        .products.find((p) => p.id === activeData.productId);
      if (!product) return;
      appendProductToGrid(
        overData.pageId,
        overData.sectionId,
        libraryToProductCard(product),
      );
      return;
    }

    // Sortable reorder inside the Layers panel.
    if (
      activeData.kind === "sortable-section" &&
      overData.kind === "sortable-section" &&
      activeData.sectionId !== overData.sectionId
    ) {
      const oldIndex = page.sections.findIndex(
        (s) => s.id === activeData.sectionId,
      );
      const newIndex = page.sections.findIndex(
        (s) => s.id === overData.sectionId,
      );
      if (oldIndex < 0 || newIndex < 0) return;
      const reordered = arrayMove(page.sections, oldIndex, newIndex);
      reorderSections(
        page.id,
        reordered.map((s) => s.id),
      );
    }
  }

  if (!project) {
    return <ProjectNotFound projectId={projectId} onLoad={replaceProject} />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="flex h-dvh flex-col overflow-hidden">
        <TopBar
          onLoadJson={() => setLoadOpen(true)}
          projectId={projectId}
        />
        <div className="flex min-h-0 flex-1">
          {previewMode ? null : (
            <div className="flex w-[260px] shrink-0 flex-col overflow-hidden">
              <LeftRail />
            </div>
          )}
          <main
            className={`flex min-w-0 flex-1 flex-col overflow-auto ${
              previewMode ? "bg-white" : "bg-neutral-100/60 dark:bg-neutral-950"
            }`}
          >
            <Canvas />
          </main>
          {previewMode ? null : (
            <div className="flex w-[320px] shrink-0 flex-col overflow-hidden">
              <RightRail />
            </div>
          )}
        </div>
        {loadOpen ? (
          <LoadFromJsonModal
            onClose={() => setLoadOpen(false)}
            onLoad={(p) => {
              replaceProject(p);
              setLoadOpen(false);
            }}
          />
        ) : null}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag?.kind === "palette-card" ? (
          <PaletteDragPreview type={activeDrag.type} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function PaletteDragPreview({ type }: { type: SectionType }) {
  return (
    <div className="rounded border border-blue-500 bg-white px-3 py-2 text-sm font-medium text-neutral-900 shadow-lg">
      <span className="text-[10px] uppercase tracking-wider text-neutral-500">
        Adding
      </span>
      <div className="mt-0.5">{type}</div>
    </div>
  );
}

function ProjectNotFound({
  projectId,
  onLoad,
}: {
  projectId: string;
  onLoad: (project: ReturnType<typeof buildSampleSiteProject>) => void;
}) {
  const [loadOpen, setLoadOpen] = useState(false);
  return (
    <main className="min-h-dvh px-6 py-10 md:px-10">
      <header className="mb-10 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.22em] opacity-60">
          Yappaflow · Builder
        </span>
        <ThemeToggle />
      </header>
      <section className="max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight">
          Project <code className="font-mono text-base opacity-70">{projectId}</code>{" "}
          not found.
        </h1>
        <p className="mt-4 opacity-70">
          Nothing saved under this id in localStorage yet. Load a SiteProject
          from JSON to start editing it, or open the bundled sample.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setLoadOpen(true)}
            className="rounded-full border border-current/20 px-4 py-2 text-sm hover:border-current/40"
          >
            Paste SiteProject JSON
          </button>
          <Link
            href="/p/sample"
            className="rounded-full bg-ink px-4 py-2 text-sm text-paper dark:bg-paper dark:text-ink"
          >
            Open sample project
          </Link>
        </div>
      </section>
      {loadOpen ? (
        <LoadFromJsonModal
          onClose={() => setLoadOpen(false)}
          onLoad={(p) => {
            onLoad(p);
            setLoadOpen(false);
          }}
        />
      ) : null}
    </main>
  );
}

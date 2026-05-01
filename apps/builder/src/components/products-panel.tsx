"use client";

import { useEffect, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ShoppingBag } from "lucide-react";
import {
  useProductsStore,
  type LibraryProduct,
} from "@/lib/products-store";
import { libraryProductDraggableId, type LibraryProductData } from "@/lib/dnd";
import { useProjectStore } from "@/lib/store";
import { libraryToProduct, libraryToProductCard } from "@/lib/product-transform";
import {
  buildProductDetailContent,
  buildProductPageSections,
  slugifyHandle,
} from "@/lib/product-page";

/**
 * Products library panel — the third tab in the left rail alongside Layers
 * and Insert. Shows the agency's localStorage-backed product catalog as
 * draggable cards. Drop any card onto a product-grid section in the canvas
 * to append it to that grid's products array.
 *
 * Phase 10.5 replaces the localStorage fetch with a server call against
 * the Yappaflow dashboard's real catalog — same UI, same drag targets.
 */
export function ProductsPanel() {
  const products = useProductsStore((s) => s.products);
  const hydrated = useProductsStore((s) => s.hydrated);
  const hydrate = useProductsStore((s) => s.hydrate);
  const addProduct = useProductsStore((s) => s.addProduct);
  const removeProduct = useProductsStore((s) => s.removeProduct);
  const updateProduct = useProductsStore((s) => s.updateProduct);
  const syncLibraryProduct = useProjectStore((s) => s.syncLibraryProduct);
  const upsertProductPage = useProjectStore((s) => s.upsertProductPage);
  const upsertProductsIndexPage = useProjectStore((s) => s.upsertProductsIndexPage);
  const upsertHomeFeaturedGrid = useProjectStore((s) => s.upsertHomeFeaturedGrid);
  const removeProductPageByHandle = useProjectStore(
    (s) => s.removeProductPageByHandle,
  );
  // v3+ canonical library actions. Every legacy localStorage write below
  // also writes here so SiteProject.productLibrary stays the source of
  // truth for renderers (via ProductLibraryProvider) and CMS adapters.
  const addProductToLibrary = useProjectStore((s) => s.addProductToLibrary);
  const updateProductInLibrary = useProjectStore((s) => s.updateProductInLibrary);
  const removeProductFromLibrary = useProjectStore(
    (s) => s.removeProductFromLibrary,
  );
  const replaceProductLibrary = useProjectStore((s) => s.replaceProductLibrary);
  const projectLibrary = useProjectStore((s) => s.project?.productLibrary);

  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // One-time backfill: when localStorage has products but the SiteProject
  // library is empty (legacy v2 project that just migrated), push the
  // localStorage catalog into the project so adapters can see it. Runs
  // after hydration completes; safe to re-run because it bails when the
  // project library is non-empty.
  useEffect(() => {
    if (!hydrated) return;
    if (!projectLibrary) return; // project not loaded yet
    if (projectLibrary.length > 0) return;
    if (products.length === 0) return;
    replaceProductLibrary(products.map(libraryToProduct));
  }, [hydrated, projectLibrary, products, replaceProductLibrary]);

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center text-xs opacity-50">
        Loading products…
      </div>
    );
  }

  const editing = editingId
    ? products.find((p) => p.id === editingId) ?? null
    : null;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-current/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-60">
              Products
            </h2>
            <p className="text-[10px] opacity-50">
              {products.length} item{products.length === 1 ? "" : "s"} in library
            </p>
          </div>
          <button
            onClick={() => {
              const title = "New product";
              const base = slugifyHandle(title);
              const existingHandles = new Set(
                useProductsStore.getState().products.map((p) => p.handle),
              );
              let handle = base;
              let n = 2;
              while (existingHandles.has(handle)) {
                handle = `${base}-${n}`;
                n++;
              }
              const fresh = addProduct({
                title,
                handle,
                price: "$0",
                currency: "USD",
                image: { url: "", alt: "" },
                href: `/products/${handle}`,
              });
              // Dual-write: SiteProject.productLibrary is the source of truth
              // for adapters + renderers; localStorage stays as a per-agency
              // cache until Phase 10.5 retires it.
              addProductToLibrary(libraryToProduct(fresh));
              upsertProductPage({
                handle: fresh.handle,
                title: fresh.title,
                pageSections: buildProductPageSections(fresh),
                productDetailContent: buildProductDetailContent(fresh),
              });
              // Keep the catalog page AND the home featured strip in sync
              // with the full updated library — so the new product is
              // visible on the landing page the moment it's added, the way
              // Shopify / IKAS storefronts behave by default.
              const allCards = useProductsStore
                .getState()
                .products.map(libraryToProductCard);
              upsertProductsIndexPage(allCards);
              upsertHomeFeaturedGrid(allCards);
            }}
            className="rounded-full border border-current/20 px-3 py-1 text-xs hover:border-current/40"
          >
            + New
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {products.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs opacity-50">
            No products yet. Click + New to add one.
          </p>
        ) : (
          <ul className="grid gap-1.5">
            {products.map((p) => (
              <li key={p.id}>
                <ProductCard
                  product={p}
                  onEdit={() => setEditingId(p.id)}
                  onRemove={() => {
                    removeProduct(p.id);
                    removeProductFromLibrary(p.id);
                    removeProductPageByHandle(p.handle);
                    const remainingCards = useProductsStore
                      .getState()
                      .products.map(libraryToProductCard);
                    upsertProductsIndexPage(remainingCards);
                    upsertHomeFeaturedGrid(remainingCards);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-current/10 px-4 py-3 text-[11px] opacity-60">
        Drag onto a product-grid section to add it.
      </div>

      {editing ? (
        <EditProductModal
          product={editing}
          onClose={() => setEditingId(null)}
          onSave={(patch) => {
            updateProduct(editing.id, patch);
            // Broadcast the library change into every product-grid section
            // so legacy mode:"manual" grids reflect the edit. Library-mode
            // grids re-hydrate on the next render via ProductLibraryProvider
            // — no per-section write needed. Both paths run for the dual-
            // write transitional period.
            const nextProduct: LibraryProduct = { ...editing, ...patch };
            syncLibraryProduct(editing.id, libraryToProductCard(nextProduct));
            updateProductInLibrary(editing.id, libraryToProduct(nextProduct));
            // Also sync the Shopify-style `/products/<handle>` page.
            // Handle change migrates the slug too.
            upsertProductPage({
              handle: nextProduct.handle,
              previousHandle: editing.handle,
              title: nextProduct.title,
              pageSections: buildProductPageSections(nextProduct),
              productDetailContent: buildProductDetailContent(nextProduct),
            });
            // Refresh the catalog page AND the home featured strip so the
            // updated card reflects everywhere the library surfaces it.
            const updatedCards = useProductsStore
              .getState()
              .products.map(libraryToProductCard);
            upsertProductsIndexPage(updatedCards);
            upsertHomeFeaturedGrid(updatedCards);
            setEditingId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ProductCard({
  product,
  onEdit,
  onRemove,
}: {
  product: LibraryProduct;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const data: LibraryProductData = {
    kind: "library-product",
    productId: product.id,
  };
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: libraryProductDraggableId(product.id),
    data,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 rounded border border-current/15 p-2 transition hover:border-current/40 hover:bg-current/5"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex h-10 w-10 shrink-0 cursor-grab items-center justify-center overflow-hidden rounded bg-current/5 active:cursor-grabbing"
      >
        {product.image.url ? (
          <img
            src={product.image.url}
            alt={product.image.alt ?? product.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <ShoppingBag className="h-4 w-4 opacity-50" aria-hidden="true" />
        )}
      </div>
      <div
        {...attributes}
        {...listeners}
        className="min-w-0 flex-1 cursor-grab active:cursor-grabbing"
      >
        <div className="truncate text-sm font-medium">{product.title}</div>
        <div className="truncate text-[11px] opacity-60">
          {product.price}
          {product.compareAtPrice ? (
            <span className="ml-1 line-through opacity-60">{product.compareAtPrice}</span>
          ) : null}
          {" · "}
          <span className="font-mono opacity-70">{product.handle}</span>
        </div>
      </div>
      <div className="flex opacity-0 transition group-hover:opacity-100">
        <MiniButton label="Edit" onClick={onEdit}>
          ✎
        </MiniButton>
        <MiniButton label="Remove" onClick={onRemove}>
          ×
        </MiniButton>
      </div>
    </div>
  );
}

function MiniButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded text-xs opacity-60 hover:bg-current/15 hover:opacity-100"
    >
      {children}
    </button>
  );
}

function EditProductModal({
  product,
  onClose,
  onSave,
}: {
  product: LibraryProduct;
  onClose: () => void;
  onSave: (patch: Partial<LibraryProduct>) => void;
}) {
  const [form, setForm] = useState({
    title: product.title,
    handle: product.handle,
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? "",
    currency: product.currency ?? "USD",
    href: product.href,
    imageUrl: product.image.url,
    imageAlt: product.image.alt ?? "",
  });
  const [handleEdited, setHandleEdited] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save() {
    onSave({
      title: form.title,
      handle: form.handle,
      price: form.price,
      compareAtPrice: form.compareAtPrice || undefined,
      currency: form.currency,
      href: form.href,
      image: { url: form.imageUrl, alt: form.imageAlt },
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-white/10 bg-paper p-6 shadow-xl dark:bg-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit product</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-current/10"
          >
            ×
          </button>
        </header>

        <div className="space-y-3">
          <TextField
            label="Title"
            value={form.title}
            onChange={(v) => {
              const next: typeof form = { ...form, title: v };
              if (!handleEdited) {
                const auto = slugifyHandle(v);
                next.handle = auto;
                next.href = `/products/${auto}`;
              }
              setForm(next);
            }}
          />
          <TextField
            label="Handle"
            value={form.handle}
            onChange={(v) => {
              setHandleEdited(true);
              setForm({ ...form, handle: v, href: `/products/${v}` });
            }}
            hint={`/products/${form.handle}`}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Price"
              value={form.price}
              onChange={(v) => setForm({ ...form, price: v })}
            />
            <TextField
              label="Compare-at (optional)"
              value={form.compareAtPrice}
              onChange={(v) => setForm({ ...form, compareAtPrice: v })}
            />
          </div>
          <TextField
            label="Product URL"
            value={form.href}
            onChange={(v) => setForm({ ...form, href: v })}
          />
          <TextField
            label="Image URL"
            value={form.imageUrl}
            onChange={(v) => setForm({ ...form, imageUrl: v })}
          />
          <TextField
            label="Image alt"
            value={form.imageAlt}
            onChange={(v) => setForm({ ...form, imageAlt: v })}
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-current/20 px-4 py-2 text-sm hover:border-current/40"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="rounded-full bg-ink px-4 py-2 text-sm text-paper dark:bg-paper dark:text-ink"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider opacity-60">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-current/20 bg-transparent px-3 py-2 text-sm focus:border-current/60 focus:outline-none"
      />
      {hint ? (
        <span className="font-mono text-[10px] opacity-40">{hint}</span>
      ) : null}
    </label>
  );
}

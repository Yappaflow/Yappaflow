"use client";

import { create } from "zustand";

/**
 * Agency-scoped product library — the catalog of items an agency has
 * uploaded once and can now drop into any number of product-grid sections
 * across projects. Phase 8 persists this in localStorage so it survives
 * reloads; Phase 10.5 will replace the storage layer with a server fetch
 * that talks to the Yappaflow dashboard's real product catalog. The store
 * shape stays identical either way.
 */

export interface LibraryProduct {
  id: string;
  title: string;
  handle: string;
  price: string;
  compareAtPrice?: string;
  currency?: string;
  image: { url: string; alt?: string };
  href: string;
  tags?: string[];
}

const STORAGE_KEY = "yf.products-library";

interface ProductsState {
  products: LibraryProduct[];
  hydrated: boolean;
  hydrate(): void;
  /**
   * Append a product. Returns the newly-minted product (so the caller can
   * round-trip it into the project store to create a matching
   * `/products/<handle>` page).
   */
  addProduct(product: Omit<LibraryProduct, "id">): LibraryProduct;
  updateProduct(id: string, patch: Partial<LibraryProduct>): void;
  removeProduct(id: string): void;
  replaceAll(products: LibraryProduct[]): void;
  /**
   * Merge server-sourced products into the library. Products whose handle
   * already exists are skipped to preserve any agency edits. Returns only
   * the products that were newly added so the caller can create pages for them.
   */
  syncServerProducts(incoming: Array<Omit<LibraryProduct, "id">>): LibraryProduct[];
}

/**
 * One-off migration for the v1 → v2 seed id change. Earlier builds seeded
 * with `p_sample1/2/3` ids that didn't match the product-grid default
 * content's `p-001/2/3` — `syncLibraryProduct` never found matches and
 * library edits appeared to do nothing. Map any old ids we find to the
 * new scheme and persist once.
 */
const LEGACY_ID_MIGRATION: Record<string, string> = {
  p_sample1: "p-001",
  p_sample2: "p-002",
  p_sample3: "p-003",
};

function readFromStorage(): LibraryProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SAMPLE_PRODUCTS;
    const parsed = JSON.parse(raw) as LibraryProduct[];
    if (!Array.isArray(parsed)) return SAMPLE_PRODUCTS;
    let migrated = false;
    const next = parsed.map((p) => {
      const migratedId = LEGACY_ID_MIGRATION[p.id];
      if (migratedId) {
        migrated = true;
        return { ...p, id: migratedId };
      }
      return p;
    });
    if (migrated) writeToStorage(next);
    return next;
  } catch {
    return SAMPLE_PRODUCTS;
  }
}

function writeToStorage(products: LibraryProduct[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch {
    /* quota or private-mode — ignore */
  }
}

function makeId(): string {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Seed catalog. When an agency has never touched their product library,
 * we pre-populate with these so the UI isn't empty on first visit. They
 * can delete or edit freely.
 *
 * IMPORTANT: these ids MUST match the product ids in
 * `packages/sections/src/product-grid/default.ts`. The canvas's fixture
 * product-grid section seeds from the sections library's default content,
 * and `syncLibraryProduct` finds products to update by matching `id`. If
 * the ids drift, editing the library silently has no effect on the
 * pre-seeded canvas products — which is confusing.
 */
const SAMPLE_PRODUCTS: LibraryProduct[] = [
  {
    id: "p-001",
    title: "Classic tee",
    handle: "classic-tee",
    price: "$42",
    currency: "USD",
    image: { url: "/images/products/classic-tee.jpg", alt: "Classic tee" },
    href: "/products/classic-tee",
    tags: ["apparel"],
  },
  {
    id: "p-002",
    title: "Studio cap",
    handle: "studio-cap",
    price: "$28",
    currency: "USD",
    image: { url: "/images/products/studio-cap.jpg", alt: "Studio cap" },
    href: "/products/studio-cap",
    tags: ["apparel", "headwear"],
  },
  {
    id: "p-003",
    title: "Canvas tote",
    handle: "canvas-tote",
    price: "$34",
    currency: "USD",
    image: { url: "/images/products/canvas-tote.jpg", alt: "Canvas tote" },
    href: "/products/canvas-tote",
    tags: ["accessory"],
  },
];

export const useProductsStore = create<ProductsState>()((set, get) => ({
  products: [],
  hydrated: false,

  hydrate() {
    if (get().hydrated) return;
    set({ products: readFromStorage(), hydrated: true });
  },

  addProduct(product) {
    // Dedupe handle inside the action so callers can't lose to a race —
    // two rapid +New clicks from products-panel previously both saw an
    // empty existingHandles set and produced two products with the same
    // handle (`new-product`) until this guard moved into the store.
    const existing = get().products;
    const taken = new Set(existing.map((p) => p.handle));
    let handle = product.handle;
    if (taken.has(handle)) {
      const base = handle;
      let n = 2;
      while (taken.has(`${base}-${n}`)) n++;
      handle = `${base}-${n}`;
    }
    const full: LibraryProduct = {
      ...product,
      handle,
      // Keep href in sync with the (possibly suffixed) handle so deep links
      // resolve correctly.
      href: product.href.startsWith("/products/")
        ? `/products/${handle}`
        : product.href,
      id: makeId(),
    };
    const next = [...existing, full];
    set({ products: next });
    writeToStorage(next);
    return full;
  },

  updateProduct(id, patch) {
    const next = get().products.map((p) => (p.id === id ? { ...p, ...patch } : p));
    set({ products: next });
    writeToStorage(next);
  },

  removeProduct(id) {
    const next = get().products.filter((p) => p.id !== id);
    set({ products: next });
    writeToStorage(next);
  },

  replaceAll(products) {
    set({ products });
    writeToStorage(products);
  },

  syncServerProducts(incoming) {
    const existing = get().products;
    const existingHandles = new Set(existing.map((p) => p.handle));
    const added: LibraryProduct[] = incoming
      .filter((p) => !existingHandles.has(p.handle))
      .map((p) => ({ ...p, id: makeId() }));
    if (added.length === 0) return [];
    const next = [...existing, ...added];
    set({ products: next });
    writeToStorage(next);
    return added;
  },
}));

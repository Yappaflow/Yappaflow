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
  addProduct(product: Omit<LibraryProduct, "id">): LibraryProduct;
  updateProduct(id: string, patch: Partial<LibraryProduct>): void;
  removeProduct(id: string): void;
  replaceAll(products: LibraryProduct[]): void;
}

function readFromStorage(): LibraryProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SAMPLE_PRODUCTS;
    const parsed = JSON.parse(raw) as LibraryProduct[];
    if (!Array.isArray(parsed)) return SAMPLE_PRODUCTS;
    return parsed;
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
 */
const SAMPLE_PRODUCTS: LibraryProduct[] = [
  {
    id: "p_sample1",
    title: "Classic tee",
    handle: "classic-tee",
    price: "$42",
    currency: "USD",
    image: { url: "/images/products/classic-tee.jpg", alt: "Classic tee" },
    href: "/products/classic-tee",
    tags: ["apparel"],
  },
  {
    id: "p_sample2",
    title: "Studio cap",
    handle: "studio-cap",
    price: "$28",
    currency: "USD",
    image: { url: "/images/products/studio-cap.jpg", alt: "Studio cap" },
    href: "/products/studio-cap",
    tags: ["apparel", "headwear"],
  },
  {
    id: "p_sample3",
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
    const full: LibraryProduct = { ...product, id: makeId() };
    const next = [...get().products, full];
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
}));

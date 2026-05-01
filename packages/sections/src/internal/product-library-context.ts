"use client";

import { createContext, createElement, useContext, type ReactNode } from "react";
import type { Product } from "@yappaflow/types";

/**
 * Context that exposes the live `SiteProject.productLibrary` to section
 * renderers. The product-grid and product-detail renderers reach into this
 * to hydrate themselves from the library when a section references items by
 * id (the new v3 shape) rather than embedding a snapshot inline (the legacy
 * v2 shape, still supported for back-compat).
 *
 * The default value is an empty array, which matches a non-commerce site or
 * an old SiteProject that hasn't been migrated yet — sections that only
 * reference inline data still render fine without a Provider in the tree.
 *
 * Wired by the builder canvas, the builder preview shell, the showcase route,
 * and the CMS adapters' static-render path. Each wraps its render tree once
 * with `<ProductLibraryProvider value={project.productLibrary}>` so every
 * descendant section sees the same library.
 *
 * No JSX in this file so it can stay a plain `.ts` — JSX is fine in render
 * components, but pulling React-namespace `.ts` modules into a `.tsx`
 * pipeline causes the tsup banner-attach quirk to bite. Cheap to avoid.
 */
export const ProductLibraryContext = createContext<readonly Product[]>([]);

export interface ProductLibraryProviderProps {
  value: readonly Product[];
  children: ReactNode;
}

export function ProductLibraryProvider({
  value,
  children,
}: ProductLibraryProviderProps) {
  return createElement(
    ProductLibraryContext.Provider,
    { value },
    children,
  );
}

/** Read the active library. Returns empty array when no Provider is mounted. */
export function useProductLibrary(): readonly Product[] {
  return useContext(ProductLibraryContext);
}

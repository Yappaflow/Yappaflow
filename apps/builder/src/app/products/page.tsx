"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useProductsStore } from "@/lib/products-store";

export default function ProductsPage() {
  const products = useProductsStore((s) => s.products);
  const hydrated = useProductsStore((s) => s.hydrated);
  const hydrate = useProductsStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-10 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.22em] opacity-60 hover:opacity-100 transition-opacity"
          >
            Yappaflow · Builder
          </Link>
          <span className="opacity-20">/</span>
          <span className="text-xs uppercase tracking-[0.22em]">Products</span>
        </div>
        <ThemeToggle />
      </header>

      <section className="flex-1 px-6 py-10 md:px-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
            {hydrated && (
              <p className="mt-1 text-sm opacity-60">
                {products.length} item{products.length === 1 ? "" : "s"} in catalog
              </p>
            )}
          </div>
          <Link
            href="/p/sample"
            className="inline-flex items-center gap-2 rounded-full border border-current/20 px-4 py-2 text-sm hover:border-current/40 transition-colors"
          >
            Open builder
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {!hydrated ? (
          <div className="flex items-center justify-center py-24 text-sm opacity-50">
            Loading products…
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <ShoppingBag className="h-10 w-10 opacity-20" />
            <p className="text-sm opacity-60">No products in the catalog yet.</p>
            <Link
              href="/p/sample"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90 dark:bg-paper dark:text-ink"
            >
              Add products in the builder
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/products/${product.handle}`}
                  className="group flex flex-col overflow-hidden rounded-lg border border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 transition-colors"
                >
                  <div className="aspect-square w-full overflow-hidden bg-current/5">
                    {product.image.url ? (
                      <img
                        src={product.image.url}
                        alt={product.image.alt ?? product.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ShoppingBag className="h-10 w-10 opacity-20" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 p-4">
                    <span className="font-medium leading-snug">{product.title}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold">{product.price}</span>
                      {product.compareAtPrice && (
                        <span className="text-xs line-through opacity-50">
                          {product.compareAtPrice}
                        </span>
                      )}
                    </div>
                    {product.tags && product.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {product.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-current/15 px-2 py-0.5 text-[10px] uppercase tracking-wider opacity-60"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="flex items-center justify-between px-6 py-5 text-xs opacity-50 md:px-10 border-t border-black/10 dark:border-white/10">
        <span>© {new Date().getFullYear()} Yappaflow</span>
        <span>builder.yappaflow.com</span>
      </footer>
    </main>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Lenis from "lenis";
import { SECTIONS } from "@yappaflow/sections";
import type { Page, SiteProject } from "@yappaflow/types";
import { loadProjectFromStorage } from "@/lib/persistence";
import { playAllInContainer } from "@/lib/gsap-reveal";
import { buildSampleSiteProject } from "@/fixtures/sample-project";
import { buildDynamicProductPage } from "@/lib/product-page";
import type { LibraryProduct } from "@/lib/products-store";

const PRODUCTS_STORAGE_KEY = "yf.products-library";

function readLibraryProducts(): LibraryProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LibraryProduct[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Renders a single page of a SiteProject at its real URL (no hash routing).
 * Used by /products and /products/[...handle] so those routes render the
 * actual site content — sections, globals, GSAP, Lenis — with proper
 * Next.js link navigation instead of the preview shell's hash scheme.
 */
export function ProjectPageView({
  projectId,
  slug,
}: {
  projectId: string;
  slug: string;
}) {
  const [project, setProject] = useState<SiteProject | null>(null);
  const [dynamicPage, setDynamicPage] = useState<Page | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fromStorage = loadProjectFromStorage(projectId);
    const fallback = projectId === "sample" ? buildSampleSiteProject() : null;
    setProject(fromStorage ?? fallback);
  }, [projectId]);

  // When the project is loaded and no stored page matches the slug, check
  // if the slug is a product handle and build a dynamic page from the library.
  useEffect(() => {
    if (!project) return;
    const stored = project.pages.find((p) => p.slug === slug);
    if (stored) {
      setDynamicPage(null);
      return;
    }
    if (!slug.startsWith("/products/") || slug === "/products") {
      setDynamicPage(null);
      return;
    }
    const handle = slug.slice("/products/".length);
    if (!handle) return;
    const products = readLibraryProducts();
    const product = products.find((p) => p.handle === handle);
    if (!product) {
      setDynamicPage(null);
      return;
    }
    setDynamicPage(buildDynamicProductPage(product, products));
  }, [project, slug]);

  // Intercept internal link clicks and use real URL navigation.
  useEffect(() => {
    if (!project) return;
    function onClick(event: MouseEvent) {
      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:")
      )
        return;
      const isStoredPage = project!.pages.some((p) => p.slug === href);
      const isProductSlug = href.startsWith("/products/") && href !== "/products";
      if (!isStoredPage && !isProductSlug) return;
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "instant" });
      router.push(href);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [project, router]);

  // Replay GSAP on mount / slug change.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const frame = requestAnimationFrame(() => playAllInContainer(el));
    return () => cancelAnimationFrame(frame);
  }, [slug, project]);

  // Lenis smooth scroll.
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    });
    let frame = 0;
    function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    }
    frame = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  if (!project) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white text-neutral-600">
        <p className="text-xs uppercase tracking-[0.2em] opacity-60">Loading…</p>
      </main>
    );
  }

  const page = project.pages.find((p) => p.slug === slug) ?? dynamicPage;
  if (!page) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white text-neutral-600">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] opacity-60">404</p>
          <p className="mt-3 text-lg">Page not found</p>
          <a href="/" className="mt-4 inline-block text-sm underline">
            Go home
          </a>
        </div>
      </main>
    );
  }

  const { announcementBar, header, footer } = project.globals;

  return (
    <div ref={containerRef} className="min-h-dvh bg-white">
      {announcementBar ? <SectionRenderer section={announcementBar} /> : null}
      {header ? <SectionRenderer section={header} /> : null}
      {page.sections.map((s) => (
        <SectionRenderer key={s.id} section={s} />
      ))}
      {footer ? <SectionRenderer section={footer} /> : null}
    </div>
  );
}

function SectionRenderer({ section }: { section: Page["sections"][number] }) {
  const def = SECTIONS[section.type];
  if (!def) return null;
  const Component = def.Component;
  return <Component section={section} />;
}

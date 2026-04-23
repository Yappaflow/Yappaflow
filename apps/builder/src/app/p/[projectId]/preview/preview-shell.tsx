"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { SECTIONS } from "@yappaflow/sections";
import type { Page, SiteProject } from "@yappaflow/types";
import { loadProjectFromStorage } from "@/lib/persistence";
import { playAllInContainer } from "@/lib/gsap-reveal";
import { buildSampleSiteProject } from "@/fixtures/sample-project";

/**
 * Full-bleed preview shell.
 *
 * URL deep-linking uses the hash segment:
 *
 *   /p/sample/preview#/                               → home
 *   /p/sample/preview#/about                          → About page
 *   /p/sample/preview#/products/classic-tee           → product page
 *
 * Hash (not path segments) because a catch-all route conflicted with
 * the parent `preview/page.tsx` in Next's App Router. Hash is fully
 * client-side, survives refresh, and browser back/forward work because
 * we listen for `hashchange`.
 *
 * GSAP animations replay on page change, Lenis drives smooth scroll.
 */
export function PreviewShell({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<SiteProject | null>(null);
  const [activeSlug, setActiveSlug] = useState<string>("/");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fromStorage = loadProjectFromStorage(projectId);
    const fallback = projectId === "sample" ? buildSampleSiteProject() : null;
    const loaded = fromStorage ?? fallback;
    if (!loaded) return;
    setProject(loaded);
    const hash = hashToSlug(window.location.hash);
    const urlMatches = loaded.pages.some((p) => p.slug === hash);
    setActiveSlug(urlMatches ? hash : loaded.pages[0]?.slug ?? "/");
  }, [projectId]);

  // Intercept in-app nav link clicks. Update the hash so the URL bar
  // reflects the current page; browser back/forward work because the
  // `hashchange` listener below owns the response to URL changes.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!project) return;
      const target = event.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) {
        return;
      }
      const match = project.pages.find((p) => p.slug === href);
      if (!match) return;
      event.preventDefault();
      window.location.hash = slugToHash(match.slug);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [project]);

  // Hash-driven navigation — fires on hash change from any source
  // (link click, back/forward button, paste of a deep-link URL).
  useEffect(() => {
    function onHashChange() {
      if (!project) return;
      const next = hashToSlug(window.location.hash);
      const match = project.pages.find((p) => p.slug === next);
      setActiveSlug(match ? next : project.pages[0]?.slug ?? "/");
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [project]);

  // Replay GSAP on every page change.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      playAllInContainer(el);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeSlug, project]);

  // Lenis smooth scroll for the whole preview document.
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
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] opacity-60">
            Yappaflow · Preview
          </p>
          <p className="mt-3 text-lg">
            No project saved for <code className="font-mono">{projectId}</code>.
          </p>
          <p className="mt-1 text-sm opacity-70">
            Open the builder and save at least once, then reload this tab.
          </p>
        </div>
      </main>
    );
  }

  const page =
    project.pages.find((p) => p.slug === activeSlug) ?? project.pages[0];
  if (!page) return null;

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

/** `#/products/classic-tee` → `/products/classic-tee`. Bare `#` → `/`. */
function hashToSlug(hash: string): string {
  if (!hash || hash === "#" || hash === "#/") return "/";
  const stripped = hash.replace(/^#/, "");
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

/** `/products/classic-tee` → `#/products/classic-tee`. Home → `#/`. */
function slugToHash(slug: string): string {
  return slug === "/" ? "#/" : `#${slug}`;
}

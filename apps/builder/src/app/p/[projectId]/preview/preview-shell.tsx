"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { SECTIONS } from "@yappaflow/sections";
import type { Page, SiteProject } from "@yappaflow/types";
import { loadProjectFromStorage } from "@/lib/persistence";
import { playAllInContainer } from "@/lib/gsap-reveal";
import { buildSampleSiteProject } from "@/fixtures/sample-project";

/**
 * Full-bleed preview — no builder chrome, no outlines, no drop zones.
 *
 * URL-synced. The route accepts a catch-all slug
 * (`/p/[id]/preview/[[...slug]]`) that sets the initial page. When the
 * user clicks an in-app nav link, we call `history.pushState` so the URL
 * bar reflects the current page and browser back/forward works. Deep
 * links like `/p/sample/preview/products/classic-tee` are shareable.
 *
 * GSAP animations + Lenis smooth scroll active here just like they will
 * be on an exported site.
 */
export function PreviewShell({
  projectId,
  initialSlug = "/",
}: {
  projectId: string;
  initialSlug?: string;
}) {
  const [project, setProject] = useState<SiteProject | null>(null);
  const [activeSlug, setActiveSlug] = useState<string>(initialSlug);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fromStorage = loadProjectFromStorage(projectId);
    const fallback = projectId === "sample" ? buildSampleSiteProject() : null;
    const loaded = fromStorage ?? fallback;
    if (loaded) {
      setProject(loaded);
      // If the URL-provided slug doesn't correspond to any page in the
      // project, fall back to the first page so the agency always sees
      // SOMETHING rather than a blank preview.
      const urlMatches = loaded.pages.some((p) => p.slug === initialSlug);
      setActiveSlug(urlMatches ? initialSlug : loaded.pages[0]?.slug ?? "/");
    }
  }, [projectId, initialSlug]);

  // Nav link interception — update `activeSlug` + push to browser history
  // so the URL bar stays in sync with the page being viewed.
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
      setActiveSlug(match.slug);
      const prefix = `/p/${encodeURIComponent(projectId)}/preview`;
      const url =
        match.slug === "/" ? prefix : `${prefix}${match.slug}`;
      window.history.pushState({ slug: match.slug }, "", url);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [project, projectId]);

  // Browser back/forward — listen for popstate so navigating via the
  // history buttons re-renders the correct page.
  useEffect(() => {
    function onPopState() {
      const prefix = `/p/${encodeURIComponent(projectId)}/preview`;
      const path = window.location.pathname;
      const rawSlug = path.startsWith(prefix) ? path.slice(prefix.length) : "";
      const normalized = rawSlug || "/";
      setActiveSlug(normalized);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [projectId]);

  // Replay GSAP on every page change so the new page's animations play
  // fresh — same vibe as navigating between pages on a real site.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      playAllInContainer(el);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeSlug, project]);

  // Lenis smooth scroll — the "drop feel" agencies expect. Single
  // instance for the whole preview document; torn down on unmount so
  // exiting the preview tab doesn't leave a stray RAF loop.
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

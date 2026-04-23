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
 * Renders the SiteProject at the `/p/[id]/preview` route, navigates
 * between pages client-side when the user clicks nav links.
 *
 * GSAP reveal runtime fires on mount of each page so animations feel
 * exactly like the exported site will.
 */
export function PreviewShell({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<SiteProject | null>(null);
  const [activeSlug, setActiveSlug] = useState<string>("/");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Hydrate from localStorage; fall back to the bundled sample if we're
    // previewing the sample project id.
    const fromStorage = loadProjectFromStorage(projectId);
    const fallback = projectId === "sample" ? buildSampleSiteProject() : null;
    const loaded = fromStorage ?? fallback;
    if (loaded) {
      setProject(loaded);
      const firstSlug = loaded.pages[0]?.slug ?? "/";
      setActiveSlug(firstSlug);
    }
  }, [projectId]);

  // Intercept internal-link clicks so nav works without reloading.
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
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [project]);

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
      // easeOut cubic — snappy enough to not feel laggy on trackpads.
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

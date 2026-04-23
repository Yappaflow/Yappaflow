/**
 * Sample SiteProject for local dev. Mirrors what
 * `assembleSiteProject()` in apps/yappaflow-mcp would produce for the
 * fixture brief (FIXTURE_BRIEF), but inlined here so the builder can boot
 * without talking to the MCP.
 *
 * When Phase 10.5 wires the studio → builder handoff, the real entry point
 * becomes `/p/<projectId>` fetching from the server cache; this fixture
 * stays around for standalone testing at `/p/sample`.
 */

import {
  FIXTURE_BRIEF,
  SITE_PROJECT_SCHEMA_VERSION,
  type MergedDna,
  type Section,
  type SectionType,
  type SiteProject,
} from "@yappaflow/types";
import { SECTION_DATA } from "@yappaflow/sections/data";

/**
 * Minimal MergedDna — enough shape to satisfy SiteProject.dna's passthrough
 * schema. The builder canvas doesn't (yet) render based on DNA tokens; Phase
 * 8b resolves DNA-bound colors/spacing when it wires the skeleton styling.
 */
const SAMPLE_DNA: MergedDna = {
  schemaVersion: 1,
  meta: {
    url: "https://sample.yappaflow",
    finalUrl: "https://sample.yappaflow",
    title: "Sample",
    description: null,
    capturedAt: new Date().toISOString(),
    viewport: { width: 1440, height: 900 },
    timings: { navigateMs: 0, scrollMs: 0, analyzeMs: 0, totalMs: 0 },
    warnings: [],
  },
  typography: { styles: [], families: [], scalePx: [14, 16, 18, 24, 32, 48, 64] },
  colors: {
    palette: [
      { value: "#0b0b0b", count: 100, roles: ["foreground"] },
      { value: "#f6f5f2", count: 95, roles: ["background"] },
      { value: "#d4af37", count: 20, roles: ["fill"] },
    ],
    customProperties: [],
    summary: {
      backgrounds: ["#f6f5f2", "#0b0b0b"],
      foregrounds: ["#0b0b0b", "#f6f5f2"],
      accents: ["#d4af37"],
    },
  },
  motion: {
    keyframes: [],
    transitions: [],
    runtimeAnimations: [],
    scrollHints: [],
  },
  grid: {
    containers: [],
    rhythm: { maxWidth: "1200px", padding: "24px", gap: "24px" },
  },
  stack: { libraries: [], frameworks: [] },
  assets: {
    fonts: [],
    images: [],
    videos: [],
    scripts: [],
    stylesheets: [],
    totalTransferKb: 0,
  },
  mergeMeta: {
    structureSource: {
      url: "sample://structure",
      finalUrl: "sample://structure",
      title: "sample",
    },
    typographySource: {
      url: "sample://typography",
      finalUrl: "sample://typography",
      title: "sample",
    },
    motionSource: {
      url: "sample://motion",
      finalUrl: "sample://motion",
      title: "sample",
    },
    paletteSource: {
      url: "sample://palette",
      finalUrl: "sample://palette",
      title: "sample",
    },
    reasoning: ["builder fixture — no real DNA merge performed"],
  },
};

function defaultSection<T extends SectionType>(
  id: string,
  type: T,
  extra?: { animation?: Section["animation"]; variant?: string },
): Section {
  const data = SECTION_DATA[type];
  return {
    id,
    type,
    variant: extra?.variant ?? data.defaultVariant,
    content: { ...(data.defaultContent as Record<string, unknown>) },
    style: {},
    ...(extra?.animation ? { animation: extra.animation } : {}),
  };
}

export function buildSampleSiteProject(): SiteProject {
  return {
    schemaVersion: SITE_PROJECT_SCHEMA_VERSION,
    brief: FIXTURE_BRIEF,
    dna: SAMPLE_DNA,
    pages: [
      {
        id: "pg_home",
        slug: "/",
        title: "Home",
        seo: {
          description: "Sample site assembled for the builder.",
        },
        sections: [
          // Seed each section with a sensible GSAP preset so the builder
          // shows motion on first paint — the whole point of having the
          // runtime in place. Agencies can change presets per-section in
          // the right rail.
          defaultSection("sec_hero", "hero", { animation: "slide-up" }),
          defaultSection("sec_fgrid", "feature-grid", {
            animation: "stagger-children",
          }),
          defaultSection("sec_frow", "feature-row", { animation: "slide-left" }),
          defaultSection("sec_test", "testimonial", { animation: "fade-in" }),
          defaultSection("sec_cta", "cta-band", { animation: "scale-in" }),
        ],
      },
    ],
    globals: {
      header: defaultSection("sec_header", "header"),
      footer: defaultSection("sec_footer", "footer"),
      announcementBar: defaultSection("sec_annbar", "announcement-bar"),
    },
  };
}

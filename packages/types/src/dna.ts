/**
 * Design DNA schema. This is the one artifact every downstream phase depends on.
 * Keep it stable; breaking changes cascade into search, ranking, merge, and build.
 *
 * Moved here from apps/yappaflow-mcp/src/types.ts as part of the Phase 7
 * builder-first pivot: the same shapes are now consumed by the MCP tools, the
 * SiteProject assembler, the builder app, and the CMS adapters-v2. The shape
 * is unchanged (still schemaVersion 1); only the home of the declaration moved.
 * The MCP's types.ts re-exports from here so no call site import path changes.
 */

export type DesignDna = {
  schemaVersion: 1;
  meta: {
    url: string;
    finalUrl: string;
    title: string | null;
    description: string | null;
    capturedAt: string; // ISO
    viewport: { width: number; height: number };
    timings: {
      navigateMs: number;
      scrollMs: number;
      analyzeMs: number;
      totalMs: number;
    };
    warnings: string[];
  };
  typography: {
    /** Sorted by usage count desc. The real type system sits in the first 4–6 entries. */
    styles: TypographyStyle[];
    /** Raw declared font-family strings, deduped, with counts. */
    families: Array<{ family: string; count: number }>;
    /** Computed scale: distinct px sizes ascending. */
    scalePx: number[];
  };
  colors: {
    /** Every color usage across all elements, counted. */
    palette: Array<{ value: string; count: number; roles: ColorRole[] }>;
    /** CSS custom properties defined on :root (or html/body when :root is empty). */
    customProperties: Array<{ name: string; value: string }>;
    /** Summary: top N most-used colors named by role heuristic. */
    summary: { backgrounds: string[]; foregrounds: string[]; accents: string[] };
  };
  motion: {
    /** @keyframes parsed from stylesheets. Includes cross-origin when accessible. */
    keyframes: Array<{ name: string; source: "stylesheet" | "inline"; percentageStops: string[] }>;
    /** Unique transition shorthands (property, duration, timing, delay) with counts. */
    transitions: Array<{
      property: string;
      duration: string;
      timing: string;
      delay: string;
      count: number;
    }>;
    /** Snapshot of document.getAnimations() after scrolling through the page. */
    runtimeAnimations: Array<{
      effectTarget: string | null;
      keyframeName: string | null;
      duration: number | null;
      easing: string | null;
      iterations: number | null;
    }>;
    /** Scroll-linked / intersection-observer activity evidence (best-effort). */
    scrollHints: string[];
  };
  grid: {
    /** Grid/flex declarations from major layout containers (filtered by area). */
    containers: Array<{
      selector: string;
      display: string;
      gridTemplateColumns: string | null;
      gridTemplateRows: string | null;
      gap: string | null;
      maxWidth: string | null;
      padding: string | null;
      approxArea: number;
    }>;
    /** Page-level rhythm: common max-width, base padding, base gap (most frequent). */
    rhythm: { maxWidth: string | null; padding: string | null; gap: string | null };
  };
  stack: {
    /** Runtime-detected libraries (globals / DOM markers). */
    libraries: string[];
    /** Framework / meta hints from tags or scripts. */
    frameworks: string[];
  };
  assets: {
    fonts: Array<{ url: string; family: string | null; format: string | null }>;
    images: Array<{ url: string; intrinsicSize?: { w: number; h: number } }>;
    videos: string[];
    scripts: string[];
    stylesheets: string[];
    totalTransferKb: number;
  };
};

export type TypographyStyle = {
  family: string;
  weight: string;
  size: string; // e.g. "48px"
  lineHeight: string;
  letterSpacing: string;
  textTransform: string;
  count: number;
  sampleText: string;
};

export type ColorRole =
  | "background"
  | "foreground"
  | "border"
  | "fill"
  | "stroke"
  | "shadow";

/**
 * MergedDna — the output of merge_dna. Extends DesignDna with provenance
 * metadata so downstream consumers (build-site, adapters, builder) can show
 * the agency which source contributed each axis.
 *
 * Moved here from apps/yappaflow-mcp/src/tools/merge-dna.ts — same reason as
 * DesignDna. The mergeDna() function stays in the MCP because it depends on
 * MCP-local helpers; only the type declaration moved.
 */
export type MergedDna = DesignDna & {
  mergeMeta: {
    structureSource: { url: string; finalUrl: string; title: string | null };
    typographySource: { url: string; finalUrl: string; title: string | null };
    motionSource: { url: string; finalUrl: string; title: string | null };
    paletteSource: { url: string; finalUrl: string; title: string | null };
    reasoning: string[];
  };
};

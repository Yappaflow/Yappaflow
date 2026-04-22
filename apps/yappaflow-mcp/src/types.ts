/**
 * Design DNA schema. This is the one artifact every downstream phase depends on.
 * Keep it stable; breaking changes cascade into search, ranking, merge, and build.
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
  size: string;     // e.g. "48px"
  lineHeight: string;
  letterSpacing: string;
  textTransform: string;
  count: number;
  sampleText: string;
};

export type ColorRole = "background" | "foreground" | "border" | "fill" | "stroke" | "shadow";

export type ExtractorOptions = {
  viewport?: { width: number; height: number };
  navigationTimeoutMs?: number;
  scrollPasses?: number;
  userAgent?: string;
  includeRuntimeAnimations?: boolean;
};

export const DEFAULT_OPTIONS: Required<ExtractorOptions> = {
  viewport: { width: 1440, height: 900 },
  navigationTimeoutMs: 25_000,
  scrollPasses: 3,
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 YappaflowDNA/0.0.1",
  includeRuntimeAnimations: true,
};

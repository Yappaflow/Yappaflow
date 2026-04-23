/**
 * merge_dna — field-ownership blend of up to four source DNAs.
 *
 * Discipline (per plan):
 *   structure_from  → concept peer: content architecture, grid, sections
 *   typography_from → craft peer:   fonts, scale, tracking
 *   motion_from     → craft peer:   easings, reveals, transitions, keyframes
 *   palette_from    → craft peer:   colors, CSS vars, role summary
 *
 * The merge is not an average — it picks best-fit fields from each source. Weights influence
 * *which* entries within a section get kept when a section spans multiple styles.
 */

import type { DesignDna, MergedDna } from "../types.js";

// MergedDna declaration lives in @yappaflow/types as of Phase 7; re-export
// from this module unchanged so every consumer that does
// `import type { MergedDna } from "./merge-dna.js"` keeps working.
export type { MergedDna };

export type MergeInput = {
  structure_from: DesignDna;
  typography_from: DesignDna;
  motion_from: DesignDna;
  palette_from: DesignDna;
};

export type MergeWeights = {
  structure?: number;
  typography?: number;
  motion?: number;
  palette?: number;
};

export function mergeDna(input: MergeInput, weights: MergeWeights = {}): MergedDna {
  const reasoning: string[] = [];
  const w = {
    structure: weights.structure ?? 1,
    typography: weights.typography ?? 1,
    motion: weights.motion ?? 1,
    palette: weights.palette ?? 1,
  };

  const {
    structure_from: S,
    typography_from: T,
    motion_from: M,
    palette_from: P,
  } = input;

  reasoning.push(`structure from ${S.meta.finalUrl} (weight ${w.structure})`);
  reasoning.push(`typography from ${T.meta.finalUrl} (weight ${w.typography})`);
  reasoning.push(`motion from ${M.meta.finalUrl} (weight ${w.motion})`);
  reasoning.push(`palette from ${P.meta.finalUrl} (weight ${w.palette})`);

  const merged: MergedDna = {
    schemaVersion: 1,
    meta: {
      url: `merged://${canonicalDomain(S.meta.url)}+${canonicalDomain(T.meta.url)}+${canonicalDomain(M.meta.url)}+${canonicalDomain(P.meta.url)}`,
      finalUrl: "",
      title: S.meta.title,
      description: S.meta.description,
      capturedAt: new Date().toISOString(),
      viewport: S.meta.viewport,
      timings: { navigateMs: 0, scrollMs: 0, analyzeMs: 0, totalMs: 0 },
      warnings: [],
    },
    typography: {
      styles: T.typography.styles.slice(0, Math.max(8, Math.round(12 * w.typography))),
      families: T.typography.families.slice(0, 6),
      scalePx: T.typography.scalePx,
    },
    colors: {
      palette: P.colors.palette.slice(0, Math.max(12, Math.round(20 * w.palette))),
      customProperties: P.colors.customProperties.slice(0, 200),
      summary: P.colors.summary,
    },
    motion: {
      keyframes: M.motion.keyframes.slice(0, Math.max(8, Math.round(16 * w.motion))),
      transitions: M.motion.transitions.slice(0, Math.max(6, Math.round(12 * w.motion))),
      runtimeAnimations: M.motion.runtimeAnimations.slice(0, 20),
      scrollHints: mergeUnique(M.motion.scrollHints, S.motion.scrollHints).slice(0, 10),
    },
    grid: {
      containers: S.grid.containers.slice(0, Math.max(8, Math.round(16 * w.structure))),
      rhythm: S.grid.rhythm,
    },
    stack: {
      libraries: mergeUnique(S.stack.libraries, T.stack.libraries, M.stack.libraries),
      frameworks: mergeUnique(S.stack.frameworks, T.stack.frameworks, M.stack.frameworks),
    },
    assets: {
      fonts: T.assets.fonts.slice(0, 12),
      images: S.assets.images.slice(0, 24),
      videos: mergeUnique(S.assets.videos, M.assets.videos).slice(0, 8),
      scripts: S.assets.scripts.slice(0, 16),
      stylesheets: S.assets.stylesheets.slice(0, 12),
      totalTransferKb: S.assets.totalTransferKb,
    },
    mergeMeta: {
      structureSource: sourceMeta(S),
      typographySource: sourceMeta(T),
      motionSource: sourceMeta(M),
      paletteSource: sourceMeta(P),
      reasoning,
    },
  };

  // Conflict resolution: if structure's rhythm.maxWidth is null, fall back to typography's.
  if (!merged.grid.rhythm.maxWidth) {
    const fallback = T.grid.rhythm.maxWidth ?? M.grid.rhythm.maxWidth ?? P.grid.rhythm.maxWidth;
    if (fallback) {
      merged.grid.rhythm = { ...merged.grid.rhythm, maxWidth: fallback };
      reasoning.push(`grid.rhythm.maxWidth missing from structure source; borrowed from ${fallback}`);
    }
  }
  if (!merged.grid.rhythm.gap) {
    const fallback = T.grid.rhythm.gap ?? M.grid.rhythm.gap ?? P.grid.rhythm.gap;
    if (fallback) {
      merged.grid.rhythm = { ...merged.grid.rhythm, gap: fallback };
    }
  }

  return merged;
}

function sourceMeta(d: DesignDna) {
  return { url: d.meta.url, finalUrl: d.meta.finalUrl, title: d.meta.title };
}

function mergeUnique(...arrs: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of arrs) for (const v of a ?? []) if (!seen.has(v)) (seen.add(v), out.push(v));
  return out;
}

function canonicalDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

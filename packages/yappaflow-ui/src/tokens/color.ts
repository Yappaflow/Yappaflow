/**
 * Color tokens — art-gallery palette.
 *
 * Principles (from top-design SKILL.md):
 *  - Never pure #000 or #fff. Use warm variants.
 *  - Text hierarchy is opacity-driven off a single ink color.
 *  - Accent is used sparingly — it's the moment of surprise.
 *  - Both themes pass WCAG AA at body size.
 *
 * At runtime, components read from CSS variables (see styles/tokens.css).
 * This file is the TypeScript mirror for build-time access (tools, manifest,
 * tests) — edit both when the system changes.
 */

export const colorLight = {
  /** Primary page surface. Slightly warm, never pure white. */
  paper: "#fafaf9",
  /** Primary ink. Slightly warm, never pure black. */
  ink: "#0a0a0a",
  /** Accent — the moment of surprise. Single signature color, used sparingly. */
  accent: "#ff4d00",
  /** Selection color (falls back to accent at 20% opacity). */
  selection: "rgba(255, 77, 0, 0.24)",

  // Functional tokens layered on top of the base.
  textPrimary: "#0a0a0a",
  textSecondary: "rgba(10, 10, 10, 0.62)",
  textTertiary: "rgba(10, 10, 10, 0.38)",
  surface: "#fafaf9",
  surfaceRaised: "#ffffff",
  border: "rgba(10, 10, 10, 0.10)",
  borderStrong: "rgba(10, 10, 10, 0.22)",
} as const;

export const colorDark = {
  /** Dark paper derived from the accent hue, not pure black. */
  paper: "#0e0d0c",
  /** Light ink, slightly warm. */
  ink: "#f4f2ee",
  accent: "#ff5a1f",
  selection: "rgba(255, 90, 31, 0.32)",

  textPrimary: "#f4f2ee",
  textSecondary: "rgba(244, 242, 238, 0.64)",
  textTertiary: "rgba(244, 242, 238, 0.40)",
  surface: "#0e0d0c",
  surfaceRaised: "#1a1816",
  border: "rgba(244, 242, 238, 0.10)",
  borderStrong: "rgba(244, 242, 238, 0.22)",
} as const;

export type ColorTokens = typeof colorLight;

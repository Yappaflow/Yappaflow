/**
 * Typography tokens.
 *
 * Principles:
 *  - Display scale reaches viewport-filling (clamp up to 18vw).
 *  - Scale contrast between display and body is ≥ 10:1.
 *  - Negative letter-spacing on display (-0.02em to -0.05em).
 *  - Body line-height 1.5–1.7 for readability.
 *  - Never Inter/Roboto/Arial as the primary display typeface.
 *
 * The library ships with a free premium default stack (Space Grotesk for
 * sans display, Instrument Serif for editorial). Consumers can override any
 * slot by redefining the CSS custom properties in styles/tokens.css.
 */

export const fontStacks = {
  display:
    '"Neue Machina", "Space Grotesk", ui-sans-serif, system-ui, -apple-system, sans-serif',
  editorial:
    '"Instrument Serif", "GT Sectra", ui-serif, Georgia, serif',
  body:
    '"Inter Tight", "Space Grotesk", ui-sans-serif, system-ui, -apple-system, sans-serif',
  mono:
    '"JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
} as const;

/**
 * Fluid type scale.
 *
 * Each entry is a CSS clamp() producing size that grows with the viewport.
 * The formula: clamp(min, vw-based preferred, max).
 *
 * Display tokens hit viewport-filling at large widths (the gasping-moment
 * requirement from top-design).
 */
export const typeScale = {
  // Display — headlines, heroes. Use Display component.
  displayXl: "clamp(4.5rem, 16vw, 18rem)",   // hero / statement
  displayLg: "clamp(3.25rem, 10vw, 10rem)",  // primary headlines
  displayMd: "clamp(2.5rem, 6vw, 6rem)",     // section headlines
  displaySm: "clamp(1.875rem, 4vw, 3.5rem)", // sub-headlines

  // Body — Body component.
  bodyLg: "clamp(1.125rem, 1.1vw, 1.375rem)",
  bodyMd: "1rem",
  bodySm: "0.875rem",

  // Editorial — long-form prose.
  editorialLg: "clamp(1.5rem, 2vw, 2.25rem)",
  editorialMd: "clamp(1.125rem, 1.4vw, 1.5rem)",

  // Eyebrow / uppercase labels.
  eyebrow: "0.75rem",

  // Mono.
  mono: "0.875rem",
} as const;

export const fontWeights = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const letterSpacing = {
  /** Display — tight, architectural. */
  displayTight: "-0.04em",
  displayNormal: "-0.02em",
  /** Body — natural. */
  body: "0",
  /** Uppercase eyebrows — wide. */
  eyebrow: "0.12em",
} as const;

export const lineHeights = {
  displayTight: 0.92,
  displayNormal: 1.02,
  body: 1.6,
  editorial: 1.5,
} as const;

/** Measure (max characters per line) for reading comfort. */
export const measure = {
  intimate: "45ch",
  reading: "62ch",
  wide: "75ch",
} as const;

export type TypeScaleKey = keyof typeof typeScale;

/**
 * Spacing tokens.
 *
 * Non-linear scale so amateur "equal everywhere" rhythm is impossible.
 * Named tokens map to section-level rhythm so the Shell layer can
 * talk about spacing in gallery terms (gutter / breath / room / hall).
 */

export const spacing = {
  "0": "0",
  "1": "0.25rem", // 4px
  "2": "0.5rem",  // 8px
  "3": "0.75rem", // 12px
  "4": "1rem",    // 16px
  "5": "1.5rem",  // 24px
  "6": "2rem",    // 32px
  "7": "3rem",    // 48px
  "8": "4rem",    // 64px
  "9": "6rem",    // 96px
  "10": "8rem",   // 128px
  "11": "12rem",  // 192px
  "12": "16rem",  // 256px
} as const;

/**
 * Named vertical rhythm for sections.
 * The Exhibit component picks one of these based on its `rhythm` prop.
 */
export const rhythm = {
  /** Tight sections — dense content blocks. */
  gutter: "clamp(2rem, 4vw, 4rem)",
  /** Default breathing between sections. */
  breath: "clamp(4rem, 8vw, 8rem)",
  /** Generous — signature moments, standalone exhibits. */
  room: "clamp(6rem, 12vw, 12rem)",
  /** Grand — hero-to-first-section, or climactic moments. */
  hall: "clamp(8rem, 16vw, 16rem)",
} as const;

/** Horizontal inset for the gallery canvas. Asymmetric-aware. */
export const inset = {
  edge: "clamp(1rem, 4vw, 3rem)",
  frame: "clamp(1.5rem, 8vw, 6rem)",
  /** The signature 1/12 offset used to break a 12-col grid on purpose. */
  offset: "8.333%",
} as const;

export type SpacingKey = keyof typeof spacing;
export type RhythmKey = keyof typeof rhythm;

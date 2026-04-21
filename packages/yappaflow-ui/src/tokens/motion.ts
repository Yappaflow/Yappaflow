/**
 * Motion tokens — the easing and timing contract.
 *
 * CRITICAL: these are the ONLY easings permitted in the library.
 * The top-design system bans `ease`, `linear`, `ease-in`, `ease-out`.
 * Components and hooks must reference these by semantic name, never by
 * raw cubic-bezier values.
 *
 * GSAP takes arrays or named curves. We also export the CustomEase-ready
 * string form for convenience.
 */

export const easings = {
  /** Default for most reveals — strong deceleration, cinematic settle. */
  expoOut: [0.16, 1, 0.3, 1] as const,
  /** Quicker, snappier — interactions and micro-responses. */
  quartOut: [0.25, 1, 0.5, 1] as const,
  /** Symmetric — page transitions, pinned story beats. */
  expoInOut: [0.87, 0, 0.13, 1] as const,
} as const;

export const easingsCss = {
  expoOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  quartOut: "cubic-bezier(0.25, 1, 0.5, 1)",
  expoInOut: "cubic-bezier(0.87, 0, 0.13, 1)",
} as const;

/** GSAP-compatible easing strings built via the CustomEase registration. */
export const easingsGsap = {
  expoOut: "yf-expo-out",
  quartOut: "yf-quart-out",
  expoInOut: "yf-expo-in-out",
} as const;

export const durations = {
  /** Structure entry — 0–200ms. Page shell, background. */
  structure: 0.2,
  /** Primary content — 200–600ms. Headlines, heroes. */
  primary: 0.6,
  /** Secondary content — 400–900ms. Subtext, CTAs. */
  secondary: 0.9,
  /** Hard maximum for any single sequence. */
  sequence: 1.2,
} as const;

export const staggers = {
  /** Text reveals — 40–80ms. */
  text: 0.06,
  /** Default stagger — 60–100ms. */
  default: 0.08,
  /** Section-level — 100–160ms. */
  section: 0.14,
} as const;

/**
 * Choreography presets — named timelines the Reveal wrapper can apply.
 * Each corresponds to a position in the page-load score (see top-design §3).
 */
export const choreography = {
  structure: { delay: 0, duration: durations.structure, ease: easings.quartOut },
  primary:   { delay: 0.2, duration: durations.primary,   ease: easings.expoOut },
  secondary: { delay: 0.4, duration: durations.secondary, ease: easings.expoOut },
  cta:       { delay: 0.6, duration: durations.secondary, ease: easings.expoOut },
} as const;

export type EasingName = keyof typeof easings;
export type DurationName = keyof typeof durations;
export type StaggerName = keyof typeof staggers;
export type ChoreographyName = keyof typeof choreography;

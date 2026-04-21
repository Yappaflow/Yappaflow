/**
 * Grid tokens.
 *
 * 12-column canonical grid. The Spread/Frame primitives use these.
 * Breakpoints are deliberately few — desktop / tablet / mobile only.
 */

export const breakpoints = {
  sm: "640px",
  md: "900px",
  lg: "1200px",
  xl: "1600px",
} as const;

export const grid = {
  columns: {
    mobile: 4,
    tablet: 8,
    desktop: 12,
  },
  maxWidth: "1440px",
  gutter: {
    mobile: "1rem",
    tablet: "1.5rem",
    desktop: "2rem",
  },
} as const;

export type BreakpointKey = keyof typeof breakpoints;

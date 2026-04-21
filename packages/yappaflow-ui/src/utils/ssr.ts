/**
 * SSR guard utilities.
 * The motion layer is client-only — these helpers keep it safe.
 */

export const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

export const prefersReducedMotion = (): boolean => {
  if (!isBrowser) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

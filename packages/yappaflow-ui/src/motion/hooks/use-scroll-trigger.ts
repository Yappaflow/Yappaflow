"use client";

import { useEffect, type RefObject } from "react";
import { bootMotion, getGsap, getScrollTrigger } from "../engine.js";
import { useMotion } from "../provider.js";
import { durations, easingsGsap } from "../../tokens/motion.js";

export type ScrollSectionMode = "reveal" | "pinned-story" | "parallax-subtle";

export interface UseScrollTriggerOptions {
  mode?: ScrollSectionMode;
  /** Start position — defaults to "top 80%" for reveals. */
  start?: string;
  /** End position — defaults vary by mode. */
  end?: string;
  /** Scrub progress instead of firing once. */
  scrub?: boolean | number;
}

/**
 * Thin, typed wrapper over ScrollTrigger.
 *
 * Auto-disposes on unmount. Gates on reduced motion. Accepts only
 * library-sanctioned modes — no raw GSAP timelines.
 */
export function useScrollTrigger<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: UseScrollTriggerOptions = {},
): void {
  const { mode = "reveal", start, end, scrub = false } = options;
  const { reducedMotion } = useMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion) return;

    let trigger: ReturnType<NonNullable<ReturnType<typeof getScrollTrigger>>["create"]> | null = null;
    let cancelled = false;

    void (async (): Promise<void> => {
      await bootMotion();
      if (cancelled) return;
      const gsap = getGsap();
      const ScrollTrigger = getScrollTrigger();
      if (!gsap || !ScrollTrigger) return;

      switch (mode) {
        case "reveal": {
          gsap.set(el, { opacity: 0, y: 40, force3D: true });
          trigger = ScrollTrigger.create({
            trigger: el,
            start: start ?? "top 85%",
            once: true,
            onEnter: () => {
              gsap.to(el, {
                opacity: 1,
                y: 0,
                duration: durations.primary,
                ease: easingsGsap.expoOut,
              });
            },
          });
          break;
        }

        case "pinned-story": {
          trigger = ScrollTrigger.create({
            trigger: el,
            start: start ?? "top top",
            end: end ?? "+=100%",
            pin: true,
            pinSpacing: true,
            scrub: scrub === false ? 1 : scrub,
          });
          break;
        }

        case "parallax-subtle": {
          // Only decorative elements — subtle vertical drift.
          trigger = ScrollTrigger.create({
            trigger: el,
            start: start ?? "top bottom",
            end: end ?? "bottom top",
            scrub: scrub === false ? 0.6 : scrub,
            onUpdate: (self) => {
              const shift = (self.progress - 0.5) * -30; // max ±15px
              gsap.set(el, { yPercent: shift });
            },
          });
          break;
        }
      }
    })();

    return (): void => {
      cancelled = true;
      trigger?.kill();
    };
  }, [ref, reducedMotion, mode, start, end, scrub]);
}

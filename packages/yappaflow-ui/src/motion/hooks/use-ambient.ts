"use client";

import { useEffect, type RefObject } from "react";
import { bootMotion, getGsap } from "../engine.js";
import { useMotion } from "../provider.js";
import { easingsGsap } from "../../tokens/motion.js";

export type AmbientPattern = "float" | "breathe" | "drift" | "grain";

export interface UseAmbientOptions {
  pattern?: AmbientPattern;
  /** Visual intensity: low / medium / high. Defaults to "low". */
  intensity?: "low" | "medium" | "high";
}

/**
 * useAmbient — ultra-slow background motion for AmbientLayer components.
 *
 * Never animates anything other than transform/opacity/filter. Each pattern
 * is a looped GSAP timeline that runs for the element's lifetime.
 *
 * Disabled under reduced motion.
 */
export function useAmbient<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: UseAmbientOptions = {},
): void {
  const { pattern = "breathe", intensity = "low" } = options;
  const { reducedMotion } = useMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion) return;

    let cancelled = false;
    let tl: gsap.core.Timeline | null = null;

    void (async (): Promise<void> => {
      await bootMotion();
      if (cancelled) return;
      const gsap = getGsap();
      if (!gsap) return;

      const factor = intensity === "low" ? 0.5 : intensity === "high" ? 1.4 : 1;

      switch (pattern) {
        case "float":
          tl = gsap.timeline({ repeat: -1, yoyo: true });
          tl.to(el, {
            y: 12 * factor,
            x: 8 * factor,
            duration: 6,
            ease: easingsGsap.expoInOut,
          });
          break;

        case "breathe":
          tl = gsap.timeline({ repeat: -1, yoyo: true });
          tl.fromTo(
            el,
            { scale: 0.985 },
            { scale: 1, duration: 5, ease: easingsGsap.expoInOut },
          );
          break;

        case "drift":
          tl = gsap.timeline({ repeat: -1, yoyo: true });
          tl.to(el, {
            backgroundPosition: `${20 * factor}% ${-15 * factor}%`,
            duration: 14,
            ease: easingsGsap.expoInOut,
          });
          break;

        case "grain":
          // Cheap grain shimmer — opacity-only, never filter.
          tl = gsap.timeline({ repeat: -1, yoyo: true });
          tl.to(el, {
            opacity: 0.85,
            duration: 1.8,
            ease: easingsGsap.expoInOut,
          });
          break;
      }
    })();

    return (): void => {
      cancelled = true;
      tl?.kill();
    };
  }, [ref, reducedMotion, pattern, intensity]);
}

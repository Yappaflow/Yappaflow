"use client";

import { useEffect, type RefObject } from "react";
import { bootMotion, getGsap } from "../engine.js";
import { useMotion } from "../provider.js";
import { easingsGsap } from "../../tokens/motion.js";

export interface UseMagneticOptions {
  /** 0–1. How far the element follows the cursor. Default 0.35. */
  strength?: number;
  /** Radius in px from element center where effect activates. Default 120. */
  radius?: number;
}

/**
 * useMagnetic — attach a cursor-follow hover to an element (usually a CTA).
 *
 * Tasteful by default: strength 0.35, radius 120px. Disabled under reduced
 * motion and on touch devices.
 */
export function useMagnetic<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: UseMagneticOptions = {},
): void {
  const { strength = 0.35, radius = 120 } = options;
  const { reducedMotion } = useMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion) return;
    if (typeof window === "undefined") return;
    // Touch devices don't have a hover cursor — skip.
    if (!window.matchMedia("(hover: hover)").matches) return;

    let cancelled = false;
    let onMove: ((e: MouseEvent) => void) | null = null;
    let onLeave: (() => void) | null = null;

    void (async (): Promise<void> => {
      await bootMotion();
      if (cancelled) return;
      const gsap = getGsap();
      if (!gsap) return;

      onMove = (e: MouseEvent): void => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > radius) return;

        gsap.to(el, {
          x: dx * strength,
          y: dy * strength,
          duration: 0.4,
          ease: easingsGsap.quartOut,
        });
      };

      onLeave = (): void => {
        gsap.to(el, {
          x: 0,
          y: 0,
          duration: 0.6,
          ease: easingsGsap.expoOut,
        });
      };

      el.addEventListener("mousemove", onMove);
      el.addEventListener("mouseleave", onLeave);
    })();

    return (): void => {
      cancelled = true;
      if (onMove) el.removeEventListener("mousemove", onMove);
      if (onLeave) el.removeEventListener("mouseleave", onLeave);
    };
  }, [ref, reducedMotion, strength, radius]);
}

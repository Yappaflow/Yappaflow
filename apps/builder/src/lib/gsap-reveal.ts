"use client";

import gsap from "gsap";
import type { AnimationPreset } from "@yappaflow/types";

/**
 * Minimal GSAP reveal runtime for the builder canvas.
 *
 * Reads `[data-yf-anim]` off every rendered section and plays the matching
 * tween when the element mounts or the attribute value changes. Handles the
 * six mount-based presets; the scroll-triggered ones (parallax-y, scroll-pin,
 * scroll-scrub) no-op here because ScrollTrigger-driven behavior is better
 * showcased at export-time on the agency's production site, not inside a
 * builder canvas where the user is scrolling the editor chrome.
 *
 * This is a DEV runtime — Phase 11 ships the production runtime to exported
 * sites. Same attribute vocabulary (`data-yf-anim`), different host.
 *
 *   fade-in             opacity 0 → 1
 *   slide-up            y +40 + opacity 0 → 0 + 1
 *   slide-left          x -40 + opacity 0 → 0 + 1
 *   slide-right         x +40 + opacity 0 → 0 + 1
 *   scale-in            scale 0.92 + opacity 0 → 1 + 1
 *   reveal-mask         clip-path wipe bottom → top
 *   stagger-children    each child fades/slides with 0.08s offset
 *   marquee / *scroll*  no-op in builder (ScrollTrigger domain)
 */

const DURATION = 0.7;
const EASE = "power3.out";
const STAGGER = 0.08;

/**
 * Apply a GSAP tween to the given element for the chosen preset. Returns a
 * cleanup function that kills in-flight tweens + resets inline styles so
 * the DOM doesn't end up half-animated if the preset changes mid-flight.
 */
export function playReveal(el: HTMLElement, preset: AnimationPreset): () => void {
  // Reset in case a previous tween set inline styles.
  gsap.set(el, { clearProps: "all" });

  switch (preset) {
    case "fade-in": {
      const tween = gsap.fromTo(
        el,
        { opacity: 0 },
        { opacity: 1, duration: DURATION, ease: EASE },
      );
      return () => tween.kill();
    }
    case "slide-up": {
      const tween = gsap.fromTo(
        el,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: DURATION, ease: EASE },
      );
      return () => tween.kill();
    }
    case "slide-left": {
      const tween = gsap.fromTo(
        el,
        { x: -40, opacity: 0 },
        { x: 0, opacity: 1, duration: DURATION, ease: EASE },
      );
      return () => tween.kill();
    }
    case "slide-right": {
      const tween = gsap.fromTo(
        el,
        { x: 40, opacity: 0 },
        { x: 0, opacity: 1, duration: DURATION, ease: EASE },
      );
      return () => tween.kill();
    }
    case "scale-in": {
      const tween = gsap.fromTo(
        el,
        { scale: 0.92, opacity: 0, transformOrigin: "50% 50%" },
        { scale: 1, opacity: 1, duration: DURATION, ease: EASE },
      );
      return () => tween.kill();
    }
    case "reveal-mask": {
      const tween = gsap.fromTo(
        el,
        { clipPath: "inset(100% 0% 0% 0%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: DURATION * 1.2,
          ease: EASE,
        },
      );
      return () => tween.kill();
    }
    case "stagger-children": {
      // One level of children — works for most section layouts.
      const children = Array.from(el.children) as HTMLElement[];
      if (children.length === 0) {
        const tween = gsap.fromTo(
          el,
          { opacity: 0 },
          { opacity: 1, duration: DURATION, ease: EASE },
        );
        return () => tween.kill();
      }
      const tween = gsap.fromTo(
        children,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: DURATION,
          stagger: STAGGER,
          ease: EASE,
        },
      );
      return () => tween.kill();
    }
    // Scroll-linked and continuous presets — no-op in the builder canvas
    // because the user is scrolling the editor, not the site. Phase 11's
    // export-side runtime handles these.
    case "parallax-y":
    case "marquee":
    case "cursor-follow":
    case "scroll-pin":
    case "scroll-scrub":
    case "none":
    default:
      return () => {};
  }
}

/**
 * Scan the given container for [data-yf-anim] elements and play each
 * preset once. Returns an array of cleanup functions.
 */
export function playAllInContainer(container: HTMLElement): Array<() => void> {
  const nodes = container.querySelectorAll<HTMLElement>("[data-yf-anim]");
  const cleanups: Array<() => void> = [];
  nodes.forEach((node) => {
    const preset = node.getAttribute("data-yf-anim") as AnimationPreset | null;
    if (!preset) return;
    cleanups.push(playReveal(node, preset));
  });
  return cleanups;
}

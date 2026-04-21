"use client";

import { useEffect, useLayoutEffect, type RefObject } from "react";
import { isBrowser } from "../../utils/ssr.js";

// useLayoutEffect warns on the server; alias to useEffect in SSR so dev
// stays quiet but client-side still runs pre-paint.
const useIsoLayoutEffect = isBrowser ? useLayoutEffect : useEffect;
import { getGsap, bootMotion } from "../engine.js";
import { useMotion } from "../provider.js";
import { durations, staggers, easingsGsap } from "../../tokens/motion.js";

export type RevealVariant =
  | "fade-translate"
  | "text-lines"
  | "text-words"
  | "mask-up"
  | "stagger-children";

export interface UseRevealOptions {
  /** Variant of reveal animation. */
  variant?: RevealVariant;
  /** Delay in seconds before the animation starts. */
  delay?: number;
  /** Duration override. Defaults to durations.primary. */
  duration?: number;
  /** Stagger override (text variants only). Defaults to staggers.text. */
  stagger?: number;
  /** Easing override. Must come from easingsGsap to stay in-system. */
  ease?: (typeof easingsGsap)[keyof typeof easingsGsap];
  /** Whether to run immediately (mount) or wait for viewport entry. */
  trigger?: "mount" | "in-view";
}

/**
 * useReveal — the workhorse entry animation hook.
 *
 * Consumers never pass raw easing strings — only named tokens.
 * On reduced motion, animations are instantly completed (content visible).
 *
 * For text variants the element's text content is wrapped in per-line or
 * per-word spans before animating. We implement a lightweight splitter
 * locally so we don't require the SplitText Club plugin for v0.1.
 */
export function useReveal<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: UseRevealOptions = {},
): void {
  const {
    variant = "fade-translate",
    delay = 0,
    duration = durations.primary,
    stagger = staggers.text,
    ease = easingsGsap.expoOut,
    trigger = "mount",
  } = options;

  const { reducedMotion } = useMotion();

  // Pre-paint hide for text variants — prevents the "flash of visible text
  // in the wrong size" between first paint and when GSAP boots. useLayoutEffect
  // fires synchronously after commit and before paint, so the user never sees
  // the unhidden state on the first frame. Reduced-motion users skip this.
  useIsoLayoutEffect(() => {
    if (reducedMotion) return;
    const host = ref.current;
    if (!host) return;
    const isTextVariant = variant === "text-lines" || variant === "text-words";
    if (!isTextVariant) return;
    const target = host.firstElementChild as HTMLElement | null;
    if (!target) return;
    target.style.opacity = "0";
    target.style.willChange = "opacity, transform";
  }, [ref, reducedMotion, variant]);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    // For text variants, splitIntoSpans rewrites the target element's entire
    // innerHTML. If the caller wraps a typographic primitive (e.g. <Display>
    // renders an <h1>) inside a <Reveal>, splitting on the wrapper would
    // destroy the h1 and its display-sized styling, causing the text to
    // "collapse" to body-size mid-animation. Target the first element child
    // instead — that's the real typography element.
    const isTextVariant = variant === "text-lines" || variant === "text-words";
    const textTarget: HTMLElement =
      (isTextVariant && (host.firstElementChild as HTMLElement | null)) || host;
    const el: HTMLElement = isTextVariant ? textTarget : host;

    // Reduced motion: materialize to the end-state instantly and bail.
    if (reducedMotion) {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.querySelectorAll<HTMLElement>("[data-reveal-child]").forEach((child) => {
        child.style.opacity = "1";
        child.style.transform = "none";
      });
      return;
    }

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void (async (): Promise<void> => {
      await bootMotion();
      if (cancelled) return;
      const gsap = getGsap();
      if (!gsap) return;

      const runMount = (): gsap.core.Timeline | void => {
        const tl = gsap.timeline({ delay, defaults: { ease, duration } });

        // Text variants: the pre-paint layout effect hides `el` (opacity: 0)
        // so the user never sees the unsplit headline in the wrong position.
        // Now that we're about to split + animate, make the host visible again;
        // inner spans are the elements that get animated.
        if (isTextVariant) {
          el.style.opacity = "";
        }

        switch (variant) {
          case "fade-translate":
            gsap.set(el, { opacity: 0, y: 24, force3D: true });
            tl.to(el, { opacity: 1, y: 0 });
            break;

          case "text-lines": {
            const lines = splitIntoSpans(el, "line");
            gsap.set(lines, { yPercent: 110, opacity: 0, force3D: true });
            tl.to(lines, { yPercent: 0, opacity: 1, stagger });
            break;
          }

          case "text-words": {
            const words = splitIntoSpans(el, "word");
            gsap.set(words, { yPercent: 60, opacity: 0, force3D: true });
            tl.to(words, { yPercent: 0, opacity: 1, stagger });
            break;
          }

          case "mask-up":
            gsap.set(el, {
              clipPath: "inset(100% 0 0 0)",
              opacity: 1,
              force3D: true,
            });
            tl.to(el, {
              clipPath: "inset(0% 0 0 0)",
              duration: duration * 1.1,
            });
            break;

          case "stagger-children": {
            const children = el.querySelectorAll<HTMLElement>("[data-reveal-child]");
            if (children.length === 0) break;
            gsap.set(children, { opacity: 0, y: 32, force3D: true });
            tl.to(children, { opacity: 1, y: 0, stagger: staggers.default });
            break;
          }
        }

        return tl;
      };

      if (trigger === "mount") {
        const tl = runMount();
        cleanup = (): void => {
          tl?.kill();
        };
        return;
      }

      // in-view: viewport-entry trigger via IntersectionObserver.
      // We keep this light — ScrollSection handles complex scroll choreography.
      let fired = false;
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!fired && entry.isIntersecting) {
              fired = true;
              runMount();
              io.disconnect();
            }
          });
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
      );
      io.observe(el);

      cleanup = (): void => {
        io.disconnect();
      };
    })();

    return (): void => {
      cancelled = true;
      cleanup?.();
    };
  }, [ref, reducedMotion, variant, delay, duration, stagger, ease, trigger]);
}

/**
 * Minimal line/word splitter. Replaces the element's text content with
 * per-unit spans wrapped for overflow-hidden line reveals.
 *
 * Idempotent — if the element is already split, existing spans are returned.
 */
function splitIntoSpans(el: HTMLElement, unit: "line" | "word"): HTMLElement[] {
  // If already split, reuse.
  const existing = el.querySelectorAll<HTMLElement>(`[data-reveal-${unit}]`);
  if (existing.length > 0) return Array.from(existing);

  const text = el.textContent ?? "";
  el.textContent = "";

  if (unit === "word") {
    const spans: HTMLElement[] = [];
    text.split(/(\s+)/).forEach((chunk) => {
      if (chunk.trim() === "") {
        el.appendChild(document.createTextNode(chunk));
        return;
      }
      const outer = document.createElement("span");
      outer.style.display = "inline-block";
      outer.style.overflow = "hidden";
      outer.style.verticalAlign = "top";
      const inner = document.createElement("span");
      inner.setAttribute("data-reveal-word", "");
      inner.style.display = "inline-block";
      inner.style.willChange = "transform, opacity";
      inner.textContent = chunk;
      outer.appendChild(inner);
      el.appendChild(outer);
      spans.push(inner);
    });
    return spans;
  }

  // Line mode — naive but effective: treat explicit <br> or newlines as
  // line breaks; otherwise, let the browser break and use wrapped-word
  // reveal as a fallback. For headlines we expect content authors to supply
  // manual <br>s or use the SplitHeadline primitive later.
  const parts = text.split(/\r?\n|<br\s*\/?>/);
  const spans: HTMLElement[] = [];
  parts.forEach((line, i) => {
    const outer = document.createElement("span");
    outer.style.display = "block";
    outer.style.overflow = "hidden";
    const inner = document.createElement("span");
    inner.setAttribute("data-reveal-line", "");
    inner.style.display = "block";
    inner.style.willChange = "transform, opacity";
    inner.textContent = line;
    outer.appendChild(inner);
    el.appendChild(outer);
    if (i < parts.length - 1) el.appendChild(document.createElement("br"));
    spans.push(inner);
  });
  return spans;
}

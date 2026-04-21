"use client";

import { useEffect, useRef, useState } from "react";
import { bootMotion, getGsap } from "../engine.js";
import { useMotion } from "../provider.js";
import { easingsGsap } from "../../tokens/motion.js";
import { isBrowser } from "../../utils/ssr.js";

export interface CursorProps {
  variant?: "minimal" | "framed" | "mark";
  /** CSS selector for elements the cursor should enlarge over. */
  interactiveSelector?: string;
}

/**
 * <Cursor> — opt-in custom cursor overlay.
 *
 * Off by default. GalleryShell renders it when `cursor` prop is set.
 * Disabled on touch devices and under reduced motion.
 */
export function Cursor({
  variant = "minimal",
  interactiveSelector = "a, button, [role='button'], [data-magnetic]",
}: CursorProps = {}) {
  const { reducedMotion } = useMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  // Only enable for hover-capable pointers.
  useEffect(() => {
    if (!isBrowser) return;
    setEnabled(window.matchMedia("(hover: hover)").matches);
  }, []);

  useEffect(() => {
    if (!enabled || reducedMotion) return;
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    let onMove: ((e: MouseEvent) => void) | null = null;
    let onDown: (() => void) | null = null;
    let onUp: (() => void) | null = null;
    let onOver: ((e: MouseEvent) => void) | null = null;
    let onOut: (() => void) | null = null;

    void (async (): Promise<void> => {
      await bootMotion();
      if (cancelled) return;
      const gsap = getGsap();
      if (!gsap) return;

      gsap.set(el, { xPercent: -50, yPercent: -50 });
      const move = gsap.quickTo(el, "x", { duration: 0.35, ease: easingsGsap.quartOut });
      const moveY = gsap.quickTo(el, "y", { duration: 0.35, ease: easingsGsap.quartOut });

      onMove = (e: MouseEvent): void => {
        move(e.clientX);
        moveY(e.clientY);
      };
      onDown = (): void => {
        gsap.to(el, { scale: 0.8, duration: 0.2, ease: easingsGsap.quartOut });
      };
      onUp = (): void => {
        gsap.to(el, { scale: 1, duration: 0.3, ease: easingsGsap.expoOut });
      };
      onOver = (e: MouseEvent): void => {
        const target = e.target as HTMLElement | null;
        if (target?.closest(interactiveSelector)) {
          gsap.to(el, { scale: 1.8, duration: 0.4, ease: easingsGsap.expoOut });
        }
      };
      onOut = (): void => {
        gsap.to(el, { scale: 1, duration: 0.4, ease: easingsGsap.expoOut });
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mousedown", onDown);
      window.addEventListener("mouseup", onUp);
      document.addEventListener("mouseover", onOver);
      document.addEventListener("mouseout", onOut);
    })();

    return (): void => {
      cancelled = true;
      if (onMove) window.removeEventListener("mousemove", onMove);
      if (onDown) window.removeEventListener("mousedown", onDown);
      if (onUp) window.removeEventListener("mouseup", onUp);
      if (onOver) document.removeEventListener("mouseover", onOver);
      if (onOut) document.removeEventListener("mouseout", onOut);
    };
  }, [enabled, reducedMotion, interactiveSelector]);

  if (!enabled || reducedMotion) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-cursor-variant={variant}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: variant === "mark" ? 10 : 20,
        height: variant === "mark" ? 10 : 20,
        borderRadius: variant === "framed" ? 4 : 9999,
        background: variant === "mark" ? "var(--ff-accent)" : "transparent",
        border: variant === "mark" ? "none" : "1.5px solid var(--ff-ink)",
        mixBlendMode: variant === "mark" ? "normal" : "difference",
        pointerEvents: "none",
        zIndex: "var(--ff-z-cursor, 90)" as unknown as number,
        willChange: "transform",
      }}
    />
  );
}

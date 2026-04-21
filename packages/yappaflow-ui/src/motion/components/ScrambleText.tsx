"use client";

import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ElementType,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "../../utils/cn.js";
import { bootMotion, getGsap } from "../engine.js";
import { useMotion } from "../provider.js";
import { durations } from "../../tokens/motion.js";
import { isBrowser } from "../../utils/ssr.js";

const useIsoLayoutEffect = isBrowser ? useLayoutEffect : useEffect;

/** Default scramble pool — uppercase + a handful of symbols for GSAP-like cadence. */
const DEFAULT_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%*+-";

export interface ScrambleTextProps {
  /** The final string to settle on. */
  text: string;
  /** Optional render element (defaults to span). */
  as?: ElementType;
  /** Total duration of the scramble sweep, in seconds. */
  duration?: number;
  /** Additional delay before starting, in seconds. */
  delay?: number;
  /** Per-character stagger, in seconds. Controls how long the sweep lasts. */
  stagger?: number;
  /** Pool of random characters cycled during scramble. */
  chars?: string;
  /** Trigger: animate on mount, or wait for viewport entry. */
  trigger?: "mount" | "in-view";
  /** Accessible label — defaults to `text`. */
  ariaLabel?: string;
  /** If true, replay the animation whenever `text` changes. */
  replayOnChange?: boolean;
  /** Optional ReactNode rendered after the scrambled text (e.g. a cursor). */
  after?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * <ScrambleText> — per-character scramble-and-settle animation.
 *
 * Each character slot cycles through random chars from the pool, then locks
 * to its target at a staggered reveal time. Whitespace is preserved
 * literally so line breaks survive the scramble.
 *
 * Respects `prefers-reduced-motion`: the final string is rendered instantly.
 *
 * SSR-safe: the first render on both server and client shows the final
 * `text` string so hydration doesn't mismatch; the scramble kicks in once
 * the engine boots on the client.
 */
export const ScrambleText = forwardRef<HTMLElement, ScrambleTextProps>(
  function ScrambleText(
    {
      text,
      as: Tag = "span",
      duration = durations.primary + 0.4,
      delay = 0,
      stagger = 0.035,
      chars = DEFAULT_POOL,
      trigger = "mount",
      ariaLabel,
      replayOnChange = true,
      after,
      className,
      style,
    },
    forwardedRef,
  ) {
    const hostRef = useRef<HTMLElement | null>(null);
    const [mounted, setMounted] = useState(false);
    const { reducedMotion } = useMotion();

    // Expose to parent refs.
    useIsoLayoutEffect(() => {
      if (!forwardedRef) return;
      if (typeof forwardedRef === "function") {
        forwardedRef(hostRef.current);
      } else {
        (forwardedRef as { current: HTMLElement | null }).current = hostRef.current;
      }
    });

    useEffect(() => {
      setMounted(true);
    }, []);

    useEffect(() => {
      if (!mounted) return;
      const host = hostRef.current;
      if (!host) return;

      // Reduced motion / server fallback: render the final string plain.
      if (reducedMotion) {
        host.textContent = text;
        return;
      }

      let cancelled = false;
      let cleanup: (() => void) | undefined;

      const start = (): void => {
        // Build per-character spans. Whitespace stays as plain text nodes so
        // CSS word-wrap behaves naturally and we don't scramble spaces.
        host.textContent = "";
        const charSlots: { el: HTMLSpanElement; target: string; revealAt: number }[] = [];
        const totalChars = Array.from(text).filter((c) => c.trim() !== "").length;

        let charIndex = 0;
        for (const ch of Array.from(text)) {
          if (ch === "\n") {
            host.appendChild(document.createElement("br"));
            continue;
          }
          if (ch.trim() === "") {
            host.appendChild(document.createTextNode(ch));
            continue;
          }
          const span = document.createElement("span");
          span.setAttribute("data-scramble-char", "");
          span.style.display = "inline-block";
          span.textContent = randomChar(chars);
          host.appendChild(span);
          // Each slot reveals at (delay + stagger * its index), with the
          // final char landing just before `duration`.
          const revealAt = delay + Math.min(stagger * charIndex, duration - 0.15);
          charSlots.push({ el: span, target: ch, revealAt });
          charIndex += 1;
        }

        if (totalChars === 0) {
          host.textContent = text;
          return;
        }

        void (async (): Promise<void> => {
          await bootMotion();
          if (cancelled) return;
          const gsap = getGsap();
          if (!gsap) {
            // Fall back to plain text if GSAP isn't around.
            host.textContent = text;
            return;
          }

          const state = { t: 0 };
          const tl = gsap.to(state, {
            t: duration + stagger * totalChars,
            duration: duration + stagger * totalChars,
            ease: "none",
            onUpdate: () => {
              for (const slot of charSlots) {
                if (slot.el.dataset.done === "1") continue;
                if (state.t >= slot.revealAt) {
                  slot.el.textContent = slot.target;
                  slot.el.dataset.done = "1";
                  slot.el.classList.add("ff-scramble-char--settled");
                } else {
                  slot.el.textContent = randomChar(chars);
                }
              }
            },
            onComplete: () => {
              // Guarantee the final string is exactly the target.
              for (const slot of charSlots) {
                slot.el.textContent = slot.target;
                slot.el.dataset.done = "1";
              }
            },
          });

          cleanup = (): void => {
            tl.kill();
          };
        })();
      };

      if (trigger === "mount") {
        start();
      } else {
        let fired = false;
        const io = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!fired && entry.isIntersecting) {
                fired = true;
                start();
                io.disconnect();
              }
            }
          },
          { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
        );
        io.observe(host);
        cleanup = (): void => {
          io.disconnect();
        };
      }

      return (): void => {
        cancelled = true;
        cleanup?.();
      };
      // replayOnChange toggles whether `text` participates in the deps array.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      mounted,
      reducedMotion,
      chars,
      duration,
      delay,
      stagger,
      trigger,
      replayOnChange ? text : null,
    ]);

    const Component = Tag as ElementType;
    return (
      <Component
        ref={hostRef as never}
        className={cn("ff-scramble", className)}
        style={style}
        aria-label={ariaLabel ?? text}
      >
        {/* Initial SSR + pre-hydration render shows the final text so the
         * page is readable before JS boots. Once the effect runs, the
         * textContent is rewritten into per-character spans and scrambled. */}
        {text}
        {after}
      </Component>
    );
  },
);

function randomChar(pool: string): string {
  return pool.charAt(Math.floor(Math.random() * pool.length)) || "•";
}

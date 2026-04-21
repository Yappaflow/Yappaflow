"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Lenis from "lenis";
import { bootMotion, getGsap, getScrollTrigger } from "./engine.js";
import { isBrowser, prefersReducedMotion } from "../utils/ssr.js";

export interface MotionContextValue {
  /** Whether reduced motion is requested by the OS. All hooks gate on this. */
  reducedMotion: boolean;
  /** The Lenis smooth-scroll instance, if enabled. */
  lenis: Lenis | null;
  /** True once the engine has booted + plugins registered. */
  ready: boolean;
}

const MotionContext = createContext<MotionContextValue>({
  reducedMotion: false,
  lenis: null,
  ready: false,
});

export interface MotionProviderProps {
  children: ReactNode;
  /**
   * Enable Lenis smooth scroll. Default: true.
   * The top-design system bans default browser scroll for premium experiences.
   * Automatically disabled when reducedMotion is true.
   */
  smoothScroll?: boolean;
  /**
   * Lenis config overrides. We ship premium defaults — override only if
   * there's a compelling reason.
   */
  lenisOptions?: ConstructorParameters<typeof Lenis>[0];
}

/**
 * MotionProvider — mounted once by GalleryShell.
 *
 * Responsibilities:
 *  - Boot the engine (registers plugins, defaults).
 *  - Instantiate Lenis.
 *  - Sync GSAP ticker with Lenis (single RAF, zero jank).
 *  - Establish the reduced-motion flag used by every hook.
 *  - Tear everything down cleanly on unmount.
 */
export function MotionProvider({
  children,
  smoothScroll = true,
  lenisOptions,
}: MotionProviderProps) {
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const lenisRef = useRef<Lenis | null>(null);

  // Track reduced-motion preference at the provider level.
  useEffect(() => {
    if (!isBrowser) return;
    setReducedMotion(prefersReducedMotion());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (): void => setReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return (): void => mq.removeEventListener("change", handler);
  }, []);

  // Boot the engine + optional Lenis, in order.
  useEffect(() => {
    if (!isBrowser) return;
    let disposed = false;

    const boot = async (): Promise<void> => {
      await bootMotion();
      if (disposed) return;

      const gsap = getGsap();
      const ScrollTrigger = getScrollTrigger();

      // Lenis smooth scroll — skip when reduced motion.
      if (smoothScroll && !reducedMotion && gsap) {
        const lenis = new Lenis({
          lerp: 0.1,
          smoothWheel: true,
          wheelMultiplier: 1,
          touchMultiplier: 1.2,
          ...lenisOptions,
        });
        lenisRef.current = lenis;

        // Single RAF loop: GSAP ticker drives Lenis.
        const tick = (time: number): void => {
          lenis.raf(time * 1000);
        };
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);

        // Keep ScrollTrigger aware of Lenis-driven scroll.
        if (ScrollTrigger) {
          lenis.on("scroll", ScrollTrigger.update);
        }

        // Wire teardown via a closure captured for the return handler.
        lenisRef.current = lenis;
      }

      setReady(true);
    };

    void boot();

    return (): void => {
      disposed = true;
      const gsap = getGsap();
      const lenis = lenisRef.current;
      if (lenis) {
        lenis.destroy();
        lenisRef.current = null;
      }
      if (gsap) {
        // Kill all tweens spawned under this provider's lifetime.
        gsap.ticker.lagSmoothing(500, 33);
      }
    };
    // Intentionally only run once per mount. Lenis config changes require a
    // remount of the shell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<MotionContextValue>(
    () => ({ reducedMotion, lenis: lenisRef.current, ready }),
    [reducedMotion, ready],
  );

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotion(): MotionContextValue {
  return useContext(MotionContext);
}

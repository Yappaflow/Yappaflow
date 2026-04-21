/**
 * yappaflow-ui — the Motion Engine.
 *
 * This is the ONLY module in the library that imports gsap directly.
 * Importing this file:
 *   - registers plugins (ScrollTrigger, others client-side only)
 *   - registers our three custom eases as named GSAP curves
 *   - sets library-wide defaults (duration, ease)
 *
 * It is idempotent — calling bootMotion() multiple times is safe.
 * It is SSR-safe — on the server it is a no-op.
 *
 * Downstream hooks call getGsap() / getScrollTrigger() to get a ready
 * client; they never import "gsap" themselves.
 */

import gsap from "gsap";
import { easings, durations } from "../tokens/motion.js";
import { isBrowser } from "../utils/ssr.js";

let booted = false;

/** Lazy plugin handles — filled in on boot. */
let ScrollTriggerRef: typeof import("gsap/ScrollTrigger").ScrollTrigger | null = null;

/**
 * Boot the motion system. Call once per page, ideally from MotionProvider.
 * Safe to invoke multiple times.
 */
export async function bootMotion(): Promise<void> {
  if (!isBrowser || booted) return;
  booted = true;

  // Dynamic-import plugins so SSR bundles stay clean.
  const [{ ScrollTrigger }, { CustomEase }] = await Promise.all([
    import("gsap/ScrollTrigger"),
    import("gsap/CustomEase"),
  ]);

  gsap.registerPlugin(ScrollTrigger, CustomEase);
  ScrollTriggerRef = ScrollTrigger;

  // Register our three sanctioned eases as named GSAP curves so hooks
  // can pass "yf-expo-out" etc. directly.
  CustomEase.create(
    "yf-expo-out",
    `M0,0 C${easings.expoOut[0]},${easings.expoOut[1]} ${easings.expoOut[2]},${easings.expoOut[3]} 1,1`,
  );
  CustomEase.create(
    "yf-quart-out",
    `M0,0 C${easings.quartOut[0]},${easings.quartOut[1]} ${easings.quartOut[2]},${easings.quartOut[3]} 1,1`,
  );
  CustomEase.create(
    "yf-expo-in-out",
    `M0,0 C${easings.expoInOut[0]},${easings.expoInOut[1]} ${easings.expoInOut[2]},${easings.expoInOut[3]} 1,1`,
  );

  // Library-wide defaults. Every gsap.to/from inside the library picks these
  // up unless explicitly overridden.
  gsap.defaults({
    ease: "yf-expo-out",
    duration: durations.primary,
  });

  ScrollTrigger.config({ ignoreMobileResize: true });
}

/** Accessor for the singleton GSAP instance — SSR-safe. */
export function getGsap(): typeof gsap | null {
  if (!isBrowser) return null;
  return gsap;
}

/**
 * Accessor for ScrollTrigger. Returns null on SSR or if the engine hasn't
 * finished booting yet. Hooks should gate behind this.
 */
export function getScrollTrigger(): typeof ScrollTriggerRef {
  return ScrollTriggerRef;
}

/** Whether the engine has been booted on this page. */
export function isMotionBooted(): boolean {
  return booted;
}

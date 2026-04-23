/**
 * The JS and CSS that get shipped INSIDE every HTML export as
 * `yf-animations.js` and `yf-animations.css`.
 *
 * These run on the agency's real static host — no build step, no React,
 * no bundler. Tiny-vanilla-JS reads `[data-yf-anim]` off sections, sets
 * initial states via CSS, and plays the matching GSAP tween when the
 * section scrolls into view. Uses IntersectionObserver so below-the-fold
 * animations fire naturally.
 *
 * Phase 11 can extend this with ScrollTrigger-based parallax / pin /
 * scrub. Phase 10 adapters-v2 (Shopify, Webflow) can ship the SAME
 * runtime string verbatim — same vocabulary, same behaviour.
 */

export const EXPORT_RUNTIME_JS = `// Yappaflow animation runtime.
// Plays GSAP reveal tweens for sections with [data-yf-anim]. Works on
// any static host — just include GSAP from a CDN before this script.
(function () {
  var gsap = window.gsap;
  if (!gsap) {
    console.warn("[yappaflow] GSAP not loaded — skipping animation runtime.");
    return;
  }

  var DURATION = 0.7;
  var EASE = "power3.out";
  var STAGGER = 0.08;

  function play(el, preset) {
    switch (preset) {
      case "fade-in":
        return gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: DURATION, ease: EASE });
      case "slide-up":
        return gsap.fromTo(el, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: DURATION, ease: EASE });
      case "slide-left":
        return gsap.fromTo(el, { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: DURATION, ease: EASE });
      case "slide-right":
        return gsap.fromTo(el, { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: DURATION, ease: EASE });
      case "scale-in":
        return gsap.fromTo(el, { scale: 0.92, opacity: 0, transformOrigin: "50% 50%" }, { scale: 1, opacity: 1, duration: DURATION, ease: EASE });
      case "reveal-mask":
        return gsap.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: DURATION * 1.2, ease: EASE });
      case "stagger-children": {
        var children = Array.prototype.slice.call(el.children);
        if (!children.length) return gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: DURATION, ease: EASE });
        return gsap.fromTo(children, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: DURATION, stagger: STAGGER, ease: EASE });
      }
      default:
        // parallax-y / scroll-pin / scroll-scrub / marquee / cursor-follow
        // require ScrollTrigger; we silently skip them until the
        // ScrollTrigger runtime ships. The CSS initial-state rules in
        // yf-animations.css still leave the element visible.
        return null;
    }
  }

  function boot() {
    var nodes = document.querySelectorAll("[data-yf-anim]");
    if (!("IntersectionObserver" in window)) {
      // Fallback: just play everything immediately.
      Array.prototype.forEach.call(nodes, function (el) {
        var preset = el.getAttribute("data-yf-anim");
        el.setAttribute("data-yf-anim-played", "1");
        if (preset) play(el, preset);
      });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (el.getAttribute("data-yf-anim-played")) return;
        el.setAttribute("data-yf-anim-played", "1");
        var preset = el.getAttribute("data-yf-anim");
        if (preset) play(el, preset);
        observer.unobserve(el);
      });
    }, { threshold: 0.15 });
    Array.prototype.forEach.call(nodes, function (el) {
      observer.observe(el);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
`;

export const EXPORT_RUNTIME_CSS = `/* Yappaflow animation runtime — initial states.
 * Sections with [data-yf-anim] hide their content until the JS runtime
 * plays the matching tween. The [data-yf-anim-played] attribute (set by
 * the runtime) removes the hidden state as a safety net in case GSAP is
 * blocked or fails to load. Presets that rely on ScrollTrigger (parallax,
 * pin, scrub) intentionally don't hide initial state — they'd flash
 * empty without the runtime.
 */
[data-yf-anim="fade-in"]:not([data-yf-anim-played]) {
  opacity: 0;
}
[data-yf-anim="slide-up"]:not([data-yf-anim-played]) {
  opacity: 0;
  transform: translateY(40px);
}
[data-yf-anim="slide-left"]:not([data-yf-anim-played]) {
  opacity: 0;
  transform: translateX(-40px);
}
[data-yf-anim="slide-right"]:not([data-yf-anim-played]) {
  opacity: 0;
  transform: translateX(40px);
}
[data-yf-anim="scale-in"]:not([data-yf-anim-played]) {
  opacity: 0;
  transform: scale(0.92);
}
[data-yf-anim="reveal-mask"]:not([data-yf-anim-played]) {
  clip-path: inset(100% 0% 0% 0%);
}
`;

export const EXPORT_RUNTIME_FILENAMES = {
  js: "yf-animations.js",
  css: "yf-animations.css",
};

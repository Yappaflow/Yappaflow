"use client";

import { useEffect, useRef } from "react";

/**
 * <StatementFade> — oversized statement where trailing words desaturate as
 * you scroll. Mirrors the Evolve treatment in the third reference, but on
 * a light canvas: first words in ink, the tail in quiet paper-greys.
 *
 * Mechanism: each word gets its own span. As the section enters the
 * viewport and scrolls past, we drive a CSS variable --p from 0..1 via a
 * lightweight RAF-driven IntersectionObserver, and map each word's color
 * to a gradient controlled by its index / total.
 */

const STATEMENT =
  "MOTION IS RHYTHM. WE CLOSE THE GAP BETWEEN DESIGN TOKENS AND LIVE COMPONENTS TO TURN IDEAS INTO PRODUCTION SITES.";

export function StatementFade() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reduced motion: fade already rendered via initial CSS var — skip JS.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      el.style.setProperty("--p", "1");
      return;
    }

    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Map section center from below-the-fold (0) to well-above (1).
      const center = r.top + r.height / 2;
      const progress = 1 - center / vh; // ~0 when entering, ~1 when leaving top
      const clamped = Math.max(0, Math.min(1, progress * 1.1));
      el.style.setProperty("--p", clamped.toFixed(3));
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const words = STATEMENT.split(" ");
  const total = words.length;

  return (
    <section ref={ref} className="statement-fade" style={{ "--p": 0 } as React.CSSProperties}>
      <div className="statement-fade__inner">
        <h2 className="statement-fade__text">
          {words.map((w, i) => {
            // Each word's fade-in threshold sits between 0 and ~0.7.
            const threshold = (i / total) * 0.7;
            return (
              <span
                key={i}
                className="statement-fade__word"
                style={{ "--threshold": threshold } as React.CSSProperties}
              >
                {w}
                {i < words.length - 1 ? " " : ""}
              </span>
            );
          })}
        </h2>
      </div>

      <style>{STATEMENT_CSS}</style>
    </section>
  );
}

const STATEMENT_CSS = /* css */ `
.statement-fade {
  position: relative;
  background: var(--ff-paper);
  padding: clamp(6rem, 14vw, 14rem) clamp(1rem, 3vw, 3rem);
}
.statement-fade__inner {
  max-width: var(--ff-max-width);
  margin: 0 auto;
}
.statement-fade__text {
  margin: 0;
  font-family: var(--ff-font-display);
  font-weight: 700;
  font-size: clamp(2.4rem, 7vw, 7rem);
  line-height: 0.96;
  letter-spacing: -0.035em;
  text-transform: uppercase;
  max-width: 18ch;
  color: var(--ff-text-primary);
  text-wrap: balance;
}

.statement-fade__word {
  /* Each word becomes visible once progress --p passes its --threshold.
     Before that it sits in a very soft paper-grey. */
  color: color-mix(
    in oklab,
    var(--ff-text-primary) calc(100% * clamp(0, (var(--p) - var(--threshold)) * 6, 1)),
    color-mix(in oklab, var(--ff-ink) 18%, var(--ff-paper)) 100%
  );
  transition: color 180ms linear;
}

/* First two words always read as ink, for visual anchor */
.statement-fade__word:first-child,
.statement-fade__word:nth-child(2),
.statement-fade__word:nth-child(3) {
  color: var(--ff-text-primary);
}

/* "MOMENTUM"-style orange accent on the final word */
.statement-fade__word:last-child {
  color: color-mix(
    in oklab,
    var(--ff-accent) calc(100% * clamp(0, (var(--p) - 0.45) * 4, 1)),
    color-mix(in oklab, var(--ff-ink) 18%, var(--ff-paper)) 100%
  );
}
`;

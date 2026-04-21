"use client";

import { useEffect, useRef } from "react";

/**
 * <DesignPrinciples> — a scroll-pinned section that walks through the
 * library's design principles one at a time as the user scrolls.
 *
 * Implementation: a vertical stack of "slides" inside a sticky wrapper. As
 * the section scrolls through the viewport, a progress variable maps to
 * the active slide index. Each slide cross-fades + translates with a GPU
 * transform so it stays buttery under scrub.
 *
 * We deliberately don't use ScrollTrigger.pin here — `position: sticky`
 * gets us identical behavior with zero GSAP cost for marketing.
 */

const PRINCIPLES = [
  {
    index: "01",
    title: "Tokens first.",
    body:
      "Every visual decision lives in --ff-* CSS custom properties. Swap a handful in a :root override and the whole library restyles — no compile, no rebuild, no bespoke theming API.",
  },
  {
    index: "02",
    title: "Motion by beat.",
    body:
      "Structure at 0ms, primary at 200ms, secondary at 400ms, CTA at 600ms. Authors pass the beat name — the duration, delay, and easing come from the choreography score.",
  },
  {
    index: "03",
    title: "Light, by default.",
    body:
      "Every site we ship opens in light theme with a dark toggle. It's a product rule, not a stylistic one: we'd rather ship one tone with a promise than two tones with a compromise.",
  },
  {
    index: "04",
    title: "One GSAP, one Lenis.",
    body:
      "No framer-motion, no react-spring. GSAP runs the tweens, Lenis runs the scroll, both share one RAF loop. One animation vocabulary — easier to reason about, easier to ship.",
  },
  {
    index: "05",
    title: "Reduced motion is a feature.",
    body:
      "prefers-reduced-motion disables every animation in the library automatically. Reveal lands at final state, Lenis steps aside for native scroll, magnetic effects go no-op. No guards in userland.",
  },
];

export function DesignPrinciples() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const slides = section.querySelectorAll<HTMLElement>("[data-principle]");
    if (slides.length === 0) return;
    const indexBadge = section.querySelector<HTMLElement>("[data-active-idx]");
    const count = slides.length;

    let raf = 0;
    const update = () => {
      raf = 0;
      const r = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const scrolled = Math.max(0, -r.top);
      const progress = Math.min(1, scrolled / total);
      const activeIdx = Math.min(count - 1, Math.floor(progress * count));
      slides.forEach((slide, i) => {
        // Each slide is visible in a window around its idx.
        const slidePos = i / count;
        const slideEnd = (i + 1) / count;
        const inside = progress >= slidePos && progress < slideEnd;
        const local = inside
          ? (progress - slidePos) / (slideEnd - slidePos)
          : progress < slidePos
          ? 0
          : 1;
        slide.dataset.active = String(inside);
        slide.style.opacity = inside
          ? String(1 - Math.pow(Math.abs(local - 0.5) * 2, 2) * 0.15)
          : "0";
        slide.style.transform = `translate3d(0, ${(inside ? (local - 0.5) * 40 : local < 0.5 ? 60 : -60)}px, 0)`;
      });
      if (indexBadge) {
        indexBadge.textContent = PRINCIPLES[activeIdx]?.index ?? "01";
      }
      const bar = section.querySelector<HTMLElement>("[data-progress-bar]");
      if (bar) bar.style.transform = `scaleY(${progress.toFixed(3)})`;
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

  return (
    <section ref={ref} className="principles">
      <div className="principles__sticky">
        <div className="principles__inner">
          <div className="principles__eyebrow">
            <span className="principles__dot" />
            Design principles
            <span className="principles__idx" data-active-idx>01</span>
          </div>

          <div className="principles__slides">
            {PRINCIPLES.map((p, i) => (
              <article key={i} data-principle className="principles__slide">
                <div className="principles__slide-idx">{p.index}</div>
                <h3 className="principles__slide-title">{p.title}</h3>
                <p className="principles__slide-body">{p.body}</p>
              </article>
            ))}
          </div>

          <div className="principles__progress" aria-hidden="true">
            <div className="principles__progress-track">
              <div className="principles__progress-bar" data-progress-bar />
            </div>
            <div className="principles__progress-count">
              {PRINCIPLES.length.toString().padStart(2, "0")} principles
            </div>
          </div>
        </div>
      </div>

      <style>{PRINCIPLES_CSS}</style>
    </section>
  );
}

const PRINCIPLES_CSS = /* css */ `
.principles {
  position: relative;
  background: var(--ff-paper);
  /* Height drives scroll budget. Each slide gets ~1 viewport of runway. */
  height: calc(100vh * 5.2);
  border-top: 1px solid var(--ff-border);
}
.principles__sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.principles__inner {
  position: relative;
  max-width: var(--ff-max-width);
  width: 100%;
  margin: 0 auto;
  padding: 0 clamp(1rem, 3vw, 3rem);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(2rem, 4vw, 4rem);
}

.principles__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-family: var(--ff-font-body);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ff-text-secondary);
  font-weight: 600;
}
.principles__dot { width: 8px; height: 8px; border-radius: 9999px; background: var(--ff-accent); }
.principles__idx {
  margin-left: auto;
  font-family: var(--ff-font-mono);
  font-size: 0.72rem;
  color: var(--ff-accent);
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  border: 1px solid color-mix(in oklab, var(--ff-accent) 35%, transparent);
}

.principles__slides {
  position: relative;
  min-height: 50vh;
}
.principles__slide {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(1rem, 2vw, 1.5rem);
  opacity: 0;
  will-change: opacity, transform;
  pointer-events: none;
}
.principles__slide[data-active="true"] { pointer-events: auto; }
.principles__slide-idx {
  font-family: var(--ff-font-mono);
  font-size: 0.82rem;
  color: var(--ff-accent);
  letter-spacing: 0.18em;
}
.principles__slide-title {
  margin: 0;
  font-family: var(--ff-font-display);
  font-weight: 700;
  font-size: clamp(2.4rem, 8vw, 8rem);
  line-height: 0.94;
  letter-spacing: -0.04em;
  color: var(--ff-text-primary);
  text-transform: uppercase;
  text-wrap: balance;
}
.principles__slide-body {
  margin: 0;
  font-family: var(--ff-font-body);
  font-size: clamp(1rem, 1.3vw, 1.25rem);
  line-height: 1.5;
  color: var(--ff-text-secondary);
  max-width: 48ch;
}

/* Progress indicator — a vertical scrub rail on the right edge */
.principles__progress {
  position: absolute;
  top: 50%;
  right: clamp(1rem, 3vw, 3rem);
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
.principles__progress-track {
  width: 2px;
  height: clamp(160px, 24vh, 240px);
  background: var(--ff-border);
  border-radius: 9999px;
  overflow: hidden;
  position: relative;
}
.principles__progress-bar {
  position: absolute;
  inset: 0;
  background: var(--ff-accent);
  transform-origin: top;
  transform: scaleY(0);
  transition: transform 220ms linear;
}
.principles__progress-count {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-family: var(--ff-font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  color: var(--ff-text-tertiary);
}

@media (max-width: 760px) {
  .principles__progress { right: 0.75rem; }
  .principles__slide-body { max-width: 100%; }
}
`;

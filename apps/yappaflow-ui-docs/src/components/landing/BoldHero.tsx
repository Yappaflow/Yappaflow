"use client";

import { useEffect, useRef } from "react";
import { Reveal, Magnetic, ScrambleText } from "yappaflow-ui/motion";

/**
 * <BoldHero> — Evolve-inspired stacked-display hero, light-theme.
 *
 * Three stacked words fill the viewport. Behind them: a hover-reactive
 * field of floating library-primitive chips that trail the cursor,
 * demonstrating the library's magnetic/stagger vocabulary as ambient
 * decoration (not as content — the page would still read without it).
 *
 * Everything sits on `--ff-paper` with an orange-tinted glow in the
 * corners. Strict light-theme — the dark reference is inverted to cream.
 */
export function BoldHero() {
  const fieldRef = useRef<HTMLDivElement>(null);

  // Cursor-follow for the chip field. The chips are arranged on an
  // invisible grid; each tilts toward the pointer within its cell.
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let raf = 0;
    let mx = 0;
    let my = 0;
    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      raf = 0;
      const chips = field.querySelectorAll<HTMLElement>("[data-chip]");
      chips.forEach((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = mx - cx;
        const dy = my - cy;
        const dist = Math.hypot(dx, dy);
        const radius = 220;
        if (dist > radius) {
          el.style.transform = "translate3d(0,0,0)";
          el.style.opacity = "0.7";
          return;
        }
        const pull = (1 - dist / radius) * 0.28;
        el.style.transform = `translate3d(${dx * pull}px, ${dy * pull}px, 0)`;
        el.style.opacity = "1";
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="evo-hero">
      {/* ambient field — floats behind the display type */}
      <div ref={fieldRef} className="evo-hero__field" aria-hidden="true">
        {CHIPS.map((chip, i) => (
          <span
            key={i}
            data-chip
            className="evo-hero__chip"
            style={{
              left: chip.left,
              top: chip.top,
              // stagger the gentle drift-in
              animationDelay: `${i * 120}ms`,
              ...(chip.accent ? { background: "var(--ff-accent)", color: "var(--ff-paper)", borderColor: "var(--ff-accent)" } : null),
            }}
          >
            <span className="evo-hero__chip-dot" aria-hidden="true" />
            {chip.label}
          </span>
        ))}
      </div>

      {/* Grid overlay & corner glows */}
      <div className="evo-hero__grid" aria-hidden="true" />
      <div className="evo-hero__glow evo-hero__glow--a" aria-hidden="true" />
      <div className="evo-hero__glow evo-hero__glow--b" aria-hidden="true" />

      {/* Top strip — small meta row below the sticky NavShell */}
      <header className="evo-hero__topbar">
        <div className="evo-hero__tagline">
          An opinionated React + GSAP library.<br />
          Five layers. One import.
        </div>
        <div className="evo-hero__contact">
          <a href="https://yappaflow.com" target="_blank" rel="noopener noreferrer">yappaflow.com</a>
          <span>Samsun, EST 2025<span className="evo-hero__copy">©</span></span>
        </div>
      </header>

      {/* Fixed side labels */}
      <div className="evo-hero__side evo-hero__side--left">Tokens · Motion</div>
      <div className="evo-hero__side evo-hero__side--right">Primitives · Shell</div>

      {/* The stacked display — the moment. */}
      <div className="evo-hero__stack">
        <Reveal beat="primary" variant="fade-translate">
          <div className="evo-hero__row evo-hero__row--one">
            <ScrambleText text="ANIMATE" duration={1.0} stagger={0.04} />
          </div>
        </Reveal>
        <Reveal beat="primary" variant="fade-translate">
          <div className="evo-hero__row evo-hero__row--two">
            <ScrambleText text="ANYTHING" duration={1.1} delay={0.25} stagger={0.04} />
          </div>
        </Reveal>
        <Reveal beat="primary" variant="fade-translate">
          <div className="evo-hero__row evo-hero__row--three">
            <span className="evo-hero__accent">
              <ScrambleText text="COMPONENT LIBRARY" duration={1.2} delay={0.5} stagger={0.035} />
            </span>
          </div>
        </Reveal>
      </div>

      {/* Bottom CTA row */}
      <div className="evo-hero__bottom">
        <Reveal beat="cta" variant="fade-translate">
          <div className="evo-hero__ctas">
            <Magnetic>
              <a href="/gallery" className="evo-hero__cta evo-hero__cta--primary">
                <span>Browse the gallery</span>
                <span aria-hidden="true" className="evo-hero__cta-arrow">→</span>
              </a>
            </Magnetic>
            <a href="/docs/getting-started" className="evo-hero__cta evo-hero__cta--ghost">
              <span>Read the docs</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </Reveal>
        <Reveal beat="cta" variant="fade-translate">
          <div className="evo-hero__hint">
            <span className="evo-hero__hint-dot" aria-hidden="true" />
            hover the field — the chips pull with your cursor
          </div>
        </Reveal>
      </div>

      <style>{EVO_HERO_CSS}</style>
    </section>
  );
}

/* ─── Chip field — positioned around the headline ──────────────────── */
const CHIPS: Array<{ label: string; left: string; top: string; accent?: boolean }> = [
  { label: "<Reveal />",          left: "6%",  top: "26%" },
  { label: "useMagnetic()",       left: "18%", top: "14%" },
  { label: "<ScrollSection />",   left: "72%", top: "18%" },
  { label: "<ScrambleText />",    left: "86%", top: "34%", accent: true },
  { label: "<AmbientLayer />",    left: "9%",  top: "62%" },
  { label: "useReveal()",         left: "22%", top: "78%" },
  { label: "--ff-accent",         left: "78%", top: "72%", accent: true },
  { label: "<Magnetic />",        left: "88%", top: "58%" },
  { label: "stagger='text'",      left: "50%", top: "8%"  },
  { label: "beat='primary'",      left: "50%", top: "88%" },
  { label: "<ThemeToggle />",     left: "3%",  top: "44%" },
  { label: "variant='mask-up'",   left: "92%", top: "84%" },
];

const EVO_HERO_CSS = /* css */ `
.evo-hero {
  position: relative;
  min-height: 100vh;
  padding: clamp(1.25rem, 2vw, 2rem) clamp(1rem, 3vw, 3rem);
  background: var(--ff-paper);
  color: var(--ff-text-primary);
  overflow: hidden;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* Light-theme grid overlay, very faint */
.evo-hero__grid {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, color-mix(in oklab, var(--ff-ink) 5%, transparent) 1px, transparent 1px);
  background-size: clamp(80px, 8vw, 140px) 100%;
  mask-image: linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,1) 30%, rgba(0,0,0,1) 70%, rgba(0,0,0,0.4));
}

.evo-hero__glow {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  filter: blur(100px);
  opacity: 0.5;
  will-change: transform;
}
.evo-hero__glow--a {
  top: -220px; right: -160px;
  width: 620px; height: 620px;
  background: radial-gradient(circle, var(--ff-accent) 0%, transparent 70%);
  animation: evo-hero-drift-a 14s ease-in-out infinite alternate;
}
.evo-hero__glow--b {
  bottom: -260px; left: -120px;
  width: 520px; height: 520px;
  background: radial-gradient(circle, color-mix(in oklab, var(--ff-accent) 65%, #ffc58f) 0%, transparent 70%);
  animation: evo-hero-drift-b 16s ease-in-out infinite alternate;
}
@keyframes evo-hero-drift-a { to { transform: translate3d(-60px, 40px, 0) scale(1.08); } }
@keyframes evo-hero-drift-b { to { transform: translate3d(40px, -30px, 0) scale(1.1); } }

/* Interactive chip field */
.evo-hero__field {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
.evo-hero__chip {
  position: absolute;
  transform-origin: center;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid var(--ff-border);
  background: var(--ff-surface-raised);
  color: var(--ff-text-secondary);
  font-family: var(--ff-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.02em;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  opacity: 0.7;
  transition: opacity 280ms cubic-bezier(0.16, 1, 0.3, 1),
              transform 520ms cubic-bezier(0.16, 1, 0.3, 1);
  animation: evo-chip-float 7s ease-in-out infinite alternate;
  box-shadow:
    0 1px 0 rgba(10,10,10,0.04),
    0 8px 22px -18px rgba(10,10,10,0.22);
}
.evo-hero__chip-dot {
  width: 6px; height: 6px; border-radius: 9999px;
  background: var(--ff-accent);
}
@keyframes evo-chip-float {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(0, -6px, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .evo-hero__chip { animation: none; }
  .evo-hero__glow { animation: none; }
}

/* Top bar */
.evo-hero__topbar {
  position: relative;
  z-index: 3;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: flex-start;
  gap: var(--ff-space-5);
  padding-top: clamp(1rem, 2vw, 2rem);
  font-family: var(--ff-font-body);
  font-size: 0.78rem;
  color: var(--ff-text-secondary);
  line-height: 1.4;
}
.evo-hero__tagline { text-align: left; max-width: 32ch; }
.evo-hero__contact {
  justify-self: end;
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.evo-hero__contact a {
  color: var(--ff-text-primary);
  text-decoration: none;
  font-weight: 500;
}
.evo-hero__contact a:hover { color: var(--ff-accent); }
.evo-hero__copy { color: var(--ff-accent); margin-left: 2px; }

/* Side labels */
.evo-hero__side {
  position: absolute;
  top: clamp(3rem, 5vw, 4.5rem);
  z-index: 3;
  font-family: var(--ff-font-body);
  font-size: 0.78rem;
  color: var(--ff-text-secondary);
  letter-spacing: 0.02em;
}
.evo-hero__side--left  { left: clamp(1rem, 3vw, 3rem); }
.evo-hero__side--right { right: clamp(1rem, 3vw, 3rem); }

/* The stacked display */
.evo-hero__stack {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: clamp(0.2rem, 0.4vw, 0.5rem);
  padding: clamp(2rem, 6vh, 5rem) 0;
  text-wrap: balance;
}
.evo-hero__row {
  font-family: var(--ff-font-display);
  font-weight: 700;
  font-size: clamp(3.4rem, 13.5vw, 13rem);
  line-height: 0.88;
  letter-spacing: -0.045em;
  color: var(--ff-text-primary);
  text-transform: uppercase;
  text-align: center;
  width: 100%;
  white-space: nowrap;
}
.evo-hero__row--three {
  font-size: clamp(2rem, 8vw, 8rem);
  letter-spacing: -0.03em;
}
.evo-hero__accent {
  background: linear-gradient(
    100deg,
    var(--ff-accent) 0%,
    color-mix(in oklab, var(--ff-accent) 72%, #ffc58f) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: var(--ff-accent);
}

/* Bottom CTA row */
.evo-hero__bottom {
  position: relative;
  z-index: 3;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: var(--ff-space-5);
  padding-top: var(--ff-space-4);
}
.evo-hero__ctas {
  display: inline-flex;
  gap: var(--ff-space-4);
  flex-wrap: wrap;
}
.evo-hero__cta {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.9rem 1.4rem;
  border-radius: 9999px;
  font-family: var(--ff-font-body);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition:
    transform 300ms cubic-bezier(0.16, 1, 0.3, 1),
    background 200ms ease, color 200ms ease, border-color 200ms ease;
  will-change: transform;
}
.evo-hero__cta--primary {
  background: var(--ff-text-primary);
  color: var(--ff-paper);
  border: 1px solid var(--ff-text-primary);
  box-shadow: 0 8px 22px -12px color-mix(in oklab, var(--ff-accent) 60%, transparent);
}
.evo-hero__cta--primary:hover {
  background: var(--ff-accent);
  border-color: var(--ff-accent);
}
.evo-hero__cta--ghost {
  background: transparent;
  color: var(--ff-text-primary);
  border: 1px solid var(--ff-border-strong);
}
.evo-hero__cta--ghost:hover {
  border-color: var(--ff-accent);
  color: var(--ff-accent);
}
.evo-hero__cta-arrow { transition: transform 300ms cubic-bezier(0.25, 1, 0.5, 1); }
.evo-hero__cta:hover .evo-hero__cta-arrow { transform: translateX(4px); }

.evo-hero__hint {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--ff-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ff-text-secondary);
  padding: 0.5rem 0.9rem;
  border-radius: 9999px;
  background: var(--ff-surface-raised);
  border: 1px solid var(--ff-border);
}
.evo-hero__hint-dot {
  width: 6px; height: 6px; border-radius: 9999px; background: var(--ff-accent);
  animation: evo-hint-blink 1.6s ease-in-out infinite;
}
@keyframes evo-hint-blink {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(0.65); opacity: 0.5; }
}

@media (max-width: 820px) {
  .evo-hero__topbar { grid-template-columns: 1fr; }
  .evo-hero__tagline { text-align: left; }
  .evo-hero__contact { text-align: left; justify-self: start; }
  .evo-hero__side { display: none; }
  .evo-hero__chip { font-size: 0.66rem; padding: 0.3rem 0.6rem; }
}
`;

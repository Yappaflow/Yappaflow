"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "yappaflow-ui/motion";

/**
 * <ShowcaseReel> — the "what you can build" video-panel section.
 *
 * Mirrors the Evolve showreel card: a framed panel with timecode / resolution
 * chrome, a play-showreel pill, and a filename watermark. Inside the panel,
 * a currentSite preview cycles every 2 seconds. Below the panel, a
 * horizontal thumbnail rail auto-scrolls on vertical page scroll (scroll-
 * tied, not pinned — keeps things light).
 *
 * Light-theme: the panel itself is warm cream with a strong accent border
 * and rich color composition in each preview.
 */

const SITES: Array<{
  kind: string;
  headline: string;
  sub: string;
  tint: string;
  swatches: [string, string, string];
}> = [
  {
    kind: "01 · Studio folio",
    headline: "A portfolio that\nbreathes like a gallery.",
    sub: "ExhibitHero + ScrollSection",
    tint: "linear-gradient(135deg, #ff4d00 0%, #ff9b63 100%)",
    swatches: ["#ff4d00", "#ff8a50", "#fafaf9"],
  },
  {
    kind: "02 · SaaS landing",
    headline: "Feature tour with\nstaged choreography.",
    sub: "PillarStrip + ChoreographyPreview",
    tint: "linear-gradient(135deg, #0a0a0a 0%, #3a3836 100%)",
    swatches: ["#0a0a0a", "#ff4d00", "#ffffff"],
  },
  {
    kind: "03 · Launch page",
    headline: "A countdown that\nnever feels like a timer.",
    sub: "ScrambleText + Magnetic CTA",
    tint: "linear-gradient(135deg, #ff4d00 0%, #2b4acb 100%)",
    swatches: ["#ff4d00", "#2b4acb", "#fafaf9"],
  },
  {
    kind: "04 · Editorial",
    headline: "Long-form reading with\nscroll-tied reveals.",
    sub: "Editorial primitive + mask-up",
    tint: "linear-gradient(135deg, #d6428e 0%, #ff4d00 100%)",
    swatches: ["#d6428e", "#ff4d00", "#fffaf3"],
  },
  {
    kind: "05 · Agency index",
    headline: "Case-study grid with\npinned storytelling.",
    sub: "ScrollSection pinned-story",
    tint: "linear-gradient(135deg, #2d7a4a 0%, #0a0a0a 100%)",
    swatches: ["#2d7a4a", "#0a0a0a", "#ff4d00"],
  },
  {
    kind: "06 · AI generator",
    headline: "Sixty sites that don't\nlook like sixty sites.",
    sub: "The whole library, composed.",
    tint: "linear-gradient(135deg, #ff4d00 0%, #0a0a0a 100%)",
    swatches: ["#ff4d00", "#0a0a0a", "#fafaf9"],
  },
];

export function ShowcaseReel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Auto-cycle every 2 seconds.
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % SITES.length);
    }, 2000);
    return () => window.clearInterval(id);
  }, [paused]);

  // Scroll-tied horizontal drift of the thumbnail rail. As the section
  // progresses through the viewport, the track shifts from 0 to ~ -half
  // its overflow width.
  useEffect(() => {
    const section = sectionRef.current;
    const track = railRef.current;
    if (!section || !track) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Progress 0..1 over the full section pass
      const progress = Math.max(
        0,
        Math.min(1, (vh - r.top) / (vh + r.height)),
      );
      const distance = Math.max(0, track.scrollWidth - track.clientWidth);
      track.style.transform = `translate3d(${-distance * progress * 0.9}px, 0, 0)`;
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

  const current = SITES[active];

  return (
    <section ref={sectionRef} className="reel">
      <div className="reel__inner">
        <Reveal beat="structure" variant="fade-translate" trigger="in-view">
          <div className="reel__eyebrow">
            <span className="reel__eyebrow-dot" />
            Showreel
            <span className="reel__eyebrow-spacer" />
            <span className="reel__eyebrow-meta">Six sites · one library</span>
          </div>
        </Reveal>

        <Reveal beat="primary" variant="text-lines" stagger="text" trigger="in-view">
          <h2 className="reel__title">
            WHAT YOU CAN BUILD<br />
            <span className="reel__title--accent">IN AN AFTERNOON.</span>
          </h2>
        </Reveal>

        {/* The video-panel-style frame */}
        <Reveal beat="secondary" variant="fade-translate" trigger="in-view">
          <div
            className="reel__panel"
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => setPaused(false)}
          >
            {/* Chrome — timecode / resolution */}
            <div className="reel__chrome reel__chrome--top">
              <span className="reel__tc">00:0{(active % 6)}:{String(active * 13 % 60).padStart(2, "0")}</span>
              <div className="reel__scrub">
                <div
                  className="reel__scrub-bar"
                  style={{ width: `${((active + 1) / SITES.length) * 100}%` }}
                />
              </div>
              <span className="reel__tc">
                4k 60fps<br />
                <span>Res: 1920×1080</span>
              </span>
            </div>

            {/* The rotating preview */}
            <div className="reel__screens">
              {SITES.map((site, i) => (
                <div
                  key={i}
                  className="reel__screen"
                  data-active={i === active}
                  style={{ background: site.tint }}
                >
                  <div className="reel__screen-kind">{site.kind}</div>
                  <div className="reel__screen-headline">
                    {site.headline.split("\n").map((line, j) => (
                      <span key={j}>{line}<br /></span>
                    ))}
                  </div>
                  <div className="reel__screen-swatches">
                    {site.swatches.map((s, j) => (
                      <span key={j} style={{ background: s }} />
                    ))}
                  </div>
                  <div className="reel__screen-sub">{site.sub}</div>
                </div>
              ))}
            </div>

            {/* Bottom chrome — play pill + slot index + filename */}
            <div className="reel__chrome reel__chrome--bottom">
              <button className="reel__play" type="button" onClick={() => setPaused((p) => !p)}>
                <span>{paused ? "Play showreel" : "Pause showreel"}</span>
                <span aria-hidden="true" className="reel__play-glyph">
                  {paused ? "▶" : "❚❚"}
                </span>
              </button>
              <div className="reel__slot">
                <span className="reel__slot-idx">{String(active + 1).padStart(2, "0")}.</span>
                <span className="reel__slot-kind">{current.kind.replace(/^\d+ · /, "")}</span>
              </div>
              <span className="reel__file">YF©2025_SHOWREEL.MP4</span>
            </div>
          </div>
        </Reveal>

        {/* Thumbnail rail — drifts on scroll */}
        <div className="reel__rail-wrap">
          <div ref={railRef} className="reel__rail">
            {[...SITES, ...SITES].map((site, i) => (
              <button
                key={i}
                type="button"
                className="reel__thumb"
                data-active={i % SITES.length === active}
                style={{ background: site.tint }}
                onClick={() => setActive(i % SITES.length)}
                aria-label={site.kind}
              >
                <span className="reel__thumb-kind">{site.kind}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{REEL_CSS}</style>
    </section>
  );
}

const REEL_CSS = /* css */ `
.reel {
  position: relative;
  background: var(--ff-paper);
  padding: clamp(5rem, 10vw, 10rem) clamp(1rem, 3vw, 3rem);
  overflow: hidden;
  border-top: 1px solid var(--ff-border);
}
.reel__inner {
  max-width: var(--ff-max-width);
  margin: 0 auto;
}

.reel__eyebrow {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-family: var(--ff-font-body);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ff-text-secondary);
  font-weight: 600;
}
.reel__eyebrow-dot {
  width: 8px; height: 8px; border-radius: 9999px;
  background: var(--ff-accent);
}
.reel__eyebrow-spacer { flex: 1; height: 1px; background: var(--ff-border); margin: 0 0.65rem; }
.reel__eyebrow-meta { color: var(--ff-text-tertiary); font-weight: 500; }

.reel__title {
  margin: var(--ff-space-4) 0 clamp(2rem, 5vw, 4rem) 0;
  font-family: var(--ff-font-display);
  font-weight: 700;
  font-size: clamp(2.2rem, 7vw, 7rem);
  line-height: 0.94;
  letter-spacing: -0.035em;
  text-transform: uppercase;
  color: var(--ff-text-primary);
  text-wrap: balance;
  max-width: 18ch;
}
.reel__title--accent {
  background: linear-gradient(100deg, var(--ff-accent) 0%, color-mix(in oklab, var(--ff-accent) 72%, #ffc58f) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: var(--ff-accent);
}

/* The panel frame */
.reel__panel {
  position: relative;
  border: 1px solid var(--ff-border-strong);
  border-radius: var(--ff-radius-soft);
  background: var(--ff-surface-raised);
  box-shadow:
    0 1px 0 rgba(10,10,10,0.04),
    0 36px 80px -48px rgba(10,10,10,0.28);
  padding: 0;
  overflow: hidden;
}

.reel__chrome {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ff-space-4);
  padding: var(--ff-space-4) var(--ff-space-5);
  font-family: var(--ff-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: var(--ff-text-secondary);
}
.reel__chrome--top {
  border-bottom: 1px solid var(--ff-border);
}
.reel__chrome--bottom {
  border-top: 1px solid var(--ff-border);
  align-items: center;
}
.reel__tc {
  color: var(--ff-text-primary);
  font-weight: 500;
  line-height: 1.35;
}
.reel__scrub {
  flex: 1;
  height: 2px;
  background: var(--ff-border);
  border-radius: 9999px;
  overflow: hidden;
  margin-top: 0.4rem;
}
.reel__scrub-bar {
  height: 100%;
  background: var(--ff-accent);
  transition: width 1.9s cubic-bezier(0.65, 0, 0.35, 1);
}

/* The screens — stacked; only the [data-active="true"] one is visible */
.reel__screens {
  position: relative;
  aspect-ratio: 21 / 9;
  overflow: hidden;
}
.reel__screen {
  position: absolute;
  inset: 0;
  padding: clamp(1.5rem, 4vw, 3.5rem);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: rgba(255,255,255,0.94);
  opacity: 0;
  transform: scale(1.03);
  transition:
    opacity 900ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 1600ms cubic-bezier(0.16, 1, 0.3, 1);
}
.reel__screen[data-active="true"] {
  opacity: 1;
  transform: scale(1);
}

.reel__screen-kind {
  font-family: var(--ff-font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.75);
}
.reel__screen-headline {
  font-family: var(--ff-font-display);
  font-weight: 700;
  font-size: clamp(1.6rem, 4vw, 3.6rem);
  line-height: 0.98;
  letter-spacing: -0.03em;
  color: #ffffff;
  max-width: 16ch;
  text-wrap: balance;
  text-transform: uppercase;
}
.reel__screen-swatches {
  display: flex;
  gap: 0.5rem;
}
.reel__screen-swatches span {
  width: 22px; height: 22px; border-radius: 9999px;
  border: 2px solid rgba(255,255,255,0.6);
}
.reel__screen-sub {
  font-family: var(--ff-font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.75);
  position: absolute;
  right: clamp(1.5rem, 4vw, 3.5rem);
  bottom: clamp(1.5rem, 4vw, 3.5rem);
}

/* Bottom chrome: play pill + slot + filename */
.reel__play {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.45rem 0.9rem;
  border-radius: 9999px;
  background: var(--ff-text-primary);
  color: var(--ff-paper);
  border: 1px solid var(--ff-text-primary);
  font-family: var(--ff-font-body);
  font-weight: 600;
  font-size: 0.78rem;
  cursor: pointer;
  transition: background 200ms ease, transform 200ms ease;
}
.reel__play:hover { background: var(--ff-accent); border-color: var(--ff-accent); }
.reel__play-glyph { font-size: 0.7em; letter-spacing: 0; }

.reel__slot {
  display: inline-flex;
  gap: 0.75rem;
  font-size: 0.78rem;
  color: var(--ff-text-secondary);
}
.reel__slot-idx { color: var(--ff-text-primary); font-weight: 600; }
.reel__slot-kind { letter-spacing: 0.14em; text-transform: uppercase; }

.reel__file {
  color: var(--ff-text-tertiary);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
}

/* Thumbnail rail */
.reel__rail-wrap {
  margin-top: clamp(2rem, 4vw, 3rem);
  overflow: hidden;
  /* Fade edges */
  mask-image: linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%);
}
.reel__rail {
  display: flex;
  gap: clamp(0.75rem, 1.5vw, 1.25rem);
  will-change: transform;
  padding-block: var(--ff-space-3);
}
.reel__thumb {
  flex: 0 0 clamp(220px, 24vw, 320px);
  aspect-ratio: 16 / 10;
  border-radius: var(--ff-radius-soft);
  border: 1px solid var(--ff-border);
  cursor: pointer;
  padding: var(--ff-space-3);
  display: flex;
  align-items: flex-end;
  color: #fff;
  text-align: left;
  transition:
    transform 300ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 300ms ease, box-shadow 300ms ease;
}
.reel__thumb:hover { transform: translateY(-3px); }
.reel__thumb[data-active="true"] {
  border-color: var(--ff-accent);
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--ff-accent) 40%, transparent),
              0 16px 36px -20px color-mix(in oklab, var(--ff-accent) 70%, transparent);
}
.reel__thumb-kind {
  font-family: var(--ff-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.9);
  padding: 0.25rem 0.5rem;
  background: rgba(0,0,0,0.35);
  border-radius: var(--ff-radius-soft);
  backdrop-filter: blur(6px);
}

@media (max-width: 820px) {
  .reel__chrome { flex-wrap: wrap; }
  .reel__screen-sub { position: static; margin-top: var(--ff-space-3); }
}
`;

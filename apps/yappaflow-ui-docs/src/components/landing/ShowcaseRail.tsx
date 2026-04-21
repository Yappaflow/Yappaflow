"use client";

import { useEffect, useRef } from "react";
import { Exhibit } from "yappaflow-ui/shell";
import { Frame, Stack, Display, Body, Eyebrow } from "yappaflow-ui/primitives";
import { Reveal } from "yappaflow-ui/motion";

/**
 * <ShowcaseRail> — horizontal-scroll rail of "what you can build" cards.
 *
 * A vertical-scroll section that pins, then translates a horizontal track
 * on scroll progress. Uses GSAP ScrollTrigger directly (via a lazy dynamic
 * import of gsap + ScrollTrigger) so we don't need to add a new primitive
 * to the library for a single marketing use.
 *
 * Reduced motion: falls back to a horizontally scrollable rail (native).
 */

const CARDS: Array<{
  kind: string;
  headline: string;
  copy: string;
  tint: string;
  swatches: string[];
}> = [
  {
    kind: "Studio folio",
    headline: "A portfolio that breathes like a gallery.",
    copy: "ExhibitHero + ScrollSection, one headline per scroll beat.",
    tint: "linear-gradient(135deg, #ff4d00 0%, #ff9060 100%)",
    swatches: ["#ff4d00", "#ff8a50", "#fafaf9"],
  },
  {
    kind: "SaaS landing",
    headline: "Feature tour with staged choreography.",
    copy: "PillarStrip + ChoreographyPreview, 0→1200ms score.",
    tint: "linear-gradient(135deg, #0a0a0a 0%, #3a3836 100%)",
    swatches: ["#0a0a0a", "#ff4d00", "#ffffff"],
  },
  {
    kind: "Launch page",
    headline: "A countdown that never feels like a timer.",
    copy: "ScrambleText on the hero, Magnetic CTA, AmbientLayer drift.",
    tint: "linear-gradient(135deg, #ff4d00 0%, #2b4acb 100%)",
    swatches: ["#ff4d00", "#2b4acb", "#fafaf9"],
  },
  {
    kind: "Editorial",
    headline: "Long-form reading with scroll-tied reveals.",
    copy: "Editorial primitive, mask-up reveals, breathing rhythm.",
    tint: "linear-gradient(135deg, #d6428e 0%, #ff4d00 100%)",
    swatches: ["#d6428e", "#ff4d00", "#fffaf3"],
  },
  {
    kind: "Agency index",
    headline: "Case study grid with pinned storytelling.",
    copy: "ScrollSection pinned-story + stagger-children reveal.",
    tint: "linear-gradient(135deg, #2d7a4a 0%, #0a0a0a 100%)",
    swatches: ["#2d7a4a", "#0a0a0a", "#ff4d00"],
  },
  {
    kind: "Product launch",
    headline: "Horizontal feature rail — like this one.",
    copy: "ScrollTrigger pin + xPercent, 100% on-token.",
    tint: "linear-gradient(135deg, #ff4d00 0%, #0a0a0a 100%)",
    swatches: ["#ff4d00", "#0a0a0a", "#fafaf9"],
  },
];

export function ShowcaseRail() {
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pin = pinRef.current;
    const track = trackRef.current;
    if (!pin || !track) return;

    // Reduced motion — bail, let the native overflow-x carry the user.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let st: { kill: () => void } | null = null;
    let cancelled = false;

    void (async (): Promise<void> => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      // The track is ~1.8x wider than the viewport; we scroll it by the
      // overflow distance, which keeps the rail the same on every screen.
      const getDistance = (): number => track.scrollWidth - window.innerWidth;

      st = ScrollTrigger.create({
        trigger: pin,
        start: "top top",
        end: () => `+=${getDistance()}`,
        pin: true,
        pinSpacing: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const distance = getDistance();
          gsap.set(track, { x: -distance * self.progress, force3D: true });
        },
      });
    })();

    return (): void => {
      cancelled = true;
      st?.kill();
    };
  }, []);

  return (
    <Exhibit tone="signature" edge="full-bleed" rhythm="room">
      <Frame span={12} offset="center">
        <Stack rhythm="breath">
          <Reveal beat="structure" variant="fade-translate">
            <Eyebrow>
              <span className="showcase-rail__eyebrow-accent">●</span>
              &nbsp; Showcase
            </Eyebrow>
          </Reveal>

          <Reveal beat="primary" variant="text-lines" stagger="text">
            <Display size="md" tracking="tight" balance>
              {"What you can build\nin an afternoon."}
            </Display>
          </Reveal>

          <Reveal beat="secondary" variant="fade-translate">
            <Body size="lg" tone="secondary" style={{ maxWidth: "var(--ff-measure-reading)" }}>
              Scroll. The rail is a pinned ScrollTrigger translating a flex
              track — under a hundred lines of GSAP, zero of it custom to
              this page.
            </Body>
          </Reveal>
        </Stack>
      </Frame>

      <div ref={pinRef} className="showcase-rail__pin">
        <div ref={trackRef} className="showcase-rail__track">
          <div className="showcase-rail__gutter" aria-hidden="true" />
          {CARDS.map((card, i) => (
            <article key={i} className="showcase-rail__card">
              <div
                className="showcase-rail__screen"
                style={{ background: card.tint }}
              >
                <div className="showcase-rail__screen-chrome">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="showcase-rail__screen-index">
                  {String(i + 1).padStart(2, "0")} / {String(CARDS.length).padStart(2, "0")}
                </div>
                <div className="showcase-rail__screen-marquee">
                  {card.headline}
                </div>
              </div>
              <div className="showcase-rail__meta">
                <div className="showcase-rail__kind">{card.kind}</div>
                <div className="showcase-rail__copy">{card.copy}</div>
                <div className="showcase-rail__swatches" aria-hidden="true">
                  {card.swatches.map((s) => (
                    <span
                      key={s}
                      className="showcase-rail__swatch"
                      style={{ background: s }}
                    />
                  ))}
                </div>
              </div>
            </article>
          ))}
          <div className="showcase-rail__gutter" aria-hidden="true" />
        </div>

        <div className="showcase-rail__scrollhint" aria-hidden="true">
          scroll →
        </div>
      </div>

      <style>{RAIL_CSS}</style>
    </Exhibit>
  );
}

const RAIL_CSS = /* css */ `
.showcase-rail__eyebrow-accent {
  color: var(--ff-accent);
}

.showcase-rail__pin {
  position: relative;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  margin-top: var(--ff-space-8);
  display: flex;
  align-items: center;
}

.showcase-rail__track {
  display: flex;
  align-items: center;
  gap: clamp(1.5rem, 3vw, 3rem);
  will-change: transform;
  padding-block: var(--ff-space-5);
}

.showcase-rail__gutter {
  flex: 0 0 clamp(2rem, 8vw, 8rem);
}

.showcase-rail__card {
  flex: 0 0 clamp(320px, 38vw, 520px);
  display: flex;
  flex-direction: column;
  gap: var(--ff-space-4);
}

/* The "screen" — a square-ish canvas that hints at a site. */
.showcase-rail__screen {
  position: relative;
  aspect-ratio: 16 / 10;
  border-radius: var(--ff-radius-framed);
  overflow: hidden;
  padding: var(--ff-space-5);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.94);
  box-shadow:
    0 1px 0 rgba(10, 10, 10, 0.04),
    0 24px 48px -28px rgba(10, 10, 10, 0.28);
}

.showcase-rail__screen-chrome {
  display: flex;
  gap: 6px;
}
.showcase-rail__screen-chrome span {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.55);
}

.showcase-rail__screen-index {
  position: absolute;
  top: var(--ff-space-5);
  right: var(--ff-space-5);
  font-family: var(--ff-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.82);
}

.showcase-rail__screen-marquee {
  font-family: var(--ff-font-display);
  font-size: clamp(1.4rem, 2vw, 2.1rem);
  line-height: 1.02;
  letter-spacing: -0.02em;
  max-width: 18ch;
  color: #ffffff;
  text-shadow: 0 1px 0 rgba(10, 10, 10, 0.08);
}

.showcase-rail__meta {
  display: flex;
  flex-direction: column;
  gap: var(--ff-space-2);
}

.showcase-rail__kind {
  font-family: var(--ff-font-body);
  font-size: var(--ff-type-eyebrow);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ff-accent);
  font-weight: 600;
}

.showcase-rail__copy {
  font-family: var(--ff-font-body);
  font-size: var(--ff-type-body-md);
  color: var(--ff-text-secondary);
  line-height: 1.45;
  max-width: 40ch;
}

.showcase-rail__swatches {
  display: flex;
  gap: var(--ff-space-2);
  margin-top: var(--ff-space-2);
}
.showcase-rail__swatch {
  width: 16px;
  height: 16px;
  border-radius: 9999px;
  border: 1px solid var(--ff-border);
}

.showcase-rail__scrollhint {
  position: absolute;
  bottom: var(--ff-space-5);
  right: var(--ff-space-8);
  font-family: var(--ff-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--ff-text-tertiary);
  padding: var(--ff-space-2) var(--ff-space-4);
  border: 1px solid var(--ff-border);
  border-radius: 9999px;
  background: var(--ff-surface-raised);
}

/* Reduced-motion fallback: native horizontal scroll. */
@media (prefers-reduced-motion: reduce) {
  .showcase-rail__pin {
    height: auto;
    overflow-x: auto;
  }
  .showcase-rail__track {
    transform: none !important;
    padding-inline: var(--ff-space-6);
  }
  .showcase-rail__scrollhint { display: none; }
}

/* Small screens — don't pin, just scroll. */
@media (max-width: 820px) {
  .showcase-rail__pin {
    height: auto;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
  }
  .showcase-rail__track {
    transform: none !important;
    padding-inline: var(--ff-space-5);
  }
  .showcase-rail__card {
    scroll-snap-align: start;
    flex: 0 0 85vw;
  }
  .showcase-rail__scrollhint { display: none; }
}
`;

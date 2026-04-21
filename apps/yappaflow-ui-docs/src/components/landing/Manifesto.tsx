"use client";

import { Reveal } from "yappaflow-ui/motion";

/**
 * <Manifesto> — the "what this actually is" section.
 *
 * Mirrors the Evolve layout: an oversized body paragraph that reads like a
 * statement, then a row of four service-style cards (the five layers,
 * folded to four for the grid), with a right-column supporting paragraph.
 *
 * Light-theme, orange-accent. No bullets — prose is the point.
 */
export function Manifesto() {
  return (
    <section className="manifesto">
      <div className="manifesto__inner">
        <Reveal beat="primary" variant="text-lines" stagger="text">
          <p className="manifesto__lead">
            <span className="manifesto__indent" aria-hidden="true" />
            We are a component library. Not a CSS kit, not a handful of hooks,
            not an opinionated pile of Tailwind classes. We ship{" "}
            <strong>tokens, motion, primitives, shell and exhibits</strong> as
            one connected system &mdash; five layers that compose into art-gallery
            grade websites with minimal code. One stylesheet import, one
            <code className="manifesto__code">&lt;GalleryShell&gt;</code>,
            and every page inherits the same choreography score.
          </p>
        </Reveal>

        <div className="manifesto__grid">
          <div className="manifesto__col">
            <div className="manifesto__eyebrow">
              <span className="manifesto__bullet" />
              Five layers
            </div>

            <div className="manifesto__cards">
              {CARDS.map((c, i) => (
                <Reveal key={i} beat="secondary" variant="fade-translate" trigger="in-view">
                  <article className="manifesto__card" data-accent={c.accent ? "true" : undefined}>
                    <div className="manifesto__card-index">{String(i + 1).padStart(2, "0")}</div>
                    <div className="manifesto__card-title">
                      {c.title.split(" ").map((w, j) => (
                        <span key={j} className="manifesto__card-word">{w}</span>
                      ))}
                    </div>
                    <div className="manifesto__card-desc">{c.desc}</div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>

          <aside className="manifesto__side">
            <div className="manifesto__eyebrow manifesto__eyebrow--right">
              <span>Est. 2025</span>
              <span className="manifesto__accent-dot" aria-hidden="true" />
            </div>

            <Reveal beat="secondary" variant="fade-translate" trigger="in-view">
              <p className="manifesto__side-body">
                Every yappaflow site starts in motion. Tokens, rhythm,
                beats, reduced-motion fallbacks &mdash; baked in, not bolted
                on. Our job isn&rsquo;t to hand you primitives and vanish.{" "}
                It&rsquo;s to <strong>step inside</strong> the composition.
              </p>
            </Reveal>

            <Reveal beat="secondary" variant="fade-translate" trigger="in-view">
              <p className="manifesto__side-body">
                The library is used in production by Yappaflow&rsquo;s AI
                site generator. It&rsquo;s what keeps sixty generated
                sites looking like they came out of the same studio &mdash; because{" "}
                <strong>design, motion and system move together</strong>,
                not in silos.
              </p>
            </Reveal>

            <Reveal beat="cta" variant="fade-translate" trigger="in-view">
              <p className="manifesto__side-body">
                With tokens as the single source of truth, we reduce friction,
                align decisions, and turn complexity into structure.{" "}
                <strong>We don&rsquo;t add noise. We bring direction.</strong>
              </p>
            </Reveal>
          </aside>
        </div>
      </div>

      <style>{MANIFESTO_CSS}</style>
    </section>
  );
}

const CARDS: Array<{ title: string; desc: string; accent?: boolean }> = [
  { title: "Tokens", desc: "--ff-* custom properties. One namespace, hot-swappable.", accent: true },
  { title: "Motion", desc: "GSAP + Lenis, gated on prefers-reduced-motion." },
  { title: "Primitives", desc: "Display, Body, Eyebrow, Frame, Stack." },
  { title: "Shell & Exhibits", desc: "GalleryShell, NavShell, ExhibitHero, ChoreographyPreview." },
];

const MANIFESTO_CSS = /* css */ `
.manifesto {
  position: relative;
  background: var(--ff-paper);
  color: var(--ff-text-primary);
  padding: clamp(5rem, 10vw, 10rem) clamp(1rem, 3vw, 3rem);
  border-top: 1px solid var(--ff-border);
}

.manifesto__inner {
  max-width: var(--ff-max-width);
  margin: 0 auto;
}

/* Lead paragraph — oversized, reads as a statement */
.manifesto__lead {
  font-family: var(--ff-font-display);
  font-size: clamp(1.5rem, 3.4vw, 3rem);
  line-height: 1.12;
  letter-spacing: -0.02em;
  color: var(--ff-text-primary);
  margin: 0 0 clamp(3rem, 6vw, 6rem) 0;
  max-width: 30ch;
  font-weight: 500;
  text-wrap: balance;
}
.manifesto__indent {
  display: inline-block;
  width: clamp(3rem, 8vw, 8rem);
}
.manifesto__lead strong {
  color: var(--ff-text-primary);
  font-weight: 600;
}
.manifesto__code {
  color: var(--ff-accent);
  font-family: var(--ff-font-mono);
  font-size: 0.85em;
  font-weight: 500;
  white-space: nowrap;
}

/* Grid: 4 cols of cards | right aside */
.manifesto__grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: clamp(2rem, 5vw, 5rem);
  align-items: start;
}

.manifesto__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--ff-font-body);
  font-size: 0.78rem;
  color: var(--ff-text-primary);
  font-weight: 600;
  margin-bottom: var(--ff-space-4);
  letter-spacing: 0.02em;
}
.manifesto__bullet { width: 6px; height: 6px; border-radius: 9999px; background: var(--ff-accent); }
.manifesto__eyebrow--right { justify-content: flex-end; }
.manifesto__accent-dot { width: 8px; height: 8px; border-radius: 9999px; background: var(--ff-accent); }

/* Card row */
.manifesto__cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: clamp(0.75rem, 1.5vw, 1.25rem);
}
.manifesto__card {
  position: relative;
  aspect-ratio: 2 / 3;
  border: 1px solid var(--ff-border);
  border-radius: var(--ff-radius-soft);
  padding: var(--ff-space-4);
  background: var(--ff-surface-raised);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition:
    border-color 320ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 420ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 320ms ease;
}
.manifesto__card:hover {
  border-color: var(--ff-accent);
  transform: translateY(-4px);
  box-shadow: 0 18px 40px -24px color-mix(in oklab, var(--ff-accent) 60%, transparent);
}
.manifesto__card[data-accent="true"] {
  background: var(--ff-accent);
  color: var(--ff-paper);
  border-color: var(--ff-accent);
}
.manifesto__card[data-accent="true"] .manifesto__card-index,
.manifesto__card[data-accent="true"] .manifesto__card-desc { color: rgba(255,255,255,0.85); }
.manifesto__card[data-accent="true"]:hover {
  transform: translateY(-4px) rotate(-0.4deg);
  box-shadow: 0 22px 48px -24px color-mix(in oklab, var(--ff-accent) 80%, transparent);
}

.manifesto__card-index {
  font-family: var(--ff-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  color: var(--ff-text-tertiary);
}
.manifesto__card-title {
  display: flex;
  flex-wrap: wrap;
  font-family: var(--ff-font-display);
  font-size: clamp(1rem, 1.6vw, 1.4rem);
  line-height: 1.08;
  letter-spacing: -0.02em;
  color: inherit;
  gap: 0.3em;
}
.manifesto__card-word { display: block; width: 100%; }
.manifesto__card-desc {
  font-family: var(--ff-font-body);
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--ff-text-secondary);
}

/* Right aside */
.manifesto__side {
  display: flex;
  flex-direction: column;
  gap: var(--ff-space-4);
}
.manifesto__side-body {
  margin: 0;
  font-family: var(--ff-font-body);
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--ff-text-secondary);
}
.manifesto__side-body strong {
  color: var(--ff-text-primary);
  font-weight: 600;
}

@media (max-width: 1000px) {
  .manifesto__grid { grid-template-columns: 1fr; }
  .manifesto__cards { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 540px) {
  .manifesto__cards { grid-template-columns: 1fr; }
  .manifesto__card { aspect-ratio: 4 / 3; }
}
`;

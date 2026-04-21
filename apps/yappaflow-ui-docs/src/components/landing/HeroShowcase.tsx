"use client";

import { useState, useEffect } from "react";
import { Exhibit } from "yappaflow-ui/shell";
import { Frame, Stack, Display, Body, Eyebrow } from "yappaflow-ui/primitives";
import { Reveal, Magnetic } from "yappaflow-ui/motion";
import { ThemeToggle } from "yappaflow-ui/theme";

/**
 * <HeroShowcase> — the "the components, live" strip that sits under the
 * ExhibitHero on the landing page.
 *
 * It's not a screenshot grid. Every tile is the real primitive wired up
 * and reacting to user input — a theme-toggle that toggles this page's
 * theme, a magnetic CTA that follows the cursor, a stagger-children
 * Reveal that the user can replay, and a tokens-driven accent swapper.
 *
 * Why it matters: reading the docs is a research act; seeing something
 * respond under your pointer is a product act. The landing earns its
 * credibility in three seconds or loses it.
 */
export function HeroShowcase() {
  return (
    <Exhibit tone="breathing" edge="contained" rhythm="room">
      <Frame span={12} offset="center">
        <Stack rhythm="breath">
          <Reveal beat="structure" variant="fade-translate">
            <Eyebrow>The components — live</Eyebrow>
          </Reveal>

          <Reveal beat="primary" variant="text-lines" stagger="text">
            <Display size="md" tracking="tight" balance>
              {"Every tile is real.\nTouch them."}
            </Display>
          </Reveal>

          <Reveal beat="secondary" variant="fade-translate">
            <Body size="lg" tone="secondary" style={{ maxWidth: "var(--ff-measure-reading)" }}>
              No mocks, no video loops. Each card below mounts the actual
              library component — the theme toggle changes this page, the
              magnetic button follows your cursor, the accent swapper
              rewrites a token you can inspect in DevTools.
            </Body>
          </Reveal>

          <Reveal beat="cta" variant="fade-translate">
            <div className="hero-showcase__grid">
              <ThemeTile />
              <AccentTile />
              <MagneticTile />
              <StaggerTile />
            </div>
          </Reveal>
        </Stack>
      </Frame>

      <style>{SHOWCASE_CSS}</style>
    </Exhibit>
  );
}

/* ─── Tiles ───────────────────────────────────────────────────────── */

function ThemeTile() {
  return (
    <Tile label="Theme" note="Click the disc — it toggles this page.">
      <div className="hero-showcase__center">
        <ThemeToggle variant="framed" />
      </div>
      <TileCode>{`<ThemeToggle variant="framed" />`}</TileCode>
    </Tile>
  );
}

const ACCENTS: Array<{ label: string; value: string }> = [
  { label: "Flare", value: "#ff4d00" },
  { label: "Ink", value: "#2b4acb" },
  { label: "Moss", value: "#2d7a4a" },
  { label: "Petal", value: "#d6428e" },
];

function AccentTile() {
  const [active, setActive] = useState(ACCENTS[0].value);

  useEffect(() => {
    document.documentElement.style.setProperty("--ff-accent", active);
    return () => {
      // Leave the last-chosen accent set on unmount — that matches the
      // "tokens are a running state" story we want to tell.
    };
  }, [active]);

  return (
    <Tile label="Accent token" note="Writes to --ff-accent. Inspect it.">
      <div className="hero-showcase__swatches" role="radiogroup" aria-label="Accent token">
        {ACCENTS.map((a) => (
          <button
            key={a.value}
            type="button"
            role="radio"
            aria-checked={active === a.value}
            aria-label={a.label}
            title={a.label}
            onClick={() => setActive(a.value)}
            className="hero-showcase__swatch"
            data-active={active === a.value}
            style={{ background: a.value }}
          />
        ))}
      </div>
      <TileCode>{`:root { --ff-accent: ${active}; }`}</TileCode>
    </Tile>
  );
}

function MagneticTile() {
  return (
    <Tile label="Magnetic" note="Hover the button — it trails the cursor.">
      <div className="hero-showcase__center">
        <Magnetic strength={0.45} radius={140}>
          <span className="hero-showcase__magnet-btn">
            Pull me
            <span aria-hidden="true" className="hero-showcase__magnet-arrow">→</span>
          </span>
        </Magnetic>
      </div>
      <TileCode>{`<Magnetic strength={0.45}>
  <button>Pull me →</button>
</Magnetic>`}</TileCode>
    </Tile>
  );
}

function StaggerTile() {
  const [run, setRun] = useState(0);

  return (
    <Tile label="Stagger reveal" note="Click replay to play the choreo.">
      <div key={run} className="hero-showcase__stagger">
        <Reveal beat="structure" variant="stagger-children">
          <div className="hero-showcase__bars">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} data-reveal-child className="hero-showcase__bar" />
            ))}
          </div>
        </Reveal>
      </div>
      <button
        type="button"
        className="hero-showcase__replay"
        onClick={() => setRun((n) => n + 1)}
      >
        ↻ Replay
      </button>
    </Tile>
  );
}

/* ─── Tile chrome ─────────────────────────────────────────────────── */

interface TileProps {
  label: string;
  note: string;
  children: React.ReactNode;
}
function Tile({ label, note, children }: TileProps) {
  return (
    <article className="hero-showcase__tile">
      <header className="hero-showcase__header">
        <span className="hero-showcase__label">{label}</span>
        <span className="hero-showcase__dot" aria-hidden="true" />
      </header>
      <div className="hero-showcase__body">{children}</div>
      <p className="hero-showcase__note">{note}</p>
    </article>
  );
}

function TileCode({ children }: { children: string }) {
  return <pre className="hero-showcase__code"><code>{children}</code></pre>;
}

/* ─── Styles ──────────────────────────────────────────────────────── */

const SHOWCASE_CSS = /* css */ `
.hero-showcase__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--ff-space-5);
}

.hero-showcase__tile {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--ff-space-4);
  padding: var(--ff-space-5);
  border: 1px solid var(--ff-border);
  border-radius: var(--ff-radius-sharp);
  background: var(--ff-surface-raised);
  min-height: 240px;
  transition: border-color 300ms cubic-bezier(0.25, 1, 0.5, 1),
              transform 400ms cubic-bezier(0.16, 1, 0.3, 1);
}
.hero-showcase__tile:hover {
  border-color: var(--ff-border-strong);
  transform: translateY(-2px);
}

.hero-showcase__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hero-showcase__label {
  font-family: var(--ff-font-body);
  font-size: var(--ff-type-eyebrow);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ff-text-tertiary);
  font-weight: 500;
}
.hero-showcase__dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: var(--ff-accent);
  transition: background 200ms ease;
}

.hero-showcase__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--ff-space-3);
  padding: var(--ff-space-4) 0;
}

.hero-showcase__center {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
}

.hero-showcase__note {
  margin: 0;
  font-family: var(--ff-font-body);
  font-size: var(--ff-type-body-sm);
  color: var(--ff-text-secondary);
  line-height: 1.5;
}

.hero-showcase__code {
  margin: 0;
  padding: var(--ff-space-3) var(--ff-space-4);
  background: var(--ff-surface);
  border: 1px solid var(--ff-border);
  border-radius: var(--ff-radius-sharp);
  font-family: var(--ff-font-mono);
  font-size: 0.78rem;
  color: var(--ff-text-secondary);
  overflow-x: auto;
  line-height: 1.5;
}
.hero-showcase__code code {
  font: inherit;
  background: transparent;
  border: 0;
  padding: 0;
  white-space: pre;
}

/* Swatch row */
.hero-showcase__swatches {
  display: flex;
  gap: var(--ff-space-3);
  justify-content: center;
  align-items: center;
}
.hero-showcase__swatch {
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  border: 1px solid var(--ff-border);
  cursor: pointer;
  padding: 0;
  transition: transform 200ms cubic-bezier(0.25, 1, 0.5, 1),
              box-shadow 200ms cubic-bezier(0.25, 1, 0.5, 1);
}
.hero-showcase__swatch:hover {
  transform: scale(1.12);
}
.hero-showcase__swatch[data-active="true"] {
  box-shadow: 0 0 0 2px var(--ff-paper), 0 0 0 3px var(--ff-text-primary);
  transform: scale(1.12);
}

/* Magnetic CTA */
.hero-showcase__magnet-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--ff-space-3);
  padding: var(--ff-space-3) var(--ff-space-5);
  border: 1px solid var(--ff-text-primary);
  border-radius: 9999px;
  background: var(--ff-text-primary);
  color: var(--ff-paper);
  font-family: var(--ff-font-body);
  font-size: var(--ff-type-body-sm);
  font-weight: 500;
  cursor: pointer;
  user-select: none;
}
.hero-showcase__magnet-arrow {
  transition: transform 300ms cubic-bezier(0.25, 1, 0.5, 1);
}
.hero-showcase__magnet-btn:hover .hero-showcase__magnet-arrow {
  transform: translateX(4px);
}

/* Stagger tile */
.hero-showcase__stagger {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 72px;
}
.hero-showcase__bars {
  display: flex;
  align-items: flex-end;
  gap: var(--ff-space-2);
  height: 60px;
}
.hero-showcase__bar {
  display: block;
  width: 10px;
  border-radius: 2px;
  background: var(--ff-accent);
}
.hero-showcase__bar:nth-child(1) { height: 28px; }
.hero-showcase__bar:nth-child(2) { height: 44px; }
.hero-showcase__bar:nth-child(3) { height: 60px; }
.hero-showcase__bar:nth-child(4) { height: 36px; }
.hero-showcase__bar:nth-child(5) { height: 52px; }

.hero-showcase__replay {
  align-self: flex-start;
  background: transparent;
  border: 1px solid var(--ff-border);
  color: var(--ff-text-secondary);
  padding: 0.4rem 0.8rem;
  border-radius: var(--ff-radius-sharp);
  cursor: pointer;
  font-family: var(--ff-font-body);
  font-size: var(--ff-type-body-sm);
  transition: border-color 200ms cubic-bezier(0.25, 1, 0.5, 1),
              color 200ms cubic-bezier(0.25, 1, 0.5, 1);
}
.hero-showcase__replay:hover {
  border-color: var(--ff-text-primary);
  color: var(--ff-text-primary);
}
`;

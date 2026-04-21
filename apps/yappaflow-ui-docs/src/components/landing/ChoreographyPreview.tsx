"use client";

import { useState } from "react";
import { Reveal } from "yappaflow-ui/motion";
import { Body, Eyebrow, Display } from "yappaflow-ui/primitives";

/**
 * <ChoreographyPreview> — live-replaying beat preview for the landing.
 *
 * The full interactive version lives at /motion-lab. Here we just cycle a
 * structure → primary → secondary → cta sequence on a button tap so the
 * landing shows *actual* library motion, not a static mock.
 */
export function ChoreographyPreview() {
  // Bumping `run` remounts the Reveal children, which replays the entry.
  const [run, setRun] = useState(0);

  return (
    <div className="choreo-preview">
      <div key={run} className="choreo-preview__stage" aria-live="polite">
        <Reveal beat="structure" variant="fade-translate">
          <Eyebrow>Structure beat — 0ms</Eyebrow>
        </Reveal>
        <Reveal beat="primary" variant="text-lines" stagger="text">
          <Display size="sm" tracking="tight" balance>
            {"Primary beat —\n200–600ms stagger."}
          </Display>
        </Reveal>
        <Reveal beat="secondary" variant="fade-translate">
          <Body size="lg" tone="secondary">
            Secondary beat at 400ms, quieter and a little later — so the eye
            finishes on the headline.
          </Body>
        </Reveal>
        <Reveal beat="cta" variant="fade-translate">
          <div className="choreo-preview__cta-row">
            <span className="choreo-preview__pill">CTA · 600ms</span>
          </div>
        </Reveal>
      </div>

      <button
        type="button"
        onClick={() => setRun((n) => n + 1)}
        className="choreo-preview__replay"
      >
        ↻ Replay
      </button>

      <style>{CSS}</style>
    </div>
  );
}

const CSS = /* css */ `
.choreo-preview {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ff-space-5);
  padding: var(--ff-space-7) var(--ff-space-5);
  border: 1px solid var(--ff-border);
  border-radius: var(--ff-radius-sharp);
  background: var(--ff-surface-raised);
  min-height: 280px;
  width: 100%;
  max-width: 720px;
}
.choreo-preview__stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ff-space-4);
  text-align: center;
  width: 100%;
}
.choreo-preview__cta-row {
  display: inline-flex;
  align-items: center;
  gap: var(--ff-space-3);
}
.choreo-preview__pill {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--ff-accent);
  border-radius: 9999px;
  color: var(--ff-accent);
  font-family: var(--ff-font-body);
  font-size: var(--ff-type-body-sm);
  font-weight: 500;
  letter-spacing: 0.04em;
}
.choreo-preview__replay {
  background: transparent;
  border: 1px solid var(--ff-border);
  color: var(--ff-text-secondary);
  padding: 0.5rem 1rem;
  border-radius: var(--ff-radius-sharp);
  cursor: pointer;
  font-family: var(--ff-font-body);
  font-size: var(--ff-type-body-sm);
  transition:
    border-color 200ms cubic-bezier(0.25, 1, 0.5, 1),
    color 200ms cubic-bezier(0.25, 1, 0.5, 1);
}
.choreo-preview__replay:hover {
  border-color: var(--ff-text-primary);
  color: var(--ff-text-primary);
}
`;

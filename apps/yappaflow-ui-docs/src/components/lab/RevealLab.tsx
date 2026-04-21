"use client";

import { useState } from "react";
import { Reveal } from "yappaflow-ui/motion";
import { Display, Body, Eyebrow, Stack } from "yappaflow-ui/primitives";
import type { RevealVariant } from "yappaflow-ui/motion";
import type { ChoreographyName } from "yappaflow-ui/tokens";

const BEATS: ChoreographyName[] = ["structure", "primary", "secondary", "cta"];
const VARIANTS: RevealVariant[] = [
  "fade-translate",
  "text-lines",
  "text-words",
  "mask-up",
  "stagger-children",
];
const STAGGERS = ["text", "default", "section"] as const;
type StaggerKey = (typeof STAGGERS)[number];

const BEAT_TIMING: Record<ChoreographyName, string> = {
  structure: "0–200ms · shell settles",
  primary: "200–600ms · main headline",
  secondary: "400–900ms · supporting copy",
  cta: "600ms · call to action",
};

/**
 * <RevealLab> — the choreography-lab interactive.
 *
 * Lets you pick beat / variant / stagger and hit Replay to see the exact
 * animation the library ships, with no page reload. This is the live
 * equivalent of Storybook Controls.
 */
export function RevealLab() {
  const [beat, setBeat] = useState<ChoreographyName>("primary");
  const [variant, setVariant] = useState<RevealVariant>("text-lines");
  const [stagger, setStagger] = useState<StaggerKey>("text");
  const [run, setRun] = useState(0);

  const isTextVariant = variant === "text-lines" || variant === "text-words";

  return (
    <div className="reveal-lab">
      <div className="reveal-lab__controls">
        <Stack rhythm="gutter">
          <Eyebrow>Controls</Eyebrow>

          <ControlGroup label="Beat">
            <OptionRow
              options={BEATS}
              value={beat}
              onChange={setBeat}
              renderLabel={(b) => b}
            />
            <Body size="sm" tone="tertiary">
              {BEAT_TIMING[beat]}
            </Body>
          </ControlGroup>

          <ControlGroup label="Variant">
            <OptionRow
              options={VARIANTS}
              value={variant}
              onChange={setVariant}
              renderLabel={(v) => v}
            />
          </ControlGroup>

          <ControlGroup label="Stagger" disabled={!isTextVariant}>
            <OptionRow
              options={STAGGERS}
              value={stagger}
              onChange={setStagger}
              renderLabel={(s) => s}
              disabled={!isTextVariant}
            />
            {!isTextVariant && (
              <Body size="sm" tone="tertiary">
                Stagger applies to text variants only.
              </Body>
            )}
          </ControlGroup>

          <button
            type="button"
            className="landing-cta landing-cta--primary"
            onClick={() => setRun((n) => n + 1)}
          >
            ↻ Replay
          </button>
        </Stack>
      </div>

      <div className="reveal-lab__stage">
        <div key={`${beat}-${variant}-${stagger}-${run}`} className="reveal-lab__stage-inner">
          <Reveal beat={beat} variant={variant} stagger={isTextVariant ? stagger : undefined}>
            {variant === "stagger-children" ? (
              <StaggerChildrenDemo />
            ) : (
              <Display size="md" tracking="tight" balance>
                {"Adjust the controls.\nReplay to see the beat."}
              </Display>
            )}
          </Reveal>
        </div>
      </div>

      <style>{CSS}</style>
    </div>
  );
}

function StaggerChildrenDemo() {
  return (
    <Stack rhythm="gutter">
      <Display size="sm" tracking="tight">Staggered children</Display>
      <Body tone="secondary">First — enters on schedule.</Body>
      <Body tone="secondary">Second — delayed by stagger token.</Body>
      <Body tone="secondary">Third — final beat of the sequence.</Body>
    </Stack>
  );
}

function ControlGroup({
  label,
  disabled,
  children,
}: {
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="reveal-lab__group" data-disabled={disabled || undefined}>
      <span className="reveal-lab__group-label">{label}</span>
      {children}
    </div>
  );
}

function OptionRow<T extends string>({
  options,
  value,
  onChange,
  renderLabel,
  disabled,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  renderLabel: (v: T) => string;
  disabled?: boolean;
}) {
  return (
    <div className="reveal-lab__options" role="radiogroup">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={value === opt}
          className="reveal-lab__option"
          data-selected={value === opt}
          onClick={() => !disabled && onChange(opt)}
          disabled={disabled}
        >
          {renderLabel(opt)}
        </button>
      ))}
    </div>
  );
}

const CSS = /* css */ `
.reveal-lab {
  display: grid;
  grid-template-columns: minmax(260px, 340px) 1fr;
  gap: var(--ff-space-6);
  border: 1px solid var(--ff-border);
  border-radius: var(--ff-radius-sharp);
  overflow: hidden;
}
@media (max-width: 900px) {
  .reveal-lab {
    grid-template-columns: 1fr;
  }
}
.reveal-lab__controls {
  padding: var(--ff-space-6);
  background: var(--ff-surface);
  border-right: 1px solid var(--ff-border);
}
@media (max-width: 900px) {
  .reveal-lab__controls {
    border-right: 0;
    border-bottom: 1px solid var(--ff-border);
  }
}
.reveal-lab__stage {
  position: relative;
  background: var(--ff-paper);
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--ff-space-7) var(--ff-space-6);
  overflow: hidden;
}
.reveal-lab__stage-inner {
  width: 100%;
  max-width: 640px;
  text-align: left;
}
.reveal-lab__group {
  display: flex;
  flex-direction: column;
  gap: var(--ff-space-2);
}
.reveal-lab__group[data-disabled="true"] .reveal-lab__group-label {
  color: var(--ff-text-tertiary);
}
.reveal-lab__group-label {
  font-family: var(--ff-font-body);
  font-size: var(--ff-type-eyebrow, 0.75rem);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ff-text-secondary);
  font-weight: 500;
}
.reveal-lab__options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ff-space-2);
}
.reveal-lab__option {
  padding: 0.4rem 0.8rem;
  background: transparent;
  border: 1px solid var(--ff-border);
  border-radius: 9999px;
  color: var(--ff-text-secondary);
  font-family: var(--ff-font-body);
  font-size: var(--ff-type-body-sm);
  cursor: pointer;
  transition:
    border-color 200ms cubic-bezier(0.25, 1, 0.5, 1),
    color 200ms cubic-bezier(0.25, 1, 0.5, 1),
    background 200ms cubic-bezier(0.25, 1, 0.5, 1);
}
.reveal-lab__option:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.reveal-lab__option[data-selected="true"] {
  background: var(--ff-text-primary);
  border-color: var(--ff-text-primary);
  color: var(--ff-paper);
}
`;

import { Stack, Body, Eyebrow } from "yappaflow-ui/primitives";

/**
 * <TimingContract> — the page-load choreography timeline.
 *
 * A static visual representation of the timing contract every Yappaflow
 * site inherits: structure 0–200ms, primary 200–600ms, secondary 400–900ms,
 * CTA at 600ms, full sequence capped at 1200ms.
 */
const SEQ_MS = 1200;

const BEATS = [
  { name: "Structure", start: 0, end: 200, color: "var(--ff-text-tertiary)" },
  { name: "Primary", start: 200, end: 600, color: "var(--ff-accent)" },
  { name: "Secondary", start: 400, end: 900, color: "var(--ff-text-secondary)" },
  { name: "CTA", start: 600, end: 900, color: "var(--ff-text-primary)" },
];

export function TimingContract() {
  return (
    <Stack rhythm="breath">
      <Eyebrow>Timing contract</Eyebrow>
      <Body tone="secondary">
        Every entry on every page follows this sequence. Override tokens in
        <code> tokens/motion.ts </code> to bend the whole library at once.
      </Body>

      <div className="timing">
        <div className="timing__scale" aria-hidden="true">
          {[0, 200, 400, 600, 800, 1000, 1200].map((ms) => (
            <div key={ms} className="timing__tick" style={{ left: `${(ms / SEQ_MS) * 100}%` }}>
              <span>{ms}</span>
            </div>
          ))}
        </div>
        <div className="timing__track">
          {BEATS.map((b) => (
            <div
              key={b.name}
              className="timing__bar"
              style={{
                left: `${(b.start / SEQ_MS) * 100}%`,
                width: `${((b.end - b.start) / SEQ_MS) * 100}%`,
                background: b.color,
              }}
              title={`${b.name} — ${b.start}–${b.end}ms`}
            >
              <span className="timing__bar-label">{b.name}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{CSS}</style>
    </Stack>
  );
}

const CSS = /* css */ `
.timing {
  display: flex;
  flex-direction: column;
  gap: var(--ff-space-3);
  padding: var(--ff-space-5);
  border: 1px solid var(--ff-border);
  border-radius: var(--ff-radius-sharp);
  background: var(--ff-surface);
}
.timing__scale {
  position: relative;
  height: 20px;
  font-family: var(--ff-font-mono, ui-monospace, monospace);
  font-size: 0.72rem;
  color: var(--ff-text-tertiary);
}
.timing__tick {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
}
.timing__track {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: var(--ff-space-2);
  min-height: 140px;
}
.timing__bar {
  position: relative;
  height: 32px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  padding: 0 var(--ff-space-3);
  font-family: var(--ff-font-body);
  font-size: var(--ff-type-body-sm);
  color: var(--ff-paper);
  font-weight: 500;
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
.timing__bar:hover {
  transform: translateY(-1px);
}
.timing__bar-label {
  white-space: nowrap;
}
`;

import { Stack, Body, Eyebrow } from "yappaflow-ui/primitives";

/**
 * <EasingsInspector> — visual readout of yappaflow-ui's custom eases.
 *
 * The three bezier curves shipped by the library are drawn as SVG paths
 * so you can see the motion character at a glance. Values are hand-copied
 * from the tokens/motion.ts module so this stays a static server-rendered
 * component — no client JS needed.
 */
const EASINGS: Array<{
  name: string;
  css: string;
  control: [number, number, number, number];
  use: string;
}> = [
  {
    name: "yf-expo-out",
    css: "cubic-bezier(0.16, 1, 0.3, 1)",
    control: [0.16, 1, 0.3, 1],
    use: "Default for entry animations. Fast start, gentle settle.",
  },
  {
    name: "yf-quart-out",
    css: "cubic-bezier(0.25, 1, 0.5, 1)",
    control: [0.25, 1, 0.5, 1],
    use: "UI transitions (hover, focus, theme). Quicker than expo-out.",
  },
  {
    name: "yf-expo-in-out",
    css: "cubic-bezier(0.87, 0, 0.13, 1)",
    control: [0.87, 0, 0.13, 1],
    use: "Transforms that travel distance (pinned stories, slideshows).",
  },
];

export function EasingsInspector() {
  return (
    <Stack rhythm="breath">
      <Eyebrow>Motion tokens · easings</Eyebrow>
      <div className="easings-grid">
        {EASINGS.map((e) => (
          <div key={e.name} className="easing-card">
            <div className="easing-card__name">{e.name}</div>
            <svg
              viewBox="0 0 120 120"
              className="easing-card__curve"
              aria-hidden="true"
            >
              {/* Axis */}
              <line x1="8" y1="8" x2="8" y2="112" stroke="currentColor" strokeOpacity="0.18" />
              <line x1="8" y1="112" x2="112" y2="112" stroke="currentColor" strokeOpacity="0.18" />
              {/* Curve */}
              <path
                d={`M 8 112 C ${curvePoint(e.control[0], e.control[1])} ${curvePoint(e.control[2], e.control[3])} 112 8`}
                fill="none"
                stroke="var(--ff-accent)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <code className="easing-card__css">{e.css}</code>
            <Body size="sm" tone="tertiary">{e.use}</Body>
          </div>
        ))}
      </div>
      <style>{CSS}</style>
    </Stack>
  );
}

function curvePoint(x: number, y: number): string {
  // Map [0..1] -> [8..112] for x (left margin 8, width 104),
  //          -> [112..8] for y (flip because SVG y grows downward).
  const cx = 8 + x * 104;
  const cy = 112 - y * 104;
  return `${cx.toFixed(1)} ${cy.toFixed(1)}`;
}

const CSS = /* css */ `
.easings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--ff-space-5);
}
.easing-card {
  display: flex;
  flex-direction: column;
  gap: var(--ff-space-3);
  padding: var(--ff-space-5);
  border: 1px solid var(--ff-border);
  border-radius: var(--ff-radius-sharp);
  background: var(--ff-surface);
}
.easing-card__name {
  font-family: var(--ff-font-mono, ui-monospace, monospace);
  font-size: var(--ff-type-body-sm);
  color: var(--ff-text-primary);
}
.easing-card__curve {
  width: 100%;
  max-width: 160px;
  height: 160px;
  color: var(--ff-text-primary);
}
.easing-card__css {
  font-family: var(--ff-font-mono, ui-monospace, monospace);
  font-size: var(--ff-type-body-xs, 0.78rem);
  color: var(--ff-text-secondary);
  background: var(--ff-surface-raised);
  padding: 0.25rem 0.5rem;
  border-radius: 2px;
  align-self: flex-start;
  border: 1px solid var(--ff-border);
}
`;

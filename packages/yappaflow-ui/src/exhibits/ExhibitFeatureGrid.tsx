import type { CSSProperties } from "react";
import { Exhibit } from "../shell/Exhibit.js";
import { Frame } from "../primitives/Frame.js";
import { Stack } from "../primitives/Stack.js";
import { Display } from "../primitives/Display.js";
import { Body } from "../primitives/Body.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { Reveal } from "../motion/components/Reveal.js";
import { cn } from "../utils/cn.js";

/**
 * Bundled icon names. Render a simple inline SVG per name inside the
 * feature card. Pre-built so the AI just picks a name string instead of
 * emitting SVG markup. All icons are 28×28 with `currentColor` stroke.
 */
export type FeatureIconName =
  | "spark"
  | "leaf"
  | "compass"
  | "shield"
  | "wave"
  | "grid"
  | "orbit"
  | "lock"
  | "seed"
  | "pulse"
  | "bolt"
  | "layers";

export interface FeatureGridBlock {
  title: string;
  body: string;
  /** Optional icon name from the bundled set. */
  icon?: FeatureIconName;
}

export interface ExhibitFeatureGridProps {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  blocks: FeatureGridBlock[];
  /** Grid column count on desktop. Default 3. */
  columns?: 2 | 3 | 4;
  /** Layout style. `cards` wraps each block in a bordered tile; `plain` leaves them flat. */
  variant?: "cards" | "plain";
  id?: string;
  className?: string;
}

/**
 * <ExhibitFeatureGrid> — a dense multi-column feature grid.
 *
 * The workhorse section: a heading + N short feature blocks. Exhibits a
 * clean rhythm without going off the gallery grammar. Use for "Why us",
 * "How it works", "What you get", or any list of ≤4-word titles with a
 * one-line body under each.
 */
export function ExhibitFeatureGrid({
  eyebrow,
  heading,
  subheading,
  blocks,
  columns = 3,
  variant = "plain",
  id,
  className,
}: ExhibitFeatureGridProps) {
  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${columns === 2 ? 320 : columns === 3 ? 240 : 200}px, 1fr))`,
    gap: "var(--ff-space-6)",
  };

  return (
    <Exhibit id={id} tone="breathing" edge="contained" className={cn("ff-exhibit-feature-grid", className)}>
      <Frame span={12} offset="center">
        <Stack rhythm="room">
          <Reveal beat="structure" variant="fade-translate">
            <Stack rhythm="breath" align="start">
              {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
              <Display as="h2" size="md" tracking="tight">
                {heading}
              </Display>
              {subheading && (
                <Body size="lg" tone="secondary" style={{ maxWidth: "var(--ff-measure-reading)" }}>
                  {subheading}
                </Body>
              )}
            </Stack>
          </Reveal>

          <Reveal beat="primary" variant="stagger-children" trigger="in-view">
            <div className="ff-feature-grid" style={gridStyle}>
              {blocks.map((b, i) => (
                <FeatureCard key={i} block={b} variant={variant} />
              ))}
            </div>
          </Reveal>
        </Stack>
      </Frame>
    </Exhibit>
  );
}

function FeatureCard({ block, variant }: { block: FeatureGridBlock; variant: "cards" | "plain" }) {
  const cardStyle: CSSProperties = variant === "cards"
    ? {
        padding: "var(--ff-space-5)",
        border: "1px solid var(--ff-text-tertiary, rgba(0,0,0,0.12))",
        borderRadius: "var(--ff-radius-soft)",
        background: "var(--ff-paper)",
      }
    : { padding: 0 };

  return (
    <div className="ff-feature-card" style={cardStyle}>
      <Stack rhythm="gutter" align="start">
        {block.icon && <FeatureIcon name={block.icon} />}
        <Display as="h3" size="sm" tracking="tight" balance={false}>
          {block.title}
        </Display>
        <Body size="md" tone="secondary">
          {block.body}
        </Body>
      </Stack>
    </div>
  );
}

function FeatureIcon({ name }: { name: FeatureIconName }) {
  const common = {
    width: 28,
    height: 28,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    style: { color: "var(--ff-text-primary)", display: "block" },
  };
  switch (name) {
    case "spark":
      return <svg {...common}><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M5.6 18.4l4.2-4.2M14.2 9.8l4.2-4.2" /></svg>;
    case "leaf":
      return <svg {...common}><path d="M4 20c8 0 16-8 16-16-8 0-16 8-16 16z" /><path d="M4 20C10 14 14 10 20 4" /></svg>;
    case "compass":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m14.5 9.5-5 1.5 1.5 5 5-1.5z" /></svg>;
    case "shield":
      return <svg {...common}><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" /></svg>;
    case "wave":
      return <svg {...common}><path d="M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" /><path d="M3 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0" /></svg>;
    case "grid":
      return <svg {...common}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
    case "orbit":
      return <svg {...common}><ellipse cx="12" cy="12" rx="9" ry="4" /><circle cx="12" cy="12" r="2" /></svg>;
    case "lock":
      return <svg {...common}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 1 1 8 0v4" /></svg>;
    case "seed":
      return <svg {...common}><path d="M12 3c4 3 5 8 0 14-5-6-4-11 0-14z" /><path d="M12 10v7" /></svg>;
    case "pulse":
      return <svg {...common}><path d="M3 12h4l2-5 4 10 2-5h6" /></svg>;
    case "bolt":
      return <svg {...common}><path d="M13 3 5 14h6l-2 7 8-11h-6z" /></svg>;
    case "layers":
      return <svg {...common}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /><path d="m3 17 9 5 9-5" /></svg>;
  }
}

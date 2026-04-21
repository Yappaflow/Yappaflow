import type { CSSProperties, ReactNode } from "react";
import { Exhibit } from "../shell/Exhibit.js";
import { Frame } from "../primitives/Frame.js";
import { Stack } from "../primitives/Stack.js";
import { Display } from "../primitives/Display.js";
import { Body } from "../primitives/Body.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { Reveal } from "../motion/components/Reveal.js";
import { cn } from "../utils/cn.js";

export interface SplitCTA {
  label: string;
  href:  string;
}

export interface ExhibitSplitProps {
  eyebrow?:       string;
  heading:        string;
  body:           string;
  cta?:           SplitCTA;
  /** Side to place the media panel on. Default "right". */
  media?:         "left" | "right";
  /** Optional caption / overline under the media panel. */
  mediaCaption?:  string;
  /** Optional bespoke media content. Falls back to a tasteful SVG motif. */
  mediaSlot?:     ReactNode;
  id?:            string;
  className?:     string;
}

/**
 * <ExhibitSplit> — two-panel section (copy + media).
 *
 * Left/right 50/50 grid at desktop, stacked at mobile. The media panel
 * has no external image by default — it renders an inline SVG "grain
 * field" that picks up the brand accent, so every split still ships
 * something visual without stock photography. Pass `mediaSlot` to
 * override.
 */
export function ExhibitSplit({
  eyebrow,
  heading,
  body,
  cta,
  media = "right",
  mediaCaption,
  mediaSlot,
  id,
  className,
}: ExhibitSplitProps) {
  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "var(--ff-space-7)",
    alignItems: "center",
  };

  const mediaOrder = media === "left" ? -1 : 1;

  return (
    <Exhibit id={id} tone="breathing" edge="contained" className={cn("ff-exhibit-split", className)}>
      <Frame span={12} offset="center">
        <div style={gridStyle}>
          <Reveal beat="structure" variant="fade-translate" trigger="in-view">
            <Stack rhythm="breath" align="start" style={{ order: mediaOrder * -1 }}>
              {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
              <Display as="h2" size="md" tracking="tight">
                {heading}
              </Display>
              <Body size="lg" tone="secondary" style={{ maxWidth: "var(--ff-measure-reading)" }}>
                {body}
              </Body>
              {cta && (
                <a
                  href={cta.href}
                  style={{
                    marginTop: "var(--ff-space-3)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--ff-space-2)",
                    padding: "var(--ff-space-3) var(--ff-space-5)",
                    background: "var(--ff-text-primary)",
                    color: "var(--ff-paper)",
                    borderRadius: "var(--ff-radius-sharp)",
                    fontFamily: "var(--ff-font-body)",
                    fontSize: "var(--ff-type-body-md)",
                    fontWeight: "var(--ff-weight-medium)" as unknown as number,
                    textDecoration: "none",
                  }}
                >
                  <span>{cta.label}</span>
                  <span aria-hidden="true">→</span>
                </a>
              )}
            </Stack>
          </Reveal>

          <Reveal beat="primary" variant="mask-up" trigger="in-view">
            <div
              style={{
                order: mediaOrder,
                aspectRatio: "4 / 3",
                borderRadius: "var(--ff-radius-soft)",
                overflow: "hidden",
                position: "relative",
                background: "var(--ff-surface-inset, rgba(0,0,0,0.03))",
              }}
            >
              {mediaSlot ?? <DefaultMedia />}
              {mediaCaption && (
                <span
                  style={{
                    position: "absolute",
                    bottom: "var(--ff-space-4)",
                    left: "var(--ff-space-4)",
                    padding: "var(--ff-space-2) var(--ff-space-3)",
                    background: "var(--ff-paper)",
                    color: "var(--ff-text-primary)",
                    fontFamily: "var(--ff-font-body)",
                    fontSize: "var(--ff-type-eyebrow)",
                    letterSpacing: "var(--ff-tracking-eyebrow)",
                    textTransform: "uppercase",
                    borderRadius: "var(--ff-radius-sharp)",
                  }}
                >
                  {mediaCaption}
                </span>
              )}
            </div>
          </Reveal>
        </div>
      </Frame>
    </Exhibit>
  );
}

function DefaultMedia() {
  return (
    <svg
      viewBox="0 0 400 300"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label=""
      style={{ width: "100%", height: "100%", display: "block", color: "var(--ff-text-primary)" }}
    >
      <defs>
        <pattern id="ff-split-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M0 0L16 0M0 0L0 16" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="400" height="300" fill="url(#ff-split-grid)" />
      <circle cx="280" cy="120" r="90" fill="currentColor" fillOpacity="0.08" />
      <circle cx="120" cy="220" r="60" fill="currentColor" fillOpacity="0.12" />
    </svg>
  );
}

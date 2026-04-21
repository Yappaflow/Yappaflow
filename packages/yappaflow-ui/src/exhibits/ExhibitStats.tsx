import type { CSSProperties } from "react";
import { Exhibit } from "../shell/Exhibit.js";
import { Frame } from "../primitives/Frame.js";
import { Stack } from "../primitives/Stack.js";
import { Display } from "../primitives/Display.js";
import { Body } from "../primitives/Body.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { Reveal } from "../motion/components/Reveal.js";
import { cn } from "../utils/cn.js";

export interface StatBlock {
  value: string;
  label: string;
  context?: string;
}

export interface ExhibitStatsProps {
  eyebrow?: string;
  heading?: string;
  blocks: StatBlock[];
  id?: string;
  className?: string;
}

/**
 * <ExhibitStats> — large numeric highlights.
 *
 * A row of 2-5 stats with oversized values. The bigger the number, the
 * more the gallery wall feels like it has weight. Use for proof: "500
 * brands shipped", "12 years in practice", "98% retention".
 */
export function ExhibitStats({
  eyebrow,
  heading,
  blocks,
  id,
  className,
}: ExhibitStatsProps) {
  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`,
    gap: "var(--ff-space-6)",
    alignItems: "end",
  };

  return (
    <Exhibit id={id} tone="breathing" edge="contained" className={cn("ff-exhibit-stats", className)}>
      <Frame span={12} offset="center">
        <Stack rhythm="room">
          {(heading || eyebrow) && (
            <Reveal beat="structure" variant="fade-translate">
              <Stack rhythm="breath" align="start">
                {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
                {heading && (
                  <Display as="h2" size="md" tracking="tight">
                    {heading}
                  </Display>
                )}
              </Stack>
            </Reveal>
          )}

          <Reveal beat="primary" variant="stagger-children" trigger="in-view">
            <div style={gridStyle}>
              {blocks.map((b, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--ff-space-2)",
                    borderLeft: "1px solid var(--ff-text-tertiary, rgba(0,0,0,0.15))",
                    paddingLeft: "var(--ff-space-4)",
                  }}
                >
                  <Display as="p" size="xl" tracking="tight" balance={false} style={{ fontFeatureSettings: "'tnum'" }}>
                    {b.value}
                  </Display>
                  <Body size="md" tone="primary" style={{ fontWeight: "var(--ff-weight-medium)" as unknown as number }}>
                    {b.label}
                  </Body>
                  {b.context && (
                    <Body size="sm" tone="tertiary">
                      {b.context}
                    </Body>
                  )}
                </div>
              ))}
            </div>
          </Reveal>
        </Stack>
      </Frame>
    </Exhibit>
  );
}

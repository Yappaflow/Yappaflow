import { Exhibit } from "../shell/Exhibit.js";
import { Frame } from "../primitives/Frame.js";
import { Stack } from "../primitives/Stack.js";
import { Display } from "../primitives/Display.js";
import { Body } from "../primitives/Body.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { Reveal } from "../motion/components/Reveal.js";
import { cn } from "../utils/cn.js";

export interface TimelineEntry {
  /** Short marker — year, season, or step number. */
  marker: string;
  title: string;
  body: string;
}

export interface ExhibitTimelineProps {
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  entries: TimelineEntry[];
  id?: string;
  className?: string;
}

/**
 * <ExhibitTimeline> — vertical timeline.
 *
 * A narrow left column for markers (years, "01, 02, 03", phases) and a
 * wider right column for the matching title + body. The left column is
 * visually quiet so the right-column type carries the section.
 */
export function ExhibitTimeline({
  eyebrow,
  heading,
  subheading,
  entries,
  id,
  className,
}: ExhibitTimelineProps) {
  return (
    <Exhibit id={id} tone="breathing" edge="contained" className={cn("ff-exhibit-timeline", className)}>
      <Frame span={10} offset="center">
        <Stack rhythm="room">
          {(heading || eyebrow || subheading) && (
            <Reveal beat="structure" variant="fade-translate">
              <Stack rhythm="breath" align="start">
                {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
                {heading && (
                  <Display as="h2" size="md" tracking="tight">
                    {heading}
                  </Display>
                )}
                {subheading && (
                  <Body size="lg" tone="secondary" style={{ maxWidth: "var(--ff-measure-reading)" }}>
                    {subheading}
                  </Body>
                )}
              </Stack>
            </Reveal>
          )}

          <div style={{ display: "flex", flexDirection: "column" }}>
            {entries.map((e, i) => (
              <Reveal key={i} beat="primary" variant="fade-translate" trigger="in-view">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr",
                    gap: "var(--ff-space-6)",
                    padding: "var(--ff-space-5) 0",
                    borderTop: i === 0 ? "1px solid var(--ff-text-tertiary, rgba(0,0,0,0.12))" : "none",
                    borderBottom: "1px solid var(--ff-text-tertiary, rgba(0,0,0,0.12))",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--ff-font-display)",
                      fontSize: "var(--ff-type-display-sm)",
                      color: "var(--ff-text-tertiary, rgba(0,0,0,0.6))",
                      fontFeatureSettings: "'tnum'",
                      lineHeight: 1,
                    }}
                  >
                    {e.marker}
                  </div>
                  <Stack rhythm="gutter" align="start">
                    <Display as="h3" size="sm" tracking="tight" balance={false}>
                      {e.title}
                    </Display>
                    <Body size="md" tone="secondary" style={{ maxWidth: "var(--ff-measure-reading)" }}>
                      {e.body}
                    </Body>
                  </Stack>
                </div>
              </Reveal>
            ))}
          </div>
        </Stack>
      </Frame>
    </Exhibit>
  );
}

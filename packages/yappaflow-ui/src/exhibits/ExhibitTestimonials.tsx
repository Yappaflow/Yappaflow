import type { CSSProperties } from "react";
import { Exhibit } from "../shell/Exhibit.js";
import { Frame } from "../primitives/Frame.js";
import { Stack } from "../primitives/Stack.js";
import { Display } from "../primitives/Display.js";
import { Body } from "../primitives/Body.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { Reveal } from "../motion/components/Reveal.js";
import { cn } from "../utils/cn.js";

export interface TestimonialBlock {
  quote: string;
  author: string;
  role?: string;
}

export interface ExhibitTestimonialsProps {
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  blocks: TestimonialBlock[];
  /** Grid columns on desktop. Default 2. */
  columns?: 1 | 2 | 3;
  id?: string;
  className?: string;
}

/**
 * <ExhibitTestimonials> — quote grid exhibit.
 *
 * Each block is a short quote + attribution. Renders with a large
 * typographic quote mark, generous line-height, and a soft surface tone
 * — art gallery wall-text energy, not Web 2.0 star-rating cards.
 */
export function ExhibitTestimonials({
  eyebrow,
  heading,
  subheading,
  blocks,
  columns = 2,
  id,
  className,
}: ExhibitTestimonialsProps) {
  const minCol = columns === 1 ? 420 : columns === 2 ? 320 : 260;
  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${minCol}px, 1fr))`,
    gap: "var(--ff-space-6)",
  };

  return (
    <Exhibit
      id={id}
      tone="breathing"
      edge="contained"
      className={cn("ff-exhibit-testimonials", className)}
    >
      <Frame span={12} offset="center">
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

          <Reveal beat="primary" variant="stagger-children" trigger="in-view">
            <div style={gridStyle}>
              {blocks.map((b, i) => (
                <TestimonialCard key={i} block={b} />
              ))}
            </div>
          </Reveal>
        </Stack>
      </Frame>
    </Exhibit>
  );
}

function TestimonialCard({ block }: { block: TestimonialBlock }) {
  return (
    <figure
      className="ff-testimonial"
      style={{
        margin: 0,
        padding: "var(--ff-space-6)",
        background: "var(--ff-surface-inset, rgba(0,0,0,0.03))",
        borderRadius: "var(--ff-radius-soft)",
        position: "relative",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "calc(var(--ff-space-5) * -1)",
          left: "var(--ff-space-5)",
          fontFamily: "var(--ff-font-display)",
          fontSize: "6rem",
          lineHeight: 1,
          color: "var(--ff-text-tertiary, rgba(0,0,0,0.15))",
          userSelect: "none",
        }}
      >
        {"\u201C"}
      </span>
      <Stack rhythm="breath" align="start">
        <Body size="lg" tone="primary" style={{ fontStyle: "italic" }}>
          {block.quote}
        </Body>
        <figcaption style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <Body size="md" tone="primary" style={{ fontWeight: "var(--ff-weight-medium)" as unknown as number }}>
            {block.author}
          </Body>
          {block.role && (
            <Body size="sm" tone="tertiary">
              {block.role}
            </Body>
          )}
        </figcaption>
      </Stack>
    </figure>
  );
}

import { Exhibit } from "../shell/Exhibit.js";
import { Frame } from "../primitives/Frame.js";
import { Stack } from "../primitives/Stack.js";
import { Display } from "../primitives/Display.js";
import { Body } from "../primitives/Body.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { Reveal } from "../motion/components/Reveal.js";
import { cn } from "../utils/cn.js";

export interface FAQBlock {
  question: string;
  /** Answer body. Plain text or simple inline markup; no block HTML. */
  answer: string;
}

export interface ExhibitFAQProps {
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  blocks: FAQBlock[];
  id?: string;
  className?: string;
}

/**
 * <ExhibitFAQ> — accordion FAQ exhibit.
 *
 * Uses native HTML <details>/<summary> so interactivity works without
 * client JS. Styled with a quiet divider rhythm — museum wall-text, not
 * marketing-page zebra rows.
 */
export function ExhibitFAQ({
  eyebrow,
  heading,
  subheading,
  blocks,
  id,
  className,
}: ExhibitFAQProps) {
  return (
    <Exhibit id={id} tone="breathing" edge="contained" className={cn("ff-exhibit-faq", className)}>
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

          <Reveal beat="primary" variant="stagger-children" trigger="in-view">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                borderTop: "1px solid var(--ff-text-tertiary, rgba(0,0,0,0.12))",
              }}
            >
              {blocks.map((b, i) => (
                <FAQItem key={i} block={b} />
              ))}
            </div>
          </Reveal>
        </Stack>
      </Frame>
    </Exhibit>
  );
}

function FAQItem({ block }: { block: FAQBlock }) {
  return (
    <details
      className="ff-faq-item"
      style={{
        borderBottom: "1px solid var(--ff-text-tertiary, rgba(0,0,0,0.12))",
        padding: "var(--ff-space-4) 0",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          listStyle: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--ff-space-4)",
          fontFamily: "var(--ff-font-display)",
          fontSize: "var(--ff-type-display-sm)",
          fontWeight: "var(--ff-weight-medium)" as unknown as number,
          color: "var(--ff-text-primary)",
          lineHeight: 1.25,
        }}
      >
        <span>{block.question}</span>
        <span
          aria-hidden="true"
          className="ff-faq-chevron"
          style={{
            flexShrink: 0,
            width: 12,
            height: 12,
            borderRight: "1.5px solid currentColor",
            borderBottom: "1.5px solid currentColor",
            transform: "rotate(45deg)",
            transition: "transform 0.25s var(--ff-ease-smooth, ease)",
          }}
        />
      </summary>
      <div style={{ paddingTop: "var(--ff-space-3)", maxWidth: "var(--ff-measure-reading)" }}>
        <Body size="md" tone="secondary">
          {block.answer}
        </Body>
      </div>
    </details>
  );
}

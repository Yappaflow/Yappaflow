import { Exhibit } from "../shell/Exhibit.js";
import { Frame } from "../primitives/Frame.js";
import { Stack } from "../primitives/Stack.js";
import { Body } from "../primitives/Body.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { Reveal } from "../motion/components/Reveal.js";
import { cn } from "../utils/cn.js";

export interface ExhibitLogoCloudProps {
  eyebrow?: string;
  heading?: string;
  /** Wordmarks to render. Since the static export forbids external URLs, we
   * render each label as a typographic wordmark in the display font. */
  labels: string[];
  id?: string;
  className?: string;
}

/**
 * <ExhibitLogoCloud> — typographic client / partner strip.
 *
 * Zero external images (matches the prompt's "no external URLs" rule).
 * Renders each brand name in the display font at a quiet size so the row
 * reads as a considered wall of partners, not a cluttered logo grid.
 */
export function ExhibitLogoCloud({
  eyebrow,
  heading,
  labels,
  id,
  className,
}: ExhibitLogoCloudProps) {
  return (
    <Exhibit id={id} tone="dense" edge="contained" className={cn("ff-exhibit-logo-cloud", className)}>
      <Frame span={12} offset="center">
        <Stack rhythm="breath" align="start">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          {heading && (
            <Body size="md" tone="secondary">
              {heading}
            </Body>
          )}
          <Reveal beat="primary" variant="fade-translate" trigger="in-view">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--ff-space-6) var(--ff-space-8)",
                alignItems: "center",
                paddingTop: "var(--ff-space-3)",
                borderTop: "1px solid var(--ff-text-tertiary, rgba(0,0,0,0.12))",
              }}
            >
              {labels.map((label, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: "var(--ff-font-display)",
                    fontSize: "var(--ff-type-display-sm)",
                    fontWeight: "var(--ff-weight-medium)" as unknown as number,
                    letterSpacing: "var(--ff-tracking-display-tight)",
                    color: "var(--ff-text-tertiary, rgba(0,0,0,0.55))",
                    lineHeight: 1.1,
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </Reveal>
        </Stack>
      </Frame>
    </Exhibit>
  );
}

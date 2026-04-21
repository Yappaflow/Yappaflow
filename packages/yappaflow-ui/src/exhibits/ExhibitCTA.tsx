import { Exhibit } from "../shell/Exhibit.js";
import { Frame } from "../primitives/Frame.js";
import { Stack } from "../primitives/Stack.js";
import { Display } from "../primitives/Display.js";
import { Body } from "../primitives/Body.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { Reveal } from "../motion/components/Reveal.js";
import { AmbientLayer } from "../motion/components/AmbientLayer.js";
import { cn } from "../utils/cn.js";

export interface CTAButton {
  label: string;
  href:  string;
}

export interface ExhibitCTAProps {
  eyebrow?:    string;
  heading:     string;
  subheading?: string;
  primaryCta:  CTAButton;
  secondaryCta?: CTAButton;
  /** Reverse foreground/background colors for a "punch" band between other sections. */
  invert?:     boolean;
  /** Ambient treatment behind the block. Default "noise" on non-inverted, "none" on inverted. */
  ambient?:    "none" | "noise" | "drift" | "breathe";
  id?:         string;
  className?:  string;
}

/**
 * <ExhibitCTA> — a full-width call-to-action band.
 *
 * Good as a closer above the footer, or as a punch between two editorial
 * sections. Supports an optional secondary CTA and an `invert` mode that
 * flips fg/bg so the band reads as a break in the page.
 */
export function ExhibitCTA({
  eyebrow,
  heading,
  subheading,
  primaryCta,
  secondaryCta,
  invert = false,
  ambient,
  id,
  className,
}: ExhibitCTAProps) {
  const effectiveAmbient = ambient ?? (invert ? "none" : "noise");

  const bg = invert ? "var(--ff-text-primary)" : "var(--ff-paper)";
  const fg = invert ? "var(--ff-paper)" : "var(--ff-text-primary)";
  const subFg = invert ? "rgba(255,255,255,0.75)" : "var(--ff-text-secondary)";

  return (
    <Exhibit
      id={id}
      tone="signature"
      edge="full-bleed"
      rhythm="hall"
      className={cn("ff-exhibit-cta", className)}
      style={{ background: bg, color: fg, position: "relative", overflow: "hidden" }}
    >
      {effectiveAmbient !== "none" && (
        <AmbientLayer
          pattern={effectiveAmbient === "noise" ? "noise" : effectiveAmbient === "drift" ? "drift" : "breathe"}
          intensity="low"
        />
      )}
      <Frame span={10} offset="center">
        <Reveal beat="structure" variant="fade-translate" trigger="in-view">
          <Stack rhythm="breath" align="start">
            {eyebrow && <Eyebrow style={{ color: subFg }}>{eyebrow}</Eyebrow>}
            <Display as="h2" size="lg" tracking="tight" style={{ color: fg }}>
              {heading}
            </Display>
            {subheading && (
              <Body size="lg" tone="secondary" style={{ maxWidth: "var(--ff-measure-reading)", color: subFg }}>
                {subheading}
              </Body>
            )}
            <div style={{ display: "flex", gap: "var(--ff-space-3)", flexWrap: "wrap", paddingTop: "var(--ff-space-3)" }}>
              <a
                href={primaryCta.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--ff-space-2)",
                  padding: "var(--ff-space-3) var(--ff-space-5)",
                  background: invert ? "var(--ff-paper)" : "var(--ff-text-primary)",
                  color: invert ? "var(--ff-text-primary)" : "var(--ff-paper)",
                  borderRadius: "var(--ff-radius-sharp)",
                  fontFamily: "var(--ff-font-body)",
                  fontSize: "var(--ff-type-body-md)",
                  fontWeight: "var(--ff-weight-medium)" as unknown as number,
                  textDecoration: "none",
                }}
              >
                <span>{primaryCta.label}</span>
                <span aria-hidden="true">→</span>
              </a>
              {secondaryCta && (
                <a
                  href={secondaryCta.href}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--ff-space-2)",
                    padding: "var(--ff-space-3) var(--ff-space-5)",
                    background: "transparent",
                    color: fg,
                    borderRadius: "var(--ff-radius-sharp)",
                    border: `1px solid ${fg}`,
                    fontFamily: "var(--ff-font-body)",
                    fontSize: "var(--ff-type-body-md)",
                    fontWeight: "var(--ff-weight-medium)" as unknown as number,
                    textDecoration: "none",
                  }}
                >
                  <span>{secondaryCta.label}</span>
                </a>
              )}
            </div>
          </Stack>
        </Reveal>
      </Frame>
    </Exhibit>
  );
}

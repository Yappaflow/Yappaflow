"use client";

import { useRef, type ReactNode } from "react";
import { Exhibit } from "../shell/Exhibit.js";
import { Frame } from "../primitives/Frame.js";
import { Stack } from "../primitives/Stack.js";
import { Display } from "../primitives/Display.js";
import { Body } from "../primitives/Body.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { Reveal } from "../motion/components/Reveal.js";
import { AmbientLayer } from "../motion/components/AmbientLayer.js";
import { Magnetic } from "../motion/components/Magnetic.js";
import { useMagnetic } from "../motion/hooks/use-magnetic.js";
import { cn } from "../utils/cn.js";

export interface ExhibitHeroCTA {
  label: string;
  href: string;
}

export interface ExhibitHeroProps {
  /** Small uppercase label above the headline. */
  eyebrow?: string;
  /** The signature headline. Use \n for manual line breaks. */
  headline: string;
  /** One-line supporting text. */
  subtext?: string;
  /** Primary call-to-action. */
  cta?: ExhibitHeroCTA;
  /** Optional media slot (image, video) rendered behind/beside the type. */
  media?: ReactNode;
  /** Ambient background treatment. Default "noise". */
  ambient?: "none" | "noise" | "drift" | "breathe";
  /** Headline alignment within the canvas. Default "left". */
  alignment?: "left" | "center";
  /** Size of the display type. Default "lg". */
  size?: "lg" | "xl";
  className?: string;
}

/**
 * <ExhibitHero> — the canonical art-gallery hero.
 *
 * The default signature moment. Viewport-filling display type, offset
 * composition, optional ambient layer, entry choreography following the
 * top-design score:
 *
 *   structure  0–200ms  (shell settles)
 *   eyebrow    200ms    (structure beat)
 *   headline   200–600ms (primary beat, text-lines stagger)
 *   subtext    400–900ms (secondary beat)
 *   cta        600ms    (cta beat, magnetic)
 *
 * Everything is authored through the motion wrappers — no raw GSAP.
 */
export function ExhibitHero({
  eyebrow,
  headline,
  subtext,
  cta,
  media,
  ambient = "noise",
  alignment = "left",
  size = "lg",
  className,
}: ExhibitHeroProps) {
  const ctaRef = useRef<HTMLAnchorElement>(null);
  useMagnetic(ctaRef, { strength: 0.3, radius: 110 });

  return (
    <Exhibit
      tone="signature"
      edge="full-bleed"
      rhythm="hall"
      className={cn("ff-exhibit-hero", className)}
      style={{
        minHeight: "92vh",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {ambient !== "none" && (
        <AmbientLayer
          pattern={ambient === "noise" ? "noise" : ambient === "drift" ? "drift" : "breathe"}
          intensity="low"
        />
      )}

      <Frame span={12} offset={alignment === "center" ? "center" : "left"}>
        <Stack rhythm="breath" align={alignment === "center" ? "center" : "start"}>
          {eyebrow && (
            <Reveal beat="structure" variant="fade-translate">
              <Eyebrow>{eyebrow}</Eyebrow>
            </Reveal>
          )}

          <Reveal beat="primary" variant="text-lines" stagger="text">
            <Display size={size} tracking="tight" balance>
              {headline}
            </Display>
          </Reveal>

          {subtext && (
            <Reveal beat="secondary" variant="fade-translate">
              <Body size="lg" tone="secondary" style={{ maxWidth: "var(--ff-measure-reading)" }}>
                {subtext}
              </Body>
            </Reveal>
          )}

          {cta && (
            <Reveal beat="cta" variant="fade-translate">
              <Magnetic>
                <a
                  ref={ctaRef}
                  href={cta.href}
                  data-magnetic=""
                  className="ff-exhibit-hero__cta"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--ff-space-3)",
                    fontFamily: "var(--ff-font-body)",
                    fontSize: "var(--ff-type-body-md)",
                    fontWeight: "var(--ff-weight-medium)" as unknown as number,
                    padding: "var(--ff-space-3) var(--ff-space-5)",
                    background: "var(--ff-text-primary)",
                    color: "var(--ff-paper)",
                    borderRadius: "var(--ff-radius-sharp)",
                    willChange: "transform",
                  }}
                >
                  <span>{cta.label}</span>
                  <span aria-hidden="true" style={{ display: "inline-block" }}>→</span>
                </a>
              </Magnetic>
            </Reveal>
          )}

          {media && (
            <Reveal beat="secondary" variant="mask-up">
              <div style={{ marginTop: "var(--ff-space-7)" }}>{media}</div>
            </Reveal>
          )}
        </Stack>
      </Frame>
    </Exhibit>
  );
}

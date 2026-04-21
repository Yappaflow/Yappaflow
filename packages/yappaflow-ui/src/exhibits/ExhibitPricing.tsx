import type { CSSProperties } from "react";
import { Exhibit } from "../shell/Exhibit.js";
import { Frame } from "../primitives/Frame.js";
import { Stack } from "../primitives/Stack.js";
import { Display } from "../primitives/Display.js";
import { Body } from "../primitives/Body.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { Reveal } from "../motion/components/Reveal.js";
import { cn } from "../utils/cn.js";

export interface PricingTier {
  name:        string;
  price:       string;
  period?:     string;
  description?:string;
  features:    string[];
  cta:         { label: string; href: string };
  /** Highlight this tier — slightly heavier visual weight. */
  featured?:   boolean;
}

export interface ExhibitPricingProps {
  eyebrow?:    string;
  heading:     string;
  subheading?: string;
  tiers:       PricingTier[];
  id?:         string;
  className?:  string;
}

/**
 * <ExhibitPricing> — pricing tier exhibit.
 *
 * Up to 4 tiers side-by-side. Each tier tile has name, price, optional
 * period ("/mo"), a short description, a feature list (checkmark rows),
 * and a primary CTA. Featured tier inverts color for emphasis. No drop
 * shadows — featured tier is marked by a 1px ink border + inverted fill.
 */
export function ExhibitPricing({
  eyebrow,
  heading,
  subheading,
  tiers,
  id,
  className,
}: ExhibitPricingProps) {
  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))`,
    gap: "var(--ff-space-5)",
  };

  return (
    <Exhibit id={id} tone="breathing" edge="contained" className={cn("ff-exhibit-pricing", className)}>
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
            <div style={gridStyle}>
              {tiers.map((t, i) => (
                <PricingCard key={i} tier={t} />
              ))}
            </div>
          </Reveal>
        </Stack>
      </Frame>
    </Exhibit>
  );
}

function PricingCard({ tier }: { tier: PricingTier }) {
  const style: CSSProperties = {
    padding: "var(--ff-space-6)",
    border: "1px solid var(--ff-text-primary)",
    borderRadius: "var(--ff-radius-soft)",
    background: tier.featured ? "var(--ff-text-primary)" : "var(--ff-paper)",
    color: tier.featured ? "var(--ff-paper)" : "var(--ff-text-primary)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--ff-space-4)",
  };

  // When featured, override text tone CSS variables locally via inline colors.
  const labelColor = tier.featured ? "var(--ff-paper)" : "var(--ff-text-primary)";
  const subColor = tier.featured
    ? "rgba(255,255,255,0.75)"
    : "var(--ff-text-secondary)";
  const borderColor = tier.featured
    ? "rgba(255,255,255,0.25)"
    : "var(--ff-text-tertiary, rgba(0,0,0,0.12))";

  return (
    <div style={style}>
      <Eyebrow style={{ color: subColor }}>{tier.name}</Eyebrow>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--ff-space-2)" }}>
        <Display as="p" size="lg" tracking="tight" balance={false} style={{ color: labelColor }}>
          {tier.price}
        </Display>
        {tier.period && (
          <span style={{ fontFamily: "var(--ff-font-body)", fontSize: "var(--ff-type-body-md)", color: subColor }}>
            {tier.period}
          </span>
        )}
      </div>
      {tier.description && (
        <p style={{ fontFamily: "var(--ff-font-body)", fontSize: "var(--ff-type-body-md)", color: subColor, margin: 0, lineHeight: "var(--ff-leading-body)" }}>
          {tier.description}
        </p>
      )}
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "var(--ff-space-2)",
          paddingTop: "var(--ff-space-3)",
          borderTop: `1px solid ${borderColor}`,
        }}
      >
        {tier.features.map((f, i) => (
          <li key={i} style={{ display: "flex", gap: "var(--ff-space-3)", alignItems: "flex-start", fontFamily: "var(--ff-font-body)", fontSize: "var(--ff-type-body-md)", color: labelColor, lineHeight: "var(--ff-leading-body)" }}>
            <span aria-hidden="true" style={{ marginTop: "0.4em", width: 6, height: 6, borderRadius: "50%", background: labelColor, flexShrink: 0 }} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <a
        href={tier.cta.href}
        style={{
          marginTop: "auto",
          display: "inline-flex",
          justifyContent: "center",
          padding: "var(--ff-space-3) var(--ff-space-5)",
          background: tier.featured ? "var(--ff-paper)" : "var(--ff-text-primary)",
          color: tier.featured ? "var(--ff-text-primary)" : "var(--ff-paper)",
          borderRadius: "var(--ff-radius-sharp)",
          fontFamily: "var(--ff-font-body)",
          fontSize: "var(--ff-type-body-md)",
          fontWeight: "var(--ff-weight-medium)" as unknown as number,
          textDecoration: "none",
        }}
      >
        {tier.cta.label}
      </a>
    </div>
  );
}

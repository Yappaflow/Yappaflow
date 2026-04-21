import { Exhibit } from "yappaflow-ui/shell";
import { Frame, Stack, Display, Body, Eyebrow } from "yappaflow-ui/primitives";
import { Reveal, AmbientLayer } from "yappaflow-ui/motion";
import { PillarStrip } from "@/components/landing/PillarStrip";
import { CodeSurface } from "@/components/landing/CodeSurface";
import { ChoreographyPreview } from "@/components/landing/ChoreographyPreview";
import { HeroShowcase } from "@/components/landing/HeroShowcase";
import { BoldHero } from "@/components/landing/BoldHero";
import { Manifesto } from "@/components/landing/Manifesto";
import { StatementFade } from "@/components/landing/StatementFade";
import { ShowcaseReel } from "@/components/landing/ShowcaseReel";
import { DesignPrinciples } from "@/components/landing/DesignPrinciples";

export default function Home() {
  return (
    <>
      <BoldHero />
      <Manifesto />
      <StatementFade />
      <ShowcaseReel />
      <DesignPrinciples />

      <HeroShowcase />

      <PillarStrip />

      <Exhibit tone="breathing" edge="contained" rhythm="room">
        <AmbientLayer pattern="noise" intensity="low" />
        <Frame span={10} offset="center">
          <Stack rhythm="breath">
            <Reveal beat="structure" variant="fade-translate">
              <Eyebrow>
                <span style={{ color: "var(--ff-accent)" }}>●</span>&nbsp; Install
              </Eyebrow>
            </Reveal>

            <Reveal beat="primary" variant="text-lines" stagger="text">
              <Display size="sm" tracking="tight" balance>
                {"Five layers. One import.\nZero ceremony."}
              </Display>
            </Reveal>

            <Reveal beat="secondary" variant="fade-translate">
              <Body size="lg" tone="secondary">
                One install, one stylesheet import, one{" "}
                <code style={{ color: "var(--ff-accent)", fontFamily: "var(--ff-font-mono)" }}>
                  &lt;GalleryShell&gt;
                </code>
                . From there every primitive, shell piece, and exhibit is a
                named component away.
              </Body>
            </Reveal>

            <Reveal beat="cta" variant="fade-translate">
              <CodeSurface
                language="bash"
                code={`npm install yappaflow-ui`}
                caption="Published to NPM — MIT licensed."
              />
            </Reveal>

            <Reveal beat="cta" variant="fade-translate">
              <CodeSurface
                language="tsx"
                code={LANDING_EXAMPLE}
                caption="A complete first page."
              />
            </Reveal>
          </Stack>
        </Frame>
      </Exhibit>

      <Exhibit tone="signature" edge="full-bleed" rhythm="hall">
        <Frame span={12} offset="center">
          <Stack rhythm="hall" align="center">
            <Reveal beat="structure" variant="fade-translate">
              <Eyebrow>Motion, authored by token</Eyebrow>
            </Reveal>
            <Reveal beat="primary" variant="text-lines" stagger="text">
              <Display size="md" tracking="tight" balance>
                {"Every beat\non the same score."}
              </Display>
            </Reveal>
            <Reveal beat="secondary" variant="fade-translate">
              <Body size="lg" tone="secondary" style={{ maxWidth: "var(--ff-measure-reading)", textAlign: "center" }}>
                Structure at 0ms, primary at 200ms, secondary at 400ms, CTA at
                600ms. Every page gets the same rhythm for free — or swap the
                tokens once and restyle every site.
              </Body>
            </Reveal>
            <ChoreographyPreview />
          </Stack>
        </Frame>
      </Exhibit>

      <Exhibit tone="dense" edge="contained" rhythm="breath" className="landing-next">
        <Frame span={10} offset="center">
          <Stack rhythm="breath" align="center">
            <Reveal beat="structure" variant="fade-translate">
              <Eyebrow>
                <span style={{ color: "var(--ff-accent)" }}>●</span>&nbsp; Next
              </Eyebrow>
            </Reveal>
            <Reveal beat="primary" variant="text-lines" stagger="text">
              <Display size="sm" tracking="tight" balance>
                {"Read the docs\nor browse the gallery."}
              </Display>
            </Reveal>
            <Reveal beat="cta" variant="fade-translate">
              <div style={{ display: "flex", gap: "var(--ff-space-4)", flexWrap: "wrap", justifyContent: "center" }}>
                <a href="/gallery" className="landing-cta landing-cta--primary">
                  Component gallery
                </a>
                <a href="/docs/getting-started" className="landing-cta landing-cta--ghost">
                  Getting started
                </a>
              </div>
            </Reveal>
          </Stack>
        </Frame>
      </Exhibit>
    </>
  );
}

const LANDING_EXAMPLE = `import { GalleryShell, NavShell } from "yappaflow-ui/shell";
import { ExhibitHero } from "yappaflow-ui/exhibits";
import "yappaflow-ui/styles.css";

export default function Page() {
  return (
    <GalleryShell>
      <NavShell brand="Studio" links={[{ label: "Work", href: "/work" }]} />
      <ExhibitHero
        eyebrow="Studio"
        headline={"Work you can\\\\nlive inside."}
        subtext="A small practice for large ideas."
        cta={{ label: "See work", href: "/work" }}
        ambient="drift"
      />
    </GalleryShell>
  );
}`;

import type { Metadata } from "next";
import { Exhibit } from "yappaflow-ui/shell";
import { Frame, Stack, Display, Body, Eyebrow } from "yappaflow-ui/primitives";
import { Reveal } from "yappaflow-ui/motion";
import { DOCS, SECTION_ORDER, docsBySection } from "@/lib/docs-manifest";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Guides, theming, motion, and API reference for yappaflow-ui.",
};

export default function DocsIndex() {
  const sections = docsBySection();
  return (
    <div className="docs-page">
      <Exhibit tone="breathing" edge="contained" rhythm="breath">
        <Frame span={10} offset="center">
          <Stack rhythm="breath">
            <Reveal beat="structure" variant="fade-translate">
              <Eyebrow>Docs</Eyebrow>
            </Reveal>
            <Reveal beat="primary" variant="text-lines" stagger="text">
              <Display size="lg" tracking="tight" balance>
                Everything you need to ship.
              </Display>
            </Reveal>
            <Reveal beat="secondary" variant="fade-translate">
              <Body size="lg" tone="secondary" style={{ maxWidth: "var(--ff-measure-reading)" }}>
                Written guides for the system (theming, motion, composition)
                and pointers to the gallery for every component API.
              </Body>
            </Reveal>
          </Stack>
        </Frame>
      </Exhibit>

      <Exhibit tone="dense" edge="contained" rhythm="room">
        <Frame span={10} offset="center">
          <Stack rhythm="breath">
            {SECTION_ORDER.map((section) => {
              const entries = sections[section];
              if (!entries?.length) return null;
              return (
                <Stack key={section} rhythm="gutter">
                  <Eyebrow>{section}</Eyebrow>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: "var(--ff-space-5)",
                    }}
                  >
                    {entries.map((d) => (
                      <a key={d.slug} href={`/docs/${d.slug}`} className="gallery-card">
                        <span className="gallery-card__eyebrow">{section}</span>
                        <span className="gallery-card__title">{d.title}</span>
                        <span className="gallery-card__description">{d.summary}</span>
                      </a>
                    ))}
                  </div>
                </Stack>
              );
            })}
            <Body size="sm" tone="tertiary">
              Looking for specific component APIs? That lives in the
              {" "}
              <a href="/gallery" style={{ color: "var(--ff-accent)" }}>gallery</a>
              .
            </Body>
          </Stack>
        </Frame>
      </Exhibit>
    </div>
  );
}

// Silence unused-import warning when DOCS is referenced only by docsBySection().
void DOCS;

import type { Metadata } from "next";
import { Exhibit } from "yappaflow-ui/shell";
import { Frame, Stack, Display, Body, Eyebrow } from "yappaflow-ui/primitives";
import { Reveal } from "yappaflow-ui/motion";
import { groupByLayer } from "@/lib/gallery-registry";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Every primitive, shell piece, motion wrapper, and exhibit in the yappaflow-ui library — with live previews and copy-pasteable code.",
};

const LAYER_ORDER = ["Primitives", "Motion", "Shell", "Exhibits", "Theme"] as const;

const LAYER_COPY: Record<string, string> = {
  Primitives: "The layout + type grammar. Frames, columns, stacks, spreads, Display, Body, Eyebrow.",
  Motion: "GSAP + Lenis, wrapped in declarative components with built-in reduced-motion gating.",
  Shell: "The page chrome — GalleryShell, Exhibit, NavShell, FootShell.",
  Exhibits: "Composed, ready-to-ship patterns — heroes, galleries, manifestos.",
  Theme: "Theming + toggle. Light default + dark toggle on every site, per standing rule.",
};

export default function GalleryIndex() {
  const byLayer = groupByLayer();

  return (
    <div className="docs-page">
      <Exhibit tone="breathing" edge="contained" rhythm="breath">
        <Frame span={12} offset="center">
          <Stack rhythm="breath">
            <Reveal beat="structure" variant="fade-translate">
              <Eyebrow>Gallery</Eyebrow>
            </Reveal>
            <Reveal beat="primary" variant="text-lines" stagger="text">
              <Display size="lg" tracking="tight" balance>
                {"Every component,\non one wall."}
              </Display>
            </Reveal>
            <Reveal beat="secondary" variant="fade-translate">
              <Body size="lg" tone="secondary" style={{ maxWidth: "var(--ff-measure-reading)" }}>
                Click through for live previews, props, and copy-pasteable code.
                Grouped by layer so the import-direction rule stays obvious —
                lower layers never depend on higher ones.
              </Body>
            </Reveal>
          </Stack>
        </Frame>
      </Exhibit>

      {LAYER_ORDER.map((layer) => {
        const entries = byLayer[layer];
        if (!entries?.length) return null;
        return (
          <Exhibit key={layer} tone="dense" edge="contained" rhythm="room">
            <Frame span={12} offset="center">
              <Stack rhythm="breath">
                <Reveal beat="structure" variant="fade-translate" trigger="in-view">
                  <Stack rhythm="gutter">
                    <Eyebrow>Layer · {layer}</Eyebrow>
                    <Display size="sm" tracking="tight">
                      {layer}
                    </Display>
                    <Body tone="secondary" size="md" style={{ maxWidth: "var(--ff-measure-reading)" }}>
                      {LAYER_COPY[layer]}
                    </Body>
                  </Stack>
                </Reveal>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "var(--ff-space-5)",
                  }}
                >
                  {entries.map((e) => (
                    <a key={e.slug} href={`/gallery/${e.slug}`} className="gallery-card">
                      <span className="gallery-card__eyebrow">{e.layer}</span>
                      <span className="gallery-card__title">{e.title}</span>
                      <span className="gallery-card__description">{e.summary}</span>
                    </a>
                  ))}
                </div>
              </Stack>
            </Frame>
          </Exhibit>
        );
      })}
    </div>
  );
}

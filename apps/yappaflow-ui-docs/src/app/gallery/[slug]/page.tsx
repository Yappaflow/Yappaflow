import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Exhibit } from "yappaflow-ui/shell";
import { Frame, Stack, Display, Body, Eyebrow } from "yappaflow-ui/primitives";
import { Reveal } from "yappaflow-ui/motion";
import { GALLERY, getEntry } from "@/lib/gallery-registry";
import { CodeSurface } from "@/components/landing/CodeSurface";
import { PreviewCanvas } from "@/components/gallery/PreviewCanvas";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return GALLERY.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = getEntry(slug);
  if (!entry) return { title: "Not found" };
  return {
    title: entry.title,
    description: entry.summary,
  };
}

export default async function GalleryDetail({ params }: PageProps) {
  const { slug } = await params;
  const entry = getEntry(slug);
  if (!entry) notFound();

  return (
    <div className="docs-page">
      <Exhibit tone="breathing" edge="contained" rhythm="breath">
        <Frame span={10} offset="center">
          <Stack rhythm="breath">
            <Reveal beat="structure" variant="fade-translate">
              <Eyebrow>{entry.layer}</Eyebrow>
            </Reveal>
            <Reveal beat="primary" variant="text-lines" stagger="text">
              <Display size="md" tracking="tight">
                {entry.title}
              </Display>
            </Reveal>
            <Reveal beat="secondary" variant="fade-translate">
              <Body size="lg" tone="secondary" style={{ maxWidth: "var(--ff-measure-reading)" }}>
                {entry.summary}
              </Body>
            </Reveal>
          </Stack>
        </Frame>
      </Exhibit>

      <Exhibit tone="dense" edge="contained" rhythm="room">
        <Frame span={10} offset="center">
          <Stack rhythm="breath">
            <Stack rhythm="gutter">
              <Eyebrow>Live preview</Eyebrow>
              <PreviewCanvas>
                <entry.Preview />
              </PreviewCanvas>
            </Stack>

            <Stack rhythm="gutter">
              <Eyebrow>Usage</Eyebrow>
              <CodeSurface language="tsx" code={entry.example} />
            </Stack>

            {entry.props && entry.props.length > 0 && (
              <Stack rhythm="gutter">
                <Eyebrow>Props</Eyebrow>
                <div className="props-table-wrap">
                  <table className="props-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Default</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.props.map((p) => (
                        <tr key={p.name}>
                          <td><code>{p.name}</code></td>
                          <td><code>{p.type}</code></td>
                          <td>{p.defaultValue ? <code>{p.defaultValue}</code> : <span style={{ color: "var(--ff-text-tertiary)" }}>—</span>}</td>
                          <td>{p.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Stack>
            )}
          </Stack>
        </Frame>
      </Exhibit>
    </div>
  );
}

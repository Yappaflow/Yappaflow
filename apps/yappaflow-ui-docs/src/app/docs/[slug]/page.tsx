import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Exhibit } from "yappaflow-ui/shell";
import { Frame, Stack, Display, Body, Eyebrow } from "yappaflow-ui/primitives";
import { Reveal } from "yappaflow-ui/motion";
import { DOCS, getDoc } from "@/lib/docs-manifest";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { DocsToc } from "@/components/docs/DocsToc";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = getDoc(slug);
  if (!entry) return { title: "Not found" };
  return { title: entry.title, description: entry.summary };
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = getDoc(slug);
  if (!entry) notFound();

  // Dynamic MDX import — Next's MDX loader compiles each .mdx file to a
  // React component. Wrapped in try/catch so a manifest entry without a
  // matching file renders a friendly placeholder instead of a 500.
  let Content: React.ComponentType | null = null;
  try {
    const mod = await import(`@/content/docs/${slug}.mdx`);
    Content = mod.default as React.ComponentType;
  } catch {
    Content = null;
  }

  const prevIdx = DOCS.findIndex((d) => d.slug === slug) - 1;
  const nextIdx = DOCS.findIndex((d) => d.slug === slug) + 1;
  const prev = prevIdx >= 0 ? DOCS[prevIdx] : null;
  const next = nextIdx < DOCS.length ? DOCS[nextIdx] : null;

  return (
    <div className="docs-page">
      <Exhibit tone="breathing" edge="contained" rhythm="breath">
        <Frame span={12} offset="center">
          <div className="docs-layout docs-layout--with-toc">
            <DocsSidebar activeSlug={slug} />

            <article>
              <Stack rhythm="breath">
                <Reveal beat="structure" variant="fade-translate">
                  <Eyebrow>{entry.section}</Eyebrow>
                </Reveal>
                <Reveal beat="primary" variant="text-lines" stagger="text">
                  <Display size="md" tracking="tight" balance>
                    {entry.title}
                  </Display>
                </Reveal>
                <Reveal beat="secondary" variant="fade-translate">
                  <Body size="lg" tone="secondary" style={{ maxWidth: "var(--ff-measure-reading)" }}>
                    {entry.summary}
                  </Body>
                </Reveal>

                <div className="docs-prose">
                  {Content ? (
                    <Content />
                  ) : (
                    <Body tone="tertiary">
                      This page is scheduled but not yet written.
                    </Body>
                  )}
                </div>

                <nav className="docs-pager" aria-label="Page navigation">
                  {prev ? (
                    <a href={`/docs/${prev.slug}`} className="docs-pager__link docs-pager__link--prev">
                      <span className="docs-pager__label">Previous</span>
                      <span className="docs-pager__title">← {prev.title}</span>
                    </a>
                  ) : <span />}
                  {next ? (
                    <a href={`/docs/${next.slug}`} className="docs-pager__link docs-pager__link--next">
                      <span className="docs-pager__label">Next</span>
                      <span className="docs-pager__title">{next.title} →</span>
                    </a>
                  ) : <span />}
                </nav>
              </Stack>
            </article>

            <DocsToc />
          </div>
        </Frame>
      </Exhibit>
    </div>
  );
}

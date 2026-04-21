"use client";

import { useEffect, useState } from "react";

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * <DocsToc> — right-rail scroll-spy table of contents.
 *
 * Zero dependency. On mount, queries the .docs-prose article DOM for h2/h3
 * elements that rehype-slug has already decorated with ids, builds a flat
 * list, and uses IntersectionObserver to highlight the one currently in
 * the reader's viewport.
 *
 * Why DOM-querying instead of AST-extraction: the MDX compile pipeline is
 * already happy with rehype-slug. Adding a headings-extraction step would
 * require a remark plugin returning metadata to the page, a second build
 * pass, or exporting a manifest per .mdx file. The DOM already has
 * everything we need — it's the source of truth the reader sees.
 */
export function DocsToc({ containerSelector = ".docs-prose" }: { containerSelector?: string }) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Collect headings once the MDX content is mounted.
  useEffect(() => {
    const host = document.querySelector(containerSelector);
    if (!host) return;
    const found = Array.from(
      host.querySelectorAll<HTMLHeadingElement>("h2[id], h3[id]"),
    ).map((el) => ({
      id: el.id,
      text: el.textContent ?? "",
      level: Number(el.tagName.slice(1)) as 2 | 3,
    }));
    setItems(found);
  }, [containerSelector]);

  // Scroll-spy with IntersectionObserver. We pick the topmost intersecting
  // heading — less jitter than "nearest to center" when headings are short.
  useEffect(() => {
    if (!items.length) return;
    const targets = items
      .map((i) => document.getElementById(i.id))
      .filter(Boolean) as HTMLElement[];

    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        });
        // Prefer the first heading in document order that's visible; fall
        // back to the last one that scrolled past the top.
        const firstVisible = items.find((i) => visible.has(i.id));
        if (firstVisible) {
          setActiveId(firstVisible.id);
        }
      },
      { rootMargin: "-10% 0px -70% 0px", threshold: [0, 1] },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  return (
    <nav className="docs-toc" aria-label="On this page">
      <p className="docs-toc__title">On this page</p>
      <ul>
        {items.map((item) => (
          <li key={item.id} data-level={item.level}>
            <a
              href={`#${item.id}`}
              className="docs-toc__link"
              data-active={activeId === item.id}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
      <style>{TOC_CSS}</style>
    </nav>
  );
}

const TOC_CSS = /* css */ `
.docs-toc {
  position: sticky;
  top: calc(var(--ff-space-8) + var(--ff-space-5));
  display: flex;
  flex-direction: column;
  gap: var(--ff-space-2);
  font-family: var(--ff-font-body);
  font-size: var(--ff-type-body-sm);
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  padding-right: var(--ff-space-2);
}
.docs-toc__title {
  margin: 0 0 var(--ff-space-2);
  font-size: var(--ff-type-eyebrow);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ff-text-tertiary);
  font-weight: 500;
}
.docs-toc ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.docs-toc li[data-level="3"] {
  padding-left: var(--ff-space-3);
}
.docs-toc__link {
  display: block;
  padding: 0.3rem 0;
  color: var(--ff-text-secondary);
  text-decoration: none;
  border-left: 2px solid transparent;
  padding-left: var(--ff-space-3);
  transition: color 200ms cubic-bezier(0.25, 1, 0.5, 1),
              border-color 200ms cubic-bezier(0.25, 1, 0.5, 1);
  line-height: 1.4;
}
.docs-toc__link:hover {
  color: var(--ff-text-primary);
}
.docs-toc__link[data-active="true"] {
  color: var(--ff-text-primary);
  border-left-color: var(--ff-accent);
  font-weight: 500;
}
@media (max-width: 1100px) {
  .docs-toc {
    display: none;
  }
}
`;

"use client";

import { useMemo, useState } from "react";
import { docsBySection, SECTION_ORDER, DOCS, type DocEntry } from "@/lib/docs-manifest";

/**
 * <DocsSidebar> — left nav for /docs pages.
 *
 * Interactive: a local filter input narrows the visible entries by title,
 * slug, or summary. Sections with no matches are hidden. The empty state
 * is informative rather than a silent blank list.
 *
 * Kept as a "use client" module so filter state lives on the client; the
 * initial HTML still renders the full list for SEO + no-JS readers.
 */
export function DocsSidebar({ activeSlug }: { activeSlug?: string }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo<Record<string, DocEntry[]>>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docsBySection();
    const match = (d: DocEntry): boolean =>
      d.title.toLowerCase().includes(q) ||
      d.slug.toLowerCase().includes(q) ||
      d.summary.toLowerCase().includes(q);
    return DOCS.filter(match).reduce<Record<string, DocEntry[]>>((acc, d) => {
      (acc[d.section] ||= []).push(d);
      return acc;
    }, {});
  }, [query]);

  const hasAny = Object.values(filtered).some((v) => v.length > 0);

  return (
    <aside className="docs-sidebar">
      <label className="docs-sidebar__search">
        <span className="docs-sidebar__search-icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          placeholder="Filter docs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
          aria-label="Filter documentation"
        />
      </label>

      <nav aria-label="Documentation">
        {SECTION_ORDER.map((section) => {
          const entries = filtered[section];
          if (!entries?.length) return null;
          return (
            <div key={section} className="docs-sidebar__group">
              <span className="docs-sidebar__section">{section}</span>
              <ul>
                {entries.map((e) => (
                  <li key={e.slug}>
                    <a
                      href={`/docs/${e.slug}`}
                      className="docs-sidebar__link"
                      data-active={activeSlug === e.slug}
                    >
                      {e.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {!hasAny && (
          <p className="docs-sidebar__empty">
            No pages match <em>&ldquo;{query}&rdquo;</em>.
          </p>
        )}
      </nav>

      <style>{SIDEBAR_CSS}</style>
    </aside>
  );
}

const SIDEBAR_CSS = /* css */ `
.docs-sidebar__search {
  display: flex;
  align-items: center;
  gap: var(--ff-space-2);
  padding: 0 var(--ff-space-3);
  border: 1px solid var(--ff-border);
  border-radius: var(--ff-radius-sharp);
  background: var(--ff-surface-raised);
  transition: border-color 200ms cubic-bezier(0.25, 1, 0.5, 1);
  margin-bottom: var(--ff-space-4);
}
.docs-sidebar__search:focus-within {
  border-color: var(--ff-text-primary);
}
.docs-sidebar__search-icon {
  color: var(--ff-text-tertiary);
  font-size: 1rem;
}
.docs-sidebar__search input {
  flex: 1;
  border: 0;
  background: transparent;
  color: var(--ff-text-primary);
  font-family: var(--ff-font-body);
  font-size: var(--ff-type-body-sm);
  padding: 0.5rem 0;
  outline: none;
}
.docs-sidebar__search input::placeholder {
  color: var(--ff-text-tertiary);
}
.docs-sidebar__empty {
  margin: 0;
  font-family: var(--ff-font-body);
  font-size: var(--ff-type-body-sm);
  color: var(--ff-text-tertiary);
  padding: var(--ff-space-3) 0;
}
`;

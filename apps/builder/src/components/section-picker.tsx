"use client";

import { useEffect, useState } from "react";
import type { SectionType } from "@yappaflow/types";
import { SECTION_DATA } from "@yappaflow/sections/data";

interface PickerItem {
  type: SectionType;
  label: string;
  description: string;
}

/**
 * Picker item lists are split into two tabs:
 *   - "Sections" — the canonical 10 MVP section types, page-level blocks
 *   - "Components" — the Exhibit-backed additions that draw on the art-
 *     gallery aesthetic of `yappaflow-ui`
 *
 * Order within each tab is picker-UX-optimized: most-used at the top,
 * globals at the bottom.
 */
const SECTIONS_TAB: PickerItem[] = [
  { type: "hero", label: "Hero", description: "First-screen statement. Headline + CTA." },
  {
    type: "feature-grid",
    label: "Feature grid",
    description: "3–4 value props with icons or images.",
  },
  {
    type: "feature-row",
    label: "Feature row",
    description: "Alternating image / text layout.",
  },
  {
    type: "product-grid",
    label: "Product grid",
    description: "E-commerce collection of cards.",
  },
  {
    type: "testimonial",
    label: "Testimonial",
    description: "Social proof — quote + author.",
  },
  { type: "cta-band", label: "CTA band", description: "Prominent single-CTA block." },
  {
    type: "rich-text",
    label: "Rich text",
    description: "Catch-all prose: headings, paragraphs, lists.",
  },
  { type: "header", label: "Header", description: "Top nav. Usually global, but swappable." },
  { type: "footer", label: "Footer", description: "Legal, site map, socials." },
  {
    type: "announcement-bar",
    label: "Announcement bar",
    description: "Thin strip above the header.",
  },
];

const COMPONENTS_TAB: PickerItem[] = [
  { type: "faq", label: "FAQ", description: "Accordion of questions and answers." },
  { type: "pricing", label: "Pricing", description: "Plans and tiers, featured row option." },
  {
    type: "stats-band",
    label: "Stats band",
    description: "Numeric highlights — 500+ brands shipped.",
  },
  {
    type: "timeline",
    label: "Timeline",
    description: "Ordered markers — process, history, phases.",
  },
  {
    type: "logo-cloud",
    label: "Logo cloud",
    description: "Typographic wordmark strip of partners.",
  },
  { type: "team", label: "Team", description: "People grid, monogram-only portraits." },
  {
    type: "newsletter",
    label: "Newsletter",
    description: "Inline email capture form.",
  },
  {
    type: "contact",
    label: "Contact",
    description: "Editorial contact detail list + optional form.",
  },
];

type Tab = "sections" | "components";

export function SectionPicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (type: SectionType) => void;
}) {
  const [tab, setTab] = useState<Tab>("sections");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const items = tab === "sections" ? SECTIONS_TAB : COMPONENTS_TAB;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Insert section"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-white/10 bg-paper shadow-xl dark:bg-ink"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "80vh" }}
      >
        <header className="flex items-center justify-between border-b border-current/10 px-6 py-4">
          <h2 className="text-lg font-semibold">Insert</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-current/10"
          >
            ×
          </button>
        </header>

        <div className="flex gap-1 border-b border-current/10 px-4 py-2">
          <TabButton active={tab === "sections"} onClick={() => setTab("sections")}>
            Sections <span className="ml-1 text-[10px] opacity-60">{SECTIONS_TAB.length}</span>
          </TabButton>
          <TabButton active={tab === "components"} onClick={() => setTab("components")}>
            Components <span className="ml-1 text-[10px] opacity-60">{COMPONENTS_TAB.length}</span>
          </TabButton>
          <span className="ml-auto self-center text-xs opacity-50">
            {tab === "components" ? "Powered by yappaflow-ui" : null}
          </span>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((item) => {
              const data = SECTION_DATA[item.type];
              return (
                <li key={item.type}>
                  <button
                    onClick={() => onPick(item.type)}
                    className="group flex w-full flex-col gap-1 rounded-lg border border-current/15 p-3 text-left transition hover:border-current/40 hover:bg-current/5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{item.label}</span>
                      <span className="text-[10px] uppercase tracking-wider opacity-50">
                        {data.variants.length} variant
                        {data.variants.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <span className="text-xs opacity-65">{item.description}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-selected={active}
      className={`rounded-md px-3 py-1.5 text-sm transition ${
        active ? "bg-current/10 text-current" : "opacity-60 hover:bg-current/5 hover:opacity-100"
      }`}
    >
      {children}
    </button>
  );
}

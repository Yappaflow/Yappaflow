"use client";

import { useEffect } from "react";
import type { SectionType } from "@yappaflow/types";
import { SECTION_DATA } from "@yappaflow/sections/data";

interface PickerItem {
  type: SectionType;
  label: string;
  description: string;
}

// Hand-written blurbs — the `.defaultContent` text isn't descriptive in a
// picker context, and the schema doesn't carry titles. One line each.
const PICKER_ITEMS: PickerItem[] = [
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
  {
    type: "footer",
    label: "Footer",
    description: "Legal, site map, socials.",
  },
  {
    type: "announcement-bar",
    label: "Announcement bar",
    description: "Thin strip above the header.",
  },
];

export function SectionPicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (type: SectionType) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Insert section"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-white/10 bg-paper p-6 shadow-xl dark:bg-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Insert section</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-current/10"
          >
            ×
          </button>
        </header>
        <p className="mb-5 text-sm opacity-70">
          Pick a section type to add. It seeds with sensible defaults —
          you&apos;ll shape the copy in the right rail afterwards.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {PICKER_ITEMS.map((item) => {
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
  );
}

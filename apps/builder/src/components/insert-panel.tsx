"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { SectionType } from "@yappaflow/types";
import { SECTION_DATA } from "@yappaflow/sections/data";
import { useProjectStore } from "@/lib/store";
import { paletteDraggableId, type PaletteCardData } from "@/lib/dnd";
import { iconForSection } from "@/lib/section-icons";

/**
 * Insert panel — the sidebar palette of draggable section/component cards.
 *
 * Replaces the Phase 8b modal picker. Cards drag onto canvas drop zones
 * (preferred UX, matches Webflow) AND click-to-insert-at-end as a
 * keyboard-accessible fallback.
 */

interface PaletteItem {
  type: SectionType;
  label: string;
  description: string;
}

const SECTIONS_GROUP: PaletteItem[] = [
  { type: "hero", label: "Hero", description: "First-screen statement." },
  { type: "feature-grid", label: "Feature grid", description: "3–4 value props." },
  { type: "feature-row", label: "Feature row", description: "Alternating image/text." },
  { type: "product-grid", label: "Product grid", description: "E-commerce cards." },
  { type: "testimonial", label: "Testimonial", description: "Social proof block." },
  { type: "cta-band", label: "CTA band", description: "Prominent single-CTA." },
  { type: "rich-text", label: "Rich text", description: "Prose, headings, lists." },
  { type: "header", label: "Header", description: "Top nav (global)." },
  { type: "footer", label: "Footer", description: "Site map (global)." },
  { type: "announcement-bar", label: "Announcement", description: "Thin strip above header." },
];

const COMPONENTS_GROUP: PaletteItem[] = [
  { type: "faq", label: "FAQ", description: "Accordion of Q&A." },
  { type: "pricing", label: "Pricing", description: "Plans and tiers." },
  { type: "stats-band", label: "Stats", description: "Numeric highlights." },
  { type: "timeline", label: "Timeline", description: "Ordered markers." },
  { type: "logo-cloud", label: "Logo cloud", description: "Partner wordmarks." },
  { type: "team", label: "Team", description: "People grid." },
  { type: "newsletter", label: "Newsletter", description: "Email capture." },
  { type: "contact", label: "Contact", description: "Detail list + form." },
];

export function InsertPanel() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">
        <PaletteGroup
          title="Sections"
          subtitle="Page-level blocks"
          items={SECTIONS_GROUP}
        />
        <PaletteGroup
          title="Components"
          subtitle="Powered by yappaflow-ui"
          items={COMPONENTS_GROUP}
        />
      </div>
      <div className="border-t border-current/10 px-4 py-3 text-[11px] opacity-60">
        Drag onto the canvas, or click to append at the end.
      </div>
    </div>
  );
}

function PaletteGroup({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: PaletteItem[];
}) {
  return (
    <section className="px-3 py-3">
      <header className="mb-2 px-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-60">
          {title}
        </h3>
        <p className="text-[10px] opacity-40">{subtitle}</p>
      </header>
      <ul className="grid grid-cols-1 gap-1.5">
        {items.map((item) => (
          <li key={item.type}>
            <PaletteCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PaletteCard({ item }: { item: PaletteItem }) {
  const data: PaletteCardData = { kind: "palette-card", type: item.type };
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: paletteDraggableId(item.type),
    data,
  });
  const project = useProjectStore((s) => s.project);
  const insertSection = useProjectStore((s) => s.insertSection);
  const variants = SECTION_DATA[item.type].variants.length;
  const Icon = iconForSection(item.type);

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  function handleClick() {
    if (!project) return;
    const home = project.pages[0];
    if (!home) return;
    insertSection(home.id, item.type, home.sections.length);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className="group flex cursor-grab items-start gap-3 rounded border border-current/15 px-3 py-2 text-left transition hover:border-current/40 hover:bg-current/5 active:cursor-grabbing"
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-current/5 text-current transition group-hover:bg-current/10">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{item.label}</span>
          <span className="text-[10px] uppercase tracking-wider opacity-40">
            {variants}v
          </span>
        </div>
        <span className="block truncate text-[11px] opacity-60">
          {item.description}
        </span>
      </div>
    </div>
  );
}

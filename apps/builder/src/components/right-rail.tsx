"use client";

import { useMemo } from "react";
import {
  ANIMATION_PRESETS,
  type AnimationPreset,
  type Section,
  type SiteProject,
} from "@yappaflow/types";
import { SECTION_DATA } from "@yappaflow/sections/data";
import { useProjectStore } from "@/lib/store";
import { ArrayField, type ArrayFieldColumn } from "./array-field";
import { StringArrayField } from "./string-array-field";

/**
 * Right-rail property editor. Schema-adjacent rather than fully schema-driven:
 * we detect a fixed list of well-known fields (top-level strings, a few
 * common nested CTAs, known array properties) and render type-appropriate
 * controls. This covers the content the agency will most often want to edit
 * without shipping a full Zod-to-form reflector yet.
 */

const COMMON_STRING_FIELDS = [
  "eyebrow",
  "heading",
  "subhead",
  "body",
  "message",
  "tagline",
  "legal",
];

/**
 * Per-section-type array-field configurations. Tells the ArrayField what
 * columns to render for each item and how to spawn a blank one.
 */
const ARRAY_CONFIGS: Record<
  string,
  {
    field: string;
    label: string;
    columns: ArrayFieldColumn[];
    makeBlank: () => Record<string, unknown>;
    itemLabel?: (item: Record<string, unknown>, index: number) => string;
  }
> = {
  "feature-grid": {
    field: "features",
    label: "Features",
    columns: [
      { key: "title", label: "Title" },
      { key: "body", label: "Body", kind: "textarea" },
      { key: "icon", label: "Icon name (optional)" },
      { key: "image", nestedKey: "url", label: "Image URL (optional)", kind: "url" },
    ],
    makeBlank: () => ({ title: "New feature", body: "Describe this feature." }),
  },
  "product-grid": {
    field: "products",
    label: "Products",
    columns: [
      { key: "title", label: "Title" },
      { key: "handle", label: "Handle" },
      { key: "price", label: "Price (display)" },
      { key: "compareAtPrice", label: "Compare-at (optional)" },
      { key: "href", label: "Product URL", kind: "url" },
      { key: "image", nestedKey: "url", label: "Image URL", kind: "url" },
      { key: "image", nestedKey: "alt", label: "Image alt" },
    ],
    makeBlank: () => ({
      id: `p_${Math.random().toString(36).slice(2, 8)}`,
      handle: "new-product",
      title: "New product",
      price: "$0",
      currency: "USD",
      image: { kind: "image", url: "", alt: "" },
      href: "/products/new-product",
    }),
    itemLabel: (item) =>
      (item.title as string) || (item.handle as string) || "Untitled product",
  },
  testimonial: {
    field: "items",
    label: "Testimonials",
    columns: [
      { key: "quote", label: "Quote", kind: "textarea" },
      { key: "author", label: "Author" },
      { key: "role", label: "Role (optional)" },
    ],
    makeBlank: () => ({
      quote: "A short testimonial quote.",
      author: "Author name",
    }),
    itemLabel: (item) => (item.author as string) || "New testimonial",
  },
  footer: {
    field: "columns",
    label: "Columns",
    columns: [{ key: "heading", label: "Heading" }],
    makeBlank: () => ({ heading: "New column", links: [] }),
    itemLabel: (item) => (item.heading as string) || "Untitled column",
  },
  // Exhibit-backed sections — added in the Phase 8c sidebar pivot.
  faq: {
    field: "blocks",
    label: "FAQ blocks",
    columns: [
      { key: "question", label: "Question" },
      { key: "answer", label: "Answer", kind: "textarea" },
    ],
    makeBlank: () => ({
      question: "New question?",
      answer: "Answer text goes here.",
    }),
    itemLabel: (item) => (item.question as string) || "Untitled question",
  },
  pricing: {
    field: "tiers",
    label: "Pricing tiers",
    columns: [
      { key: "name", label: "Name" },
      { key: "price", label: "Price" },
      { key: "period", label: "Period (optional)" },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "cta", nestedKey: "label", label: "CTA label" },
      { key: "cta", nestedKey: "href", label: "CTA URL", kind: "url" },
    ],
    makeBlank: () => ({
      name: "New tier",
      price: "$0",
      features: [],
      cta: { label: "Get started", href: "/signup" },
    }),
    itemLabel: (item) => (item.name as string) || "Untitled tier",
  },
  "stats-band": {
    field: "blocks",
    label: "Stat blocks",
    columns: [
      { key: "value", label: "Value" },
      { key: "label", label: "Label" },
      { key: "context", label: "Context (optional)" },
    ],
    makeBlank: () => ({ value: "0", label: "New stat" }),
    itemLabel: (item) => `${item.value ?? ""} · ${item.label ?? ""}`,
  },
  timeline: {
    field: "entries",
    label: "Timeline entries",
    columns: [
      { key: "marker", label: "Marker (year / step)" },
      { key: "title", label: "Title" },
      { key: "body", label: "Body", kind: "textarea" },
    ],
    makeBlank: () => ({
      marker: "00",
      title: "New entry",
      body: "Describe this step.",
    }),
    itemLabel: (item) => `${item.marker ?? ""} · ${item.title ?? ""}`,
  },
  team: {
    field: "members",
    label: "Team members",
    columns: [
      { key: "name", label: "Name" },
      { key: "role", label: "Role" },
      { key: "bio", label: "Bio (optional)", kind: "textarea" },
    ],
    makeBlank: () => ({ name: "New member", role: "Role" }),
    itemLabel: (item) => (item.name as string) || "New member",
  },
  contact: {
    field: "rows",
    label: "Detail rows",
    columns: [
      { key: "label", label: "Label" },
      { key: "value", label: "Value" },
      { key: "href", label: "Link URL (optional)", kind: "url" },
    ],
    makeBlank: () => ({ label: "New", value: "value" }),
    itemLabel: (item) =>
      `${item.label ?? ""}${item.value ? `: ${item.value}` : ""}`,
  },
};

export function RightRail() {
  const project = useProjectStore((s) => s.project);
  const selection = useProjectStore((s) => s.selection);
  const updateSectionVariant = useProjectStore((s) => s.updateSectionVariant);
  const updateSectionContent = useProjectStore((s) => s.updateSectionContent);
  const updateSectionAnimation = useProjectStore((s) => s.updateSectionAnimation);
  const updateGlobalContent = useProjectStore((s) => s.updateGlobalContent);
  const removeSection = useProjectStore((s) => s.removeSection);
  const duplicateSection = useProjectStore((s) => s.duplicateSection);

  const selected = useMemo(
    () => resolveSelection(project, selection),
    [project, selection],
  );

  if (!project) return null;

  if (!selected) {
    return <PagePropertiesPanel />;
  }

  const { section, globalSlot, pageId } = selected;
  const def = SECTION_DATA[section.type];
  const arrayConfig = ARRAY_CONFIGS[section.type];

  function patchContent(patch: Record<string, unknown>) {
    if (globalSlot) {
      updateGlobalContent(globalSlot, patch);
      return;
    }
    if (pageId) updateSectionContent(pageId, section.id, patch);
  }
  function setVariant(variant: string) {
    if (pageId) updateSectionVariant(pageId, section.id, variant);
  }
  function setAnimation(preset: AnimationPreset | null) {
    if (pageId) updateSectionAnimation(pageId, section.id, preset);
  }

  const stringFields = COMMON_STRING_FIELDS.filter(
    (f) => typeof (section.content as Record<string, unknown>)[f] === "string",
  );

  return (
    <aside className="flex h-full flex-col border-l border-current/10">
      <div className="border-b border-current/10 px-5 py-3">
        <p className="text-[10px] uppercase tracking-[0.2em] opacity-50">
          {globalSlot ? "Global" : "Section"}
        </p>
        <div className="mt-1 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">{section.type}</h2>
          <code className="font-mono text-[10px] opacity-40">{section.id}</code>
        </div>
        {!globalSlot && pageId ? (
          <div className="mt-3 flex items-center gap-1">
            <ToolbarButton
              label="Duplicate"
              onClick={() => duplicateSection(pageId, section.id)}
            >
              ⎘ Duplicate
            </ToolbarButton>
            <ToolbarButton
              label="Delete"
              onClick={() => removeSection(pageId, section.id)}
              danger
            >
              × Delete
            </ToolbarButton>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-auto p-5">
        {!globalSlot ? (
          <Field label="Variant">
            <select
              value={section.variant ?? def.defaultVariant}
              onChange={(e) => setVariant(e.target.value)}
              className="w-full rounded border border-current/20 bg-transparent px-3 py-2 text-sm focus:border-current/60 focus:outline-none"
            >
              {def.variants.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {stringFields.map((field) => {
          const value = (section.content as Record<string, unknown>)[field] as string;
          const isLong =
            field === "body" ||
            field === "subhead" ||
            (typeof value === "string" && value.length > 80);
          return (
            <Field key={field} label={field}>
              {isLong ? (
                <textarea
                  value={value}
                  onChange={(e) => patchContent({ [field]: e.target.value })}
                  rows={3}
                  className="w-full resize-y rounded border border-current/20 bg-transparent px-3 py-2 text-sm leading-relaxed focus:border-current/60 focus:outline-none"
                />
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => patchContent({ [field]: e.target.value })}
                  className="w-full rounded border border-current/20 bg-transparent px-3 py-2 text-sm focus:border-current/60 focus:outline-none"
                />
              )}
            </Field>
          );
        })}

        <NestedStringFields
          section={section}
          path={["primaryCta"]}
          label="Primary CTA"
          onPatch={(patch) =>
            patchContent({
              primaryCta: {
                ...((section.content as { primaryCta?: object }).primaryCta ?? {}),
                ...patch,
              },
            })
          }
        />
        <NestedStringFields
          section={section}
          path={["secondaryCta"]}
          label="Secondary CTA"
          onPatch={(patch) =>
            patchContent({
              secondaryCta: {
                ...((section.content as { secondaryCta?: object }).secondaryCta ?? {}),
                ...patch,
              },
            })
          }
        />
        <NestedStringFields
          section={section}
          path={["cta"]}
          label="CTA"
          onPatch={(patch) =>
            patchContent({
              cta: {
                ...((section.content as { cta?: object }).cta ?? {}),
                ...patch,
              },
            })
          }
        />

        {arrayConfig ? (
          <ArrayField
            label={arrayConfig.label}
            value={
              ((section.content as Record<string, unknown>)[arrayConfig.field] as
                | Array<Record<string, unknown>>
                | undefined) ?? []
            }
            columns={arrayConfig.columns}
            makeBlankItem={arrayConfig.makeBlank}
            itemLabel={arrayConfig.itemLabel}
            onChange={(next) => patchContent({ [arrayConfig.field]: next })}
          />
        ) : null}

        {section.type === "logo-cloud" ? (
          <StringArrayField
            label="Labels"
            value={
              ((section.content as { labels?: string[] }).labels as
                | string[]
                | undefined) ?? []
            }
            placeholder="Brand or partner name"
            onChange={(next) => patchContent({ labels: next })}
          />
        ) : null}

        {section.type === "feature-row" ? (
          <StringArrayField
            label="Bullets"
            value={
              ((section.content as { bullets?: string[] }).bullets as
                | string[]
                | undefined) ?? []
            }
            placeholder="Bullet point text"
            onChange={(next) => patchContent({ bullets: next })}
          />
        ) : null}

        {/* Pricing tier features (string[]) editing arrives in the next pass — nested array-of-array editing needs dedicated UI. */}

        {!globalSlot ? (
          <Field label="Animation">
            <select
              value={section.animation ?? "none"}
              onChange={(e) =>
                setAnimation(
                  e.target.value === "none"
                    ? null
                    : (e.target.value as AnimationPreset),
                )
              }
              className="w-full rounded border border-current/20 bg-transparent px-3 py-2 text-sm focus:border-current/60 focus:outline-none"
            >
              {ANIMATION_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        <details className="mt-6 rounded border border-current/10 p-3 text-xs opacity-70">
          <summary className="cursor-pointer select-none">Raw section JSON</summary>
          <pre className="mt-3 max-h-64 overflow-auto rounded bg-current/5 p-2 font-mono text-[10px] leading-relaxed">
            {JSON.stringify(section, null, 2)}
          </pre>
        </details>
      </div>
    </aside>
  );
}

/**
 * Right rail default view — shown when no section is selected. Surfaces
 * active page properties (title, slug, SEO description) so the right rail
 * is always doing something useful. Multi-page landed in this session, so
 * this panel is how users discover + change page-level metadata.
 */
function PagePropertiesPanel() {
  const project = useProjectStore((s) => s.project);
  const activePageId = useProjectStore((s) => s.activePageId);
  const renamePage = useProjectStore((s) => s.renamePage);
  const setPageSlug = useProjectStore((s) => s.setPageSlug);
  const setPageSeo = useProjectStore((s) => s.setPageSeo);

  const page = project?.pages.find((p) => p.id === activePageId);

  if (!project || !page) {
    return (
      <aside className="flex h-full flex-col border-l border-current/10 p-5 text-sm opacity-60">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em]">
          Properties
        </h2>
        <p className="mt-3">No page to configure.</p>
      </aside>
    );
  }

  return (
    <aside className="flex h-full flex-col border-l border-current/10">
      <div className="border-b border-current/10 px-5 py-3">
        <p className="text-[10px] uppercase tracking-[0.2em] opacity-50">Page</p>
        <div className="mt-1 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">{page.title}</h2>
          <code className="font-mono text-[10px] opacity-40">{page.id}</code>
        </div>
        <p className="mt-2 text-xs opacity-60">
          {page.sections.length} section{page.sections.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <Field label="Title">
          <input
            value={page.title}
            onChange={(e) => renamePage(page.id, e.target.value)}
            className="w-full rounded border border-current/20 bg-transparent px-3 py-2 text-sm focus:border-current/60 focus:outline-none"
          />
        </Field>

        <Field label="Slug">
          <input
            value={page.slug}
            onChange={(e) => setPageSlug(page.id, e.target.value)}
            className="w-full rounded border border-current/20 bg-transparent px-3 py-2 font-mono text-sm focus:border-current/60 focus:outline-none"
          />
          <span className="text-[10px] opacity-50">
            URL path. Use <code>/</code> for the home page.
          </span>
        </Field>

        <Field label="SEO description">
          <textarea
            value={page.seo.description}
            onChange={(e) =>
              setPageSeo(page.id, { description: e.target.value })
            }
            rows={3}
            className="w-full resize-y rounded border border-current/20 bg-transparent px-3 py-2 text-sm leading-relaxed focus:border-current/60 focus:outline-none"
            placeholder="Used as the meta description when the site exports."
          />
        </Field>

        <Field label="Open Graph image URL">
          <input
            value={page.seo.ogImage?.url ?? ""}
            onChange={(e) =>
              setPageSeo(page.id, {
                ogImage: e.target.value
                  ? {
                      kind: "image",
                      url: e.target.value,
                      alt: page.seo.ogImage?.alt,
                    }
                  : undefined,
              })
            }
            placeholder="https://…"
            className="w-full rounded border border-current/20 bg-transparent px-3 py-2 text-sm focus:border-current/60 focus:outline-none"
          />
        </Field>

        <p className="mt-6 text-xs opacity-50">
          Click any section in the canvas or left rail to edit it. Click a
          different page in the Pages list to switch.
        </p>
      </div>
    </aside>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-4 flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-60">
        {label}
      </span>
      {children}
    </label>
  );
}

function NestedStringFields({
  section,
  path,
  label,
  onPatch,
}: {
  section: Section;
  path: string[];
  label: string;
  onPatch: (patch: Record<string, string>) => void;
}) {
  const parent = (section.content as Record<string, unknown>)[path[0]!] as
    | Record<string, unknown>
    | undefined;
  if (!parent || typeof parent !== "object") return null;
  const stringKeys = Object.entries(parent)
    .filter(([, v]) => typeof v === "string")
    .map(([k]) => k);
  if (stringKeys.length === 0) return null;

  return (
    <fieldset className="mb-4 rounded border border-current/10 p-3">
      <legend className="px-1 text-[11px] font-medium uppercase tracking-[0.18em] opacity-60">
        {label}
      </legend>
      <div className="mt-2 space-y-2">
        {stringKeys.map((k) => (
          <label key={k} className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider opacity-50">
              {k}
            </span>
            <input
              type="text"
              value={parent[k] as string}
              onChange={(e) => onPatch({ [k]: e.target.value })}
              className="rounded border border-current/20 bg-transparent px-2 py-1.5 text-sm focus:border-current/60 focus:outline-none"
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ToolbarButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] transition ${
        danger
          ? "border border-current/15 hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-500"
          : "border border-current/15 hover:border-current/40 hover:bg-current/5"
      }`}
    >
      {children}
    </button>
  );
}

function resolveSelection(
  project: SiteProject | null,
  selection: ReturnType<typeof useProjectStore.getState>["selection"],
): {
  section: Section;
  pageId: string | null;
  globalSlot: "header" | "footer" | "announcementBar" | null;
} | null {
  if (!project || !selection) return null;
  if (selection.pageId.startsWith("__globals__:")) {
    const slot = selection.pageId.slice("__globals__:".length) as
      | "header"
      | "footer"
      | "announcementBar";
    const section = project.globals[slot];
    if (!section) return null;
    return { section, pageId: null, globalSlot: slot };
  }
  const page = project.pages.find((p) => p.id === selection.pageId);
  const section = page?.sections.find((s) => s.id === selection.sectionId);
  if (!section) return null;
  return { section, pageId: selection.pageId, globalSlot: null };
}

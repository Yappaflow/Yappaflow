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

/**
 * Phase 8 right rail. Minimal per-section editor: variant dropdown, a handful
 * of top-level string fields (heading, subhead, eyebrow, tagline, etc.), and
 * the animation preset picker.
 *
 * The full schema-driven form (nested objects, arrays, image pickers, color
 * swatches bound to DNA palette) lands in the next pass. This version covers
 * 80% of what an agency actually edits on an MVP site.
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

export function RightRail() {
  const project = useProjectStore((s) => s.project);
  const selection = useProjectStore((s) => s.selection);
  const updateSectionVariant = useProjectStore((s) => s.updateSectionVariant);
  const updateSectionContent = useProjectStore((s) => s.updateSectionContent);
  const updateSectionAnimation = useProjectStore((s) => s.updateSectionAnimation);
  const updateGlobalContent = useProjectStore((s) => s.updateGlobalContent);

  const selected = useMemo(() => resolveSelection(project, selection), [project, selection]);

  if (!project) return null;

  if (!selected) {
    return (
      <aside className="flex h-full flex-col border-l border-current/10 p-5 text-sm opacity-60">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em]">
          Properties
        </h2>
        <p className="mt-3">
          Click a section in the canvas or the left rail to edit its content,
          variant, and animation.
        </p>
      </aside>
    );
  }

  const { section, globalSlot, pageId } = selected;
  const def = SECTION_DATA[section.type];

  // For globals, mutations go through updateGlobalContent (mutates
  // project.globals.<slot>.content). For page sections, updateSectionContent.
  function patchContent(patch: Record<string, unknown>) {
    if (globalSlot) {
      updateGlobalContent(globalSlot, patch);
      return;
    }
    if (pageId) updateSectionContent(pageId, section.id, patch);
  }
  function setVariant(variant: string) {
    if (pageId) updateSectionVariant(pageId, section.id, variant);
    // Globals also go through updateSectionVariant with their synthetic pageId
    // so the store's map-by-page path finds them — but our globals live in
    // project.globals, not pages. For Phase 8 we only expose variant swap on
    // page sections; variant change on globals is a next-pass addition.
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
          <summary className="cursor-pointer select-none">
            Raw section JSON
          </summary>
          <pre className="mt-3 max-h-64 overflow-auto rounded bg-current/5 p-2 font-mono text-[10px] leading-relaxed">
            {JSON.stringify(section, null, 2)}
          </pre>
        </details>
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
  // Only handle one level of nesting for now — enough for CTAs + logos.
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

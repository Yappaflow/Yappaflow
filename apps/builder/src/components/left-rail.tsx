"use client";

import { useState } from "react";
import type { SectionType } from "@yappaflow/types";
import { useProjectStore } from "@/lib/store";
import { SectionPicker } from "./section-picker";

export function LeftRail() {
  const project = useProjectStore((s) => s.project);
  const selection = useProjectStore((s) => s.selection);
  const selectSection = useProjectStore((s) => s.selectSection);
  const moveSection = useProjectStore((s) => s.moveSection);
  const removeSection = useProjectStore((s) => s.removeSection);
  const insertSection = useProjectStore((s) => s.insertSection);

  const [pickerOpen, setPickerOpen] = useState(false);

  if (!project) return null;
  const page = project.pages[0];
  if (!page) return null;

  function handlePick(type: SectionType) {
    if (!page) return;
    insertSection(page.id, type, page.sections.length);
    setPickerOpen(false);
  }

  const globals = project.globals;
  const globalEntries: Array<{
    slot: "announcementBar" | "header" | "footer";
    label: string;
    section: typeof globals.header | undefined;
  }> = [
    { slot: "announcementBar", label: "Announcement bar", section: globals.announcementBar },
    { slot: "header", label: "Header", section: globals.header },
    { slot: "footer", label: "Footer", section: globals.footer },
  ];

  return (
    <aside className="flex h-full flex-col border-r border-current/10">
      <div className="border-b border-current/10 px-4 py-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-60">
          Globals
        </h2>
        <ul className="mt-2 space-y-0.5">
          {globalEntries.map(({ slot, label, section }) => {
            if (!section) return null;
            const selected =
              selection?.pageId === `__globals__:${slot}` &&
              selection.sectionId === section.id;
            return (
              <li key={slot}>
                <button
                  onClick={() =>
                    selectSection(`__globals__:${slot}`, section.id)
                  }
                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm transition ${
                    selected
                      ? "bg-current/10 text-current"
                      : "opacity-70 hover:bg-current/5 hover:opacity-100"
                  }`}
                >
                  <span className="truncate">{label}</span>
                  <span className="text-[10px] uppercase tracking-wider opacity-60">
                    {section.variant}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-60">
          {page.title} · Sections
        </h2>
        <ul className="mt-2 space-y-0.5">
          {page.sections.map((section, i) => {
            const selected =
              selection?.pageId === page.id && selection.sectionId === section.id;
            return (
              <li key={section.id}>
                <div
                  className={`group flex items-center gap-1 rounded px-2 py-1.5 text-sm transition ${
                    selected ? "bg-current/10" : "hover:bg-current/5"
                  }`}
                >
                  <button
                    onClick={() => selectSection(page.id, section.id)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <span className="w-5 font-mono text-[10px] opacity-40">
                      {(i + 1).toString().padStart(2, "0")}
                    </span>
                    <span className="flex-1 truncate">{section.type}</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-50">
                      {section.variant}
                    </span>
                  </button>
                  <div className="flex opacity-0 transition group-hover:opacity-100">
                    <IconButton
                      label="Move up"
                      onClick={() => moveSection(page.id, section.id, "up")}
                      disabled={i === 0}
                    >
                      ↑
                    </IconButton>
                    <IconButton
                      label="Move down"
                      onClick={() => moveSection(page.id, section.id, "down")}
                      disabled={i === page.sections.length - 1}
                    >
                      ↓
                    </IconButton>
                    <IconButton
                      label="Remove"
                      onClick={() => removeSection(page.id, section.id)}
                    >
                      ×
                    </IconButton>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <button
          onClick={() => setPickerOpen(true)}
          className="mt-3 w-full rounded border border-dashed border-current/30 py-2 text-xs opacity-70 transition hover:border-current/60 hover:opacity-100"
        >
          + Add section
        </button>
      </div>

      {pickerOpen ? (
        <SectionPicker
          onClose={() => setPickerOpen(false)}
          onPick={handlePick}
        />
      ) : null}
    </aside>
  );
}

function IconButton({
  children,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded text-xs opacity-60 hover:bg-current/15 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-20"
    >
      {children}
    </button>
  );
}

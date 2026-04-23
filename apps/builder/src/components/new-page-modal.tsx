"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PAGE_TEMPLATES, type PageTemplate, type TemplateSectionSpec } from "@/lib/page-templates";

/**
 * Add-page dialog with a **template gallery** at the top and a title/slug
 * form at the bottom. Picking a template pre-fills the title + slug and
 * seeds the new page with that template's sections. "Blank" is one of the
 * templates so the old empty-page behaviour still exists — just no longer
 * the only option.
 *
 * The flow is single-step (pick template + enter title/slug + submit in one
 * screen) rather than a wizard, because the template selection is almost
 * always obvious and the form is small. Less friction than a two-step
 * wizard for the 90% case.
 */
export function NewPageModal({
  onClose,
  onCreate,
  existingSlugs,
}: {
  onClose: () => void;
  onCreate: (params: {
    title: string;
    slug: string;
    sections: TemplateSectionSpec[];
  }) => void;
  existingSlugs: string[];
}) {
  const [templateId, setTemplateId] = useState<string>(PAGE_TEMPLATES[0]!.id);
  const [title, setTitle] = useState(PAGE_TEMPLATES[0]!.defaultTitle);
  const [slug, setSlug] = useState(PAGE_TEMPLATES[0]!.defaultSlug);
  const [slugTouched, setSlugTouched] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function selectTemplate(template: PageTemplate) {
    setTemplateId(template.id);
    // Only overwrite title/slug when the user hasn't typed into them
    // manually. This lets a user switch templates mid-form to see sections
    // change without losing a custom title/slug they've already entered.
    if (!titleTouched) setTitle(template.defaultTitle);
    if (!slugTouched) setSlug(template.defaultSlug);
    setError(null);
  }

  function submit() {
    const trimmedTitle = title.trim();
    const resolvedSlug = slug.trim() || "/";
    if (!trimmedTitle) {
      setError("Give the page a title.");
      return;
    }
    if (!resolvedSlug || resolvedSlug === "/") {
      setError("Slug can't be empty or just '/'.");
      return;
    }
    if (existingSlugs.includes(resolvedSlug)) {
      setError(`A page already exists at ${resolvedSlug}.`);
      return;
    }
    const template = PAGE_TEMPLATES.find((t) => t.id === templateId);
    onCreate({
      title: trimmedTitle,
      slug: resolvedSlug,
      sections: template?.buildSections() ?? [],
    });
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className="flex w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-white/10 bg-paper shadow-xl dark:bg-ink"
          style={{ maxHeight: "85vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between border-b border-current/10 px-6 py-4">
            <h2 className="text-lg font-semibold">New page</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-current/10"
            >
              ×
            </button>
          </header>

          <div className="flex-1 overflow-auto p-6">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-60">
                Start from
              </p>
              <p className="mt-1 text-xs opacity-50">
                Pre-built layouts for the most common page types. Pick Blank
                to build from scratch.
              </p>
            </div>

            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {PAGE_TEMPLATES.map((template) => {
                const Icon = template.icon;
                const selected = templateId === template.id;
                return (
                  <li key={template.id}>
                    <button
                      onClick={() => selectTemplate(template)}
                      aria-selected={selected}
                      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                        selected
                          ? "border-current bg-current/10"
                          : "border-current/15 hover:border-current/40 hover:bg-current/5"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded ${
                          selected ? "bg-current/15" : "bg-current/5"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{template.label}</div>
                        <div className="text-[11px] opacity-60">
                          {template.description}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider opacity-60">
                  Title
                </span>
                <input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setTitleTouched(true);
                    setError(null);
                  }}
                  className="rounded border border-current/20 bg-transparent px-3 py-2 text-sm focus:border-current/60 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider opacity-60">
                  Slug
                </span>
                <input
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugTouched(true);
                    setError(null);
                  }}
                  className="rounded border border-current/20 bg-transparent px-3 py-2 font-mono text-sm focus:border-current/60 focus:outline-none"
                />
              </label>
            </div>

            {error ? (
              <p className="mt-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-current/10 px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-full border border-current/20 px-4 py-2 text-sm hover:border-current/40"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              className="rounded-full bg-ink px-4 py-2 text-sm text-paper dark:bg-paper dark:text-ink"
            >
              Create
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

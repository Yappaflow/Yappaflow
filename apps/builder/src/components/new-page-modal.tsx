"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Simple add-page dialog. Collects a title + slug, calls `onCreate` on
 * submit. Slug auto-derives from the title as the user types until they
 * explicitly edit the slug field. Keeps title→slug coherent without
 * preventing manual override.
 */
export function NewPageModal({
  onClose,
  onCreate,
  existingSlugs,
}: {
  onClose: () => void;
  onCreate: (params: { title: string; slug: string }) => void;
  existingSlugs: string[];
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const resolvedSlug = slugTouched ? slug : titleToSlug(title);

  function submit() {
    const trimmedTitle = title.trim();
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
    onCreate({ title: trimmedTitle, slug: resolvedSlug });
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
          className="w-full max-w-md rounded-lg border border-white/10 bg-paper p-6 shadow-xl dark:bg-ink"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">New page</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-current/10"
            >
              ×
            </button>
          </header>

          <div className="space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider opacity-60">
                Title
              </span>
              <input
                autoFocus
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError(null);
                }}
                placeholder="About"
                className="rounded border border-current/20 bg-transparent px-3 py-2 text-sm focus:border-current/60 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider opacity-60">
                Slug
              </span>
              <input
                value={resolvedSlug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                  setError(null);
                }}
                placeholder="/about"
                className="rounded border border-current/20 bg-transparent px-3 py-2 font-mono text-sm focus:border-current/60 focus:outline-none"
              />
              <span className="text-[10px] opacity-50">
                Tip: start with a leading slash, e.g. <code>/about</code>.
              </span>
            </label>
            {error ? (
              <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                {error}
              </p>
            ) : null}
          </div>

          <div className="mt-6 flex justify-end gap-2">
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

/** Derive a sensible slug from a title. Lowercases, hyphenates, strips. */
function titleToSlug(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  if (!slug) return "";
  return `/${slug}`;
}

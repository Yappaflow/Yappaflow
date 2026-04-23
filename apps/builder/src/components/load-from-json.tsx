"use client";

import { useEffect, useState } from "react";
import { SiteProjectSchema, type SiteProject } from "@yappaflow/types";

/**
 * Paste-JSON loader. Accepts a SiteProject as JSON text, validates it via
 * the canonical schema, and hands it to the parent via `onLoad`. Surfaces
 * Zod errors inline so a malformed paste is diagnosed in place instead of
 * silently dropping.
 *
 * Phase 8a: this is the primary way to bring arbitrary SiteProjects into
 * the builder (e.g., paste output from `build_site_project`). Phase 10.5
 * replaces the common entry path with the server-side /projects fetch.
 */
export function LoadFromJsonModal({
  onClose,
  onLoad,
}: {
  onClose: () => void;
  onLoad: (project: SiteProject) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleLoad() {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      setError(
        `Couldn't parse JSON: ${err instanceof Error ? err.message : "unknown"}`,
      );
      return;
    }
    const result = SiteProjectSchema.safeParse(parsed);
    if (!result.success) {
      const first = result.error.issues[0];
      const path = first?.path.join(".") || "(root)";
      setError(`Validation failed at ${path}: ${first?.message}`);
      return;
    }
    // SiteProject type widens `dna` to MergedDna — safe cast here since the
    // assembler upstream guarantees that shape for anything it produces.
    onLoad(result.data as SiteProject);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-white/10 bg-paper p-6 shadow-xl dark:bg-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Load a SiteProject</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-current/10"
          >
            ×
          </button>
        </header>
        <p className="mb-3 text-sm opacity-70">
          Paste a SiteProject JSON — for example the <code>siteProject</code>{" "}
          field from <code>build_site_project</code>. It&apos;ll be validated
          against the canonical schema and loaded into the editor. The sample
          project already present stays in localStorage untouched.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='{"schemaVersion":1,"brief":{…},"dna":{…},"pages":[…],"globals":{…}}'
          className="h-64 w-full resize-none rounded border border-current/20 bg-transparent p-3 font-mono text-xs focus:border-current/60 focus:outline-none"
        />
        {error ? (
          <p className="mt-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-current/20 px-4 py-2 text-sm hover:border-current/40"
          >
            Cancel
          </button>
          <button
            onClick={handleLoad}
            disabled={!text.trim()}
            className="rounded-full bg-ink px-4 py-2 text-sm text-paper disabled:opacity-40 dark:bg-paper dark:text-ink"
          >
            Load
          </button>
        </div>
      </div>
    </div>
  );
}

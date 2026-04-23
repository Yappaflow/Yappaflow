"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useProjectStore } from "@/lib/store";

type Status = "idle" | "working" | "error";

/**
 * Top-bar Export button. Dynamic-imports the export logic + JSZip the
 * moment the user clicks, so the initial builder bundle doesn't pay for
 * code paths that might never fire.
 *
 * On success, triggers a browser download of the generated ZIP; a short
 * visual confirmation stays on the button for a few seconds after.
 */
export function ExportButton() {
  const project = useProjectStore((s) => s.project);
  const [status, setStatus] = useState<Status>("idle");
  const [lastFilename, setLastFilename] = useState<string | null>(null);

  async function handleExport() {
    if (!project || status === "working") return;
    setStatus("working");
    try {
      const { exportSiteAsZip } = await import("@/lib/export-html");
      const result = await exportSiteAsZip(project);
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLastFilename(result.filename);
      setStatus("idle");
      // Reset the filename indicator after a few seconds.
      window.setTimeout(() => setLastFilename(null), 4000);
    } catch (err) {
      console.error("[yappaflow] export failed:", err);
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 3500);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={!project || status === "working"}
      title={
        status === "working"
          ? "Rendering every page…"
          : status === "error"
            ? "Export failed — see console"
            : "Download every page as static HTML + a ZIP"
      }
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
        status === "error"
          ? "border border-red-500/40 bg-red-500/10 text-red-600"
          : lastFilename
            ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
            : "bg-ink text-paper hover:opacity-90 dark:bg-paper dark:text-ink"
      }`}
    >
      {status === "working" ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="h-3 w-3" aria-hidden="true" />
      )}
      {status === "working"
        ? "Exporting…"
        : lastFilename
          ? "Downloaded"
          : "Export"}
    </button>
  );
}

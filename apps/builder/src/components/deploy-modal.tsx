"use client";

import { useState } from "react";
import { X, Loader2, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { useProjectStore } from "@/lib/store";

type CmsId = "shopify" | "webflow" | "wordpress";
type Phase = "select" | "deploying" | "success" | "error";

interface CmsOption {
  id: CmsId;
  name: string;
  description: string;
  bg: string;
  label: string;
}

const CMS_OPTIONS: CmsOption[] = [
  {
    id: "shopify",
    name: "Shopify",
    description: "Create pages in your Shopify store via Admin API",
    bg: "bg-[#96BF48]",
    label: "S",
  },
  {
    id: "webflow",
    name: "Webflow",
    description: "Publish to a Webflow CMS collection and go live",
    bg: "bg-[#4353FF]",
    label: "W",
  },
  {
    id: "wordpress",
    name: "WordPress",
    description: "Publish pages to WordPress via REST API",
    bg: "bg-[#21759B]",
    label: "WP",
  },
];

interface DeployResult {
  redirectUrl: string;
  published: number;
  note?: string;
}

export function DeployModal({ onClose }: { onClose: () => void }) {
  const project = useProjectStore((s) => s.project);
  const [phase, setPhase] = useState<Phase>("select");
  const [activeCms, setActiveCms] = useState<CmsId | null>(null);
  const [result, setResult] = useState<DeployResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function deploy(cmsId: CmsId) {
    if (!project) return;
    setActiveCms(cmsId);
    setPhase("deploying");

    try {
      const { exportPagesForCms } = await import("@/lib/export-html");
      const pages = exportPagesForCms(project);

      const res = await fetch(`/api/deploy/${cmsId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages }),
      });

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        redirectUrl?: string;
        published?: number;
        note?: string;
      };

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? `Deploy failed (${res.status})`);
      }

      setResult({
        redirectUrl: json.redirectUrl ?? "",
        published: json.published ?? pages.length,
        note: json.note,
      });
      setPhase("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  const cmsName = CMS_OPTIONS.find((c) => c.id === activeCms)?.name ?? activeCms;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Deploy to CMS"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm rounded-2xl border border-current/10 bg-white shadow-2xl dark:bg-neutral-900">
        {/* header */}
        <div className="flex items-center justify-between border-b border-current/10 px-5 py-4">
          <div>
            <p className="text-sm font-semibold">Deploy to CMS</p>
            <p className="mt-0.5 text-xs opacity-50">
              Choose a platform to publish your site
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 hover:bg-current/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* body */}
        <div className="p-5">
          {phase === "select" && (
            <div className="flex flex-col gap-2.5">
              {CMS_OPTIONS.map((cms) => (
                <button
                  key={cms.id}
                  onClick={() => deploy(cms.id)}
                  className="flex items-center gap-4 rounded-xl border border-current/10 px-4 py-3 text-left transition hover:border-current/30 hover:bg-current/5"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${cms.bg}`}
                  >
                    {cms.label}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{cms.name}</p>
                    <p className="text-xs opacity-50">{cms.description}</p>
                  </div>
                </button>
              ))}
              <p className="mt-1 text-center text-[11px] opacity-40">
                Credentials are read from .env.local on the server
              </p>
            </div>
          )}

          {phase === "deploying" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin opacity-50" />
              <p className="text-sm font-medium">Deploying to {cmsName}…</p>
              <p className="text-xs opacity-50">
                Rendering pages and pushing to the API
              </p>
            </div>
          )}

          {phase === "success" && result && (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle className="h-10 w-10 text-emerald-500" />
              <div className="text-center">
                <p className="text-sm font-semibold">
                  {result.published} page
                  {result.published !== 1 ? "s" : ""} published to {cmsName}
                </p>
                <p className="mt-1 text-xs opacity-50">Your site is now live</p>
                {result.note && (
                  <p className="mt-2 rounded-lg bg-current/5 px-3 py-2 text-left text-[11px] leading-relaxed opacity-70">
                    {result.note}
                  </p>
                )}
              </div>
              {result.redirectUrl && (
                <a
                  href={result.redirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View live site
                </a>
              )}
            </div>
          )}

          {phase === "error" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <div className="text-center">
                <p className="text-sm font-semibold">Deploy to {cmsName} failed</p>
                <p className="mt-1 max-w-xs break-words text-xs opacity-70">
                  {errorMsg}
                </p>
              </div>
              <button
                onClick={() => { setPhase("select"); setActiveCms(null); }}
                className="rounded-full border border-current/20 px-4 py-1.5 text-xs hover:border-current/40"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

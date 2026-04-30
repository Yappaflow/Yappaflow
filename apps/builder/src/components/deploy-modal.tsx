"use client";

import { useState } from "react";
import { X, Loader2, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { useProjectStore } from "@/lib/store";

type CmsId = "shopify" | "ikas" | "webflow" | "wordpress";
type Phase = "select" | "deploying" | "success" | "error";

interface CmsOption {
  id: CmsId;
  name: string;
  description: string;
  bg: string;
  label: string;
  /** Marks adapters that do not yet have full implementations. */
  experimental?: boolean;
}

const CMS_OPTIONS: CmsOption[] = [
  {
    id: "shopify",
    name: "Shopify",
    description: "Native Products + Pages via Admin API",
    bg: "bg-[#96BF48]",
    label: "S",
  },
  {
    id: "ikas",
    name: "IKAS",
    description: "Skeleton — wire GraphQL ProductSave/PageSave to ship",
    bg: "bg-[#FF6B35]",
    label: "I",
    experimental: true,
  },
  {
    id: "webflow",
    name: "Webflow",
    description: "Pages + products land in CMS collection (no native commerce yet)",
    bg: "bg-[#4353FF]",
    label: "W",
    experimental: true,
  },
  {
    id: "wordpress",
    name: "WordPress",
    description: "Pages via REST API (WooCommerce mapping coming)",
    bg: "bg-[#21759B]",
    label: "WP",
    experimental: true,
  },
];

interface DeployResult {
  redirectUrl: string;
  published: number;
  publishedProducts?: number;
  publishedPages?: number;
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
      const { exportForCms } = await import("@/lib/export-html");
      const bundle = exportForCms(project);

      const res = await fetch(`/api/deploy/${cmsId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bundle),
      });

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        redirectUrl?: string;
        published?: number;
        publishedProducts?: number;
        publishedPages?: number;
        note?: string;
      };

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? `Deploy failed (${res.status})`);
      }

      const totalSent =
        bundle.products.length +
        bundle.contentPages.length +
        (bundle.productIndex ? 1 : 0);

      setResult({
        redirectUrl: json.redirectUrl ?? "",
        published: json.published ?? totalSent,
        publishedProducts: json.publishedProducts,
        publishedPages: json.publishedPages,
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
              <DeployPreviewCounts />
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
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {cms.name}
                      {cms.experimental ? (
                        <span className="rounded-full bg-current/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider opacity-60">
                          Beta
                        </span>
                      ) : null}
                    </p>
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
                  {result.publishedProducts !== undefined &&
                  result.publishedPages !== undefined
                    ? `${result.publishedProducts} product${result.publishedProducts !== 1 ? "s" : ""} + ${result.publishedPages} page${result.publishedPages !== 1 ? "s" : ""}`
                    : `${result.published} resource${result.published !== 1 ? "s" : ""}`}
                  {" "}published to {cmsName}
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

/**
 * Pre-deploy summary — shows how the project will be split across native
 * product API vs. content pages so the user understands what's about to
 * ship before they pick a CMS. Counts are derived from `Page.kind`.
 */
function DeployPreviewCounts() {
  const project = useProjectStore((s) => s.project);
  if (!project) return null;
  let products = 0;
  let contentPages = 0;
  let productIndex = 0;
  for (const page of project.pages) {
    const kind = page.kind ?? "content";
    if (kind === "product") products += 1;
    else if (kind === "product-index") productIndex += 1;
    else contentPages += 1;
  }
  if (products === 0 && contentPages === 0 && productIndex === 0) return null;
  const parts: string[] = [];
  if (products > 0) parts.push(`${products} product${products !== 1 ? "s" : ""}`);
  if (contentPages > 0) parts.push(`${contentPages} page${contentPages !== 1 ? "s" : ""}`);
  if (productIndex > 0) parts.push(`catalog index`);
  return (
    <div className="rounded-lg border border-current/10 bg-current/5 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
        Will publish
      </p>
      <p className="mt-0.5 text-sm">{parts.join(" · ")}</p>
      <p className="mt-1 text-[11px] opacity-50">
        Products route to native CMS product APIs where supported.
      </p>
    </div>
  );
}

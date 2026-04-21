"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Server,
  Check,
  ExternalLink,
  Sparkles,
  ChevronLeft,
  ArrowRight,
  Loader2,
  Download,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { DashboardView } from "./DashboardShell";
import { SignalPicker } from "./deploy/SignalPicker";
import { HeroChooser } from "./deploy/HeroChooser";
import { BuildProgress } from "./BuildProgress";
import { ProductEditor } from "./ProductEditor";
import {
  startDeploy,
  extractIdentity,
  getDeployProject,
  checkDomain,
  getNamecheapUrl,
  getHostingerUrl,
  startBuild,
  confirmPurchase,
  downloadZip,
  // Shopify flow
  startShopifyDeploy,
  extractShopifyIdentity,
  getShopifyProject,
  startShopifyBuild,
  getShopifyConnection,
  getShopifyAuthorizeUrl,
  publishToShopify,
  downloadShopifyZip,
  // WordPress flow
  startWordPressDeploy,
  extractWordPressIdentity,
  getWordPressProject,
  startWordPressBuild,
  getWordPressConnection,
  getWordPressComAuthorizeUrl,
  getWordPressConfigStatus,
  connectWordPressApplicationPassword,
  publishToWordPress,
  downloadWordPressZip,
  type ProjectIdentity,
  type DomainAvailability,
  type ShopifyConnection,
  type ShopifyPublishResult,
  type WordPressConnection,
  type WordPressConfigStatus,
  type WordPressPublishResult,
  type BuildPhase,
  type BuildJobStatus,
} from "@/lib/deploy-api";

type Route = "cms" | "custom" | null;
type CMS   = "shopify" | "wordpress" | "webflow" | "ikas";
type CustomStep = "pick-signal" | "identity" | "hero" | "domain" | "download";

// CMS labels are proper nouns. Descriptions kept untranslated for now —
// this route is still a placeholder flow, will be translated when it ships.
const CMS_OPTIONS: { id: CMS; label: string; color: string; desc: string }[] = [
  { id: "shopify",   label: "Shopify",   color: "#96BF48", desc: "E-commerce stores"      },
  { id: "wordpress", label: "WordPress", color: "#21759B", desc: "Blogs & business sites" },
  { id: "webflow",   label: "Webflow",   color: "#4353FF", desc: "Design-first websites"  },
  { id: "ikas",      label: "IKAS",      color: "#F97316", desc: "Turkish e-commerce"     },
];

// ═══════════════════════════════════════════════════════════════════════════

function CmsSuccessScreen({ onBack }: { onBack: () => void }) {
  const t = useTranslations("deploy");
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-full text-center px-12 py-16">
      <div className="relative mb-8">
        {[1.4, 1.8].map((s, i) => (
          <motion.div key={i} className="absolute inset-0 rounded-full border-2 border-green-300"
            initial={{ scale: 1, opacity: 0.6 }} animate={{ scale: s, opacity: 0 }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
            style={{ width: 72, height: 72, top: 0, left: 0 }} />
        ))}
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-green-500 shadow-xl shadow-green-500/20">
          <Check size={32} strokeWidth={3} className="text-white" />
        </div>
      </div>
      <h2 className="text-3xl font-black tracking-tight text-white">{t("cmsSuccessTitle")}</h2>
      <p className="mt-2 text-white/30">{t("cmsSuccessSubtitle")}</p>
      <div className="mt-5 flex gap-3">
        <button onClick={onBack}
          className="rounded-xl border border-white/[0.05] px-5 py-2.5 text-[13px] font-semibold text-white/60 hover:bg-white/[0.04] transition-colors">
          {t("cmsBack")}
        </button>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Custom flow wizard
// ═══════════════════════════════════════════════════════════════════════════

function CustomWizard({ onExitToDashboard }: { onExitToDashboard: () => void }) {
  const t = useTranslations("deploy");
  const [step, setStep] = useState<CustomStep>("pick-signal");
  const [signalId, setSignalId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [identity, setIdentity] = useState<ProjectIdentity | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);

  const [domainInput, setDomainInput] = useState("");
  const [checkState, setCheckState] = useState<DomainAvailability | null>(null);
  const [checking, setChecking] = useState(false);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [buildStatus, setBuildStatus] = useState<{
    status:     BuildJobStatus | null;
    phase:      BuildPhase | null;
    filesDone:  number;
    filesTotal: number;
    error:      string | null;
    startedAt:  string | null;
    attempt:    number | null;
    attemptMax: number | null;
  }>({
    status: null, phase: null, filesDone: 0, filesTotal: 0,
    error: null, startedAt: null, attempt: null, attemptMax: null,
  });

  const [purchasedDomain, setPurchasedDomain] = useState("");
  const [confirmInput, setConfirmInput] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const buildStartedRef = useRef(false);

  // ── Step 1 → Step 2: kick off identity extraction ──
  const onPickSignalNext = async () => {
    if (!signalId) return;
    setTopError(null);
    try {
      const { projectId } = await startDeploy(signalId);
      setProjectId(projectId);
      setStep("identity");
      setIdentityError(null);
      const { identity } = await extractIdentity(projectId);
      setIdentity(identity);
      setDomainInput(identity.domainSuggestions[0] || "");
    } catch (err) {
      setIdentityError(err instanceof Error ? err.message : "Failed to analyze chat");
    }
  };

  // ── Debounced domain availability check ──
  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (!domainInput || step !== "domain") {
      setCheckState(null);
      return;
    }
    const name = domainInput.trim().toLowerCase();
    if (name.length < 4 || !name.includes(".")) {
      setCheckState({ available: null, reason: "invalid" });
      return;
    }
    setChecking(true);
    checkTimer.current = setTimeout(async () => {
      try {
        const r = await checkDomain(name);
        setCheckState(r);
      } catch {
        setCheckState({ available: null, reason: "unknown" });
      } finally {
        setChecking(false);
      }
    }, 500);
    return () => {
      if (checkTimer.current) clearTimeout(checkTimer.current);
    };
  }, [domainInput, step]);

  // ── Auto-start the build as soon as user reaches the domain step. ──
  //    Buying a domain is optional, but the website should already be
  //    building in the background either way.
  useEffect(() => {
    if (!projectId || step !== "domain" || buildStartedRef.current) return;
    buildStartedRef.current = true;
    startBuild(projectId).catch((err) => {
      setTopError(err instanceof Error ? err.message : "Couldn't start build");
    });
  }, [projectId, step]);

  // ── Poll build status while on step 3 or 4, until build is done/failed ──
  useEffect(() => {
    if (!projectId || (step !== "domain" && step !== "download")) return;
    if (buildStatus.status === "done" || buildStatus.status === "failed") return;

    let cancelled = false;
    const poll = async () => {
      try {
        const p = await getDeployProject(projectId);
        if (cancelled) return;
        setBuildStatus({
          status:     p.buildJobStatus,
          phase:      p.buildPhase,
          filesDone:  p.buildFilesDone,
          filesTotal: p.buildFilesTotal,
          error:      p.buildError,
          startedAt:  p.buildStartedAt,
          attempt:    p.buildAttempt,
          attemptMax: p.buildAttemptMax,
        });
      } catch {
        /* ignore polling errors */
      }
    };
    poll();
    const iv = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [projectId, step, buildStatus.status]);

  // ── "Buy on Namecheap" — opens registrar in a new tab. Build has already started. ──
  const onBuyOnNamecheap = async () => {
    if (!domainInput || !projectId) return;
    setTopError(null);
    try {
      const ncResp = await getNamecheapUrl(domainInput.trim().toLowerCase());
      window.open(ncResp.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setTopError(err instanceof Error ? err.message : "Couldn't build Namecheap URL");
    }
  };

  // ── Confirm purchase → move to download step ──
  const onConfirmPurchase = async () => {
    if (!projectId || !confirmInput) return;
    setTopError(null);
    try {
      const { domainPurchased } = await confirmPurchase(projectId, confirmInput.trim().toLowerCase());
      setPurchasedDomain(domainPurchased);
      setStep("download");
    } catch (err) {
      setTopError(err instanceof Error ? err.message : "Couldn't record purchase");
    }
  };

  // ── Skip domain purchase — go straight to download ──
  const onSkipDomain = () => {
    setTopError(null);
    setStep("download");
  };

  const onDownload = async () => {
    if (!projectId) return;
    setTopError(null);
    setDownloading(true);
    try {
      await downloadZip(projectId);
      setDownloaded(true);
    } catch (err) {
      setTopError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const onOpenHostinger = async () => {
    try {
      const { url } = await getHostingerUrl();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch { /* ignore */ }
  };

  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="max-w-xl">
      {topError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-[12px] text-red-300">
          <X size={14} className="mt-0.5 flex-shrink-0" />
          <span className="flex-1">{topError}</span>
          <button onClick={() => setTopError(null)} className="text-red-300/50 hover:text-red-200">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
        {(["pick-signal", "identity", "hero", "domain", "download"] as CustomStep[]).map((s, i) => {
          const stepOrder: CustomStep[] = ["pick-signal", "identity", "hero", "domain", "download"];
          const active   = s === step;
          const done     = stepOrder.indexOf(step) > i;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={[
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black",
                active ? "bg-[#FF6B35] text-white" : done ? "bg-green-500 text-white" : "bg-white/[0.06] text-white/40",
              ].join(" ")}>
                {done ? <Check size={11} strokeWidth={3} /> : i + 1}
              </div>
              {i < 4 && <div className={`h-px w-8 ${done ? "bg-green-500" : "bg-white/[0.06]"}`} />}
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: Pick Signal ── */}
      {step === "pick-signal" && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="mb-1 text-[15px] font-bold text-white">{t("pickSignalTitle")}</h2>
          <p className="mb-4 text-[12px] text-white/40">{t("pickSignalDesc")}</p>
          <SignalPicker selectedId={signalId} onSelect={setSignalId} />
          <button
            disabled={!signalId}
            onClick={onPickSignalNext}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-[13px] font-bold text-[#0A0A0A] shadow-xl shadow-black/20 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("pickSignalCta")}
            <ArrowRight size={15} />
          </button>
        </motion.div>
      )}

      {/* ── STEP 2: Identity reveal ── */}
      {step === "identity" && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="mb-1 text-[15px] font-bold text-white">{t("identityTitle")}</h2>
          <p className="mb-4 text-[12px] text-white/40">{t("identityDesc")}</p>

          {identityError && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-[13px] text-red-300">
              {identityError}
              <button
                onClick={onPickSignalNext}
                className="ml-2 underline hover:text-red-200"
              >
                {t("identityRetry")}
              </button>
            </div>
          )}

          {!identity && !identityError && (
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-[#111114] p-6">
              <Loader2 size={16} className="animate-spin text-[#FF6B35]" />
              <div>
                <p className="text-[13px] font-semibold text-white">{t("identityAnalyzingTitle")}</p>
                <p className="text-[11px] text-white/40">{t("identityAnalyzingDesc")}</p>
              </div>
            </div>
          )}

          {identity && (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.05] bg-[#111114] p-5">
                <p className="text-[11px] uppercase tracking-wider text-white/30">{t("identityBusinessLabel")}</p>
                <p className="mt-1 text-[22px] font-black text-white">{identity.businessName}</p>
                {identity.tagline && (
                  <p className="mt-1 text-[13px] text-white/60">{identity.tagline}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  {identity.industry && (
                    <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-white/50">
                      {identity.industry}
                    </span>
                  )}
                  {identity.tone && (
                    <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-white/50">
                      {identity.tone}
                    </span>
                  )}
                  {identity.city && (
                    <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-white/50">
                      {identity.city}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] uppercase tracking-wider text-white/30">{t("identityDomainSuggestionsLabel")}</p>
                <div className="flex flex-wrap gap-2">
                  {identity.domainSuggestions.map((d) => (
                    <button
                      key={d}
                      onClick={() => { setDomainInput(d); setStep("hero"); }}
                      className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[12px] font-mono text-white/70 hover:border-[#FF6B35] hover:text-[#FF6B35]"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep("hero")}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-[13px] font-bold text-[#0A0A0A] shadow-xl shadow-black/20 hover:opacity-80"
              >
                {t("identityPickDomainCta")}
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* ── STEP 3: Hero chooser — 3 AI-generated variants ── */}
      {step === "hero" && projectId && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <HeroChooser
            projectId={projectId}
            onReady={() => setStep("domain")}
            onSkip={() => setStep("domain")}
          />
        </motion.div>
      )}

      {/* ── STEP 4: Domain (optional) + parallel build ── */}
      {step === "domain" && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-white">
                {t("domainTitle")}
                <span className="ml-2 rounded-full border border-white/[0.1] px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  {t("domainOptionalTag")}
                </span>
              </h2>
              <p className="mt-1 text-[12px] text-white/40">{t("domainDesc")}</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.05] bg-[#111114] p-4">
            <label className="block text-[11px] uppercase tracking-wider text-white/30">{t("domainLabel")}</label>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[13px] text-white/30">https://</span>
              <input
                autoFocus
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder={t("domainPlaceholder")}
                className="flex-1 bg-transparent font-mono text-[14px] font-semibold text-white outline-none placeholder:text-white/20"
              />
              {checking && <Loader2 size={14} className="animate-spin text-white/40" />}
              {!checking && checkState?.available === true && (
                <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-400">
                  {t("domainStatusAvailable")}
                </span>
              )}
              {!checking && checkState?.available === false && (
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                  {t("domainStatusTaken")}
                </span>
              )}
              {!checking && checkState?.available === null && checkState?.reason !== "invalid" && domainInput && (
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {t("domainStatusUnknown")}
                </span>
              )}
            </div>
          </div>

          {identity?.domainSuggestions && identity.domainSuggestions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {identity.domainSuggestions.map((d) => (
                <button
                  key={d}
                  onClick={() => setDomainInput(d)}
                  className={[
                    "rounded-full border px-2.5 py-1 text-[11px] font-mono",
                    domainInput === d
                      ? "border-[#FF6B35] text-[#FF6B35]"
                      : "border-white/[0.06] text-white/40 hover:border-white/[0.15] hover:text-white/70",
                  ].join(" ")}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={onBuyOnNamecheap}
            disabled={!domainInput}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-3 text-[13px] font-bold text-white shadow-xl shadow-[#FF6B35]/20 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ExternalLink size={15} />
            {t("domainBuyCta")}
          </button>

          <div className="mt-5">
            <BuildProgress
              status={buildStatus.status}
              phase={buildStatus.phase}
              filesDone={buildStatus.filesDone}
              filesTotal={buildStatus.filesTotal}
              startedAt={buildStatus.startedAt}
              attempt={buildStatus.attempt}
              attemptMax={buildStatus.attemptMax}
              error={buildStatus.error}
              accent="#FF6B35"
              subtitle={t("buildSubtitle")}
            />
          </div>

          <div className="mt-6 rounded-xl border border-white/[0.05] bg-[#111114] p-4">
            <p className="text-[11px] uppercase tracking-wider text-white/30">{t("confirmPurchaseLabel")}</p>
            <p className="mt-1 text-[12px] text-white/50">{t("confirmPurchaseDesc")}</p>
            <input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={t("confirmPurchasePlaceholder")}
              className="mt-3 w-full rounded-lg border border-white/[0.05] bg-[#0A0A0A] px-3 py-2 font-mono text-[13px] text-white outline-none placeholder:text-white/20 focus:border-[#FF6B35]"
            />
            <button
              onClick={onConfirmPurchase}
              disabled={!confirmInput}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-[13px] font-bold text-[#0A0A0A] hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("confirmPurchaseCta")}
              <ArrowRight size={14} />
            </button>
          </div>

          <button
            onClick={onSkipDomain}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/[0.05] bg-transparent py-2.5 text-[12px] font-semibold text-white/50 transition-colors hover:bg-white/[0.03] hover:text-white"
          >
            {t("skipDomainCta")}
          </button>
        </motion.div>
      )}

      {/* ── STEP 4: Download ── */}
      {step === "download" && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="mb-1 text-[15px] font-bold text-white">{t("downloadTitle")}</h2>
          <p className="mb-4 text-[12px] text-white/40">{t("downloadDesc")}</p>

          <div className="rounded-2xl border border-white/[0.05] bg-[#111114] p-6">
            {purchasedDomain ? (
              <div className="flex items-center gap-3">
                <Globe size={16} className="text-green-400" />
                <span className="font-mono text-[14px] font-semibold text-white">
                  {purchasedDomain}
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <Globe size={16} className="mt-0.5 text-white/40" />
                <div>
                  <p className="text-[13px] font-semibold text-white">{t("noDomainTitle")}</p>
                  <p className="mt-0.5 text-[11px] text-white/40">{t("noDomainDesc")}</p>
                </div>
              </div>
            )}

            {buildStatus.status !== "done" && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/[0.05] bg-[#0A0A0A] px-3 py-2.5 text-[12px] text-white/50">
                <Loader2 size={14} className="animate-spin" />
                {t("downloadFinalizing", { done: buildStatus.filesDone, total: buildStatus.filesTotal || "…" })}
              </div>
            )}

            <button
              onClick={onDownload}
              disabled={downloading || buildStatus.status !== "done"}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-[13px] font-bold text-[#0A0A0A] shadow-xl shadow-black/20 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {downloading ? t("downloadPreparing") : downloaded ? t("downloadAgain") : t("downloadCta")}
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/[0.05] bg-[#111114] p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#FF6B35]/10">
                <Server size={14} className="text-[#FF6B35]" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-white">{t("hostTitle")}</p>
                <p className="mt-0.5 text-[11px] text-white/40">{t("hostDesc")}</p>
                <button
                  onClick={onOpenHostinger}
                  className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#FF6B35] hover:underline"
                >
                  {t("hostCta")}
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={onExitToDashboard}
            className="mt-6 w-full rounded-xl border border-white/[0.05] py-2.5 text-[13px] font-semibold text-white/40 hover:bg-white/[0.04] hover:text-white"
          >
            {t("downloadBack")}
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Shopify flow wizard — end-to-end: pick signal → extract → build → push
// ═══════════════════════════════════════════════════════════════════════════

type ShopifyStep = "pick-signal" | "identity" | "hero" | "build" | "publish";

function ShopifyWizard({ onExitToDashboard }: { onExitToDashboard: () => void }) {
  const t = useTranslations("deploy");
  const [step, setStep] = useState<ShopifyStep>("pick-signal");
  const [signalId, setSignalId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [identity, setIdentity] = useState<ProjectIdentity | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);

  const [buildStatus, setBuildStatus] = useState<{
    status:     BuildJobStatus | null;
    phase:      BuildPhase | null;
    filesDone:  number;
    filesTotal: number;
    error:      string | null;
    startedAt:  string | null;
    attempt:    number | null;
    attemptMax: number | null;
  }>({
    status: null, phase: null, filesDone: 0, filesTotal: 0,
    error: null, startedAt: null, attempt: null, attemptMax: null,
  });
  const buildStartedRef = useRef(false);

  const [connection, setConnection] = useState<ShopifyConnection | null>(null);
  const [shopInput, setShopInput]   = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<ShopifyPublishResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded]   = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  // Step 1 → Step 2: kick off identity extraction on the shopify-platform Project
  const onPickSignalNext = async () => {
    if (!signalId) return;
    setTopError(null);
    try {
      const { projectId } = await startShopifyDeploy(signalId);
      setProjectId(projectId);
      setStep("identity");
      setIdentityError(null);
      const { identity } = await extractShopifyIdentity(projectId);
      setIdentity(identity);
    } catch (err) {
      setIdentityError(err instanceof Error ? err.message : "Failed to analyze chat");
    }
  };

  // Auto-fire the build when entering the build step
  useEffect(() => {
    if (!projectId || step !== "build" || buildStartedRef.current) return;
    buildStartedRef.current = true;
    startShopifyBuild(projectId).catch((err) => {
      setTopError(err instanceof Error ? err.message : "Couldn't start build");
    });
  }, [projectId, step]);

  // Poll build status
  useEffect(() => {
    if (!projectId || (step !== "build" && step !== "publish")) return;
    if (buildStatus.status === "done" || buildStatus.status === "failed") return;

    let cancelled = false;
    const poll = async () => {
      try {
        const p = await getShopifyProject(projectId);
        if (cancelled) return;
        setBuildStatus({
          status:     p.buildJobStatus,
          phase:      p.buildPhase,
          filesDone:  p.buildFilesDone,
          filesTotal: p.buildFilesTotal,
          error:      p.buildError,
          startedAt:  p.buildStartedAt,
          attempt:    p.buildAttempt,
          attemptMax: p.buildAttemptMax,
        });
      } catch {
        /* ignore polling errors */
      }
    };
    poll();
    const iv = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [projectId, step, buildStatus.status]);

  // Load the current Shopify connection (so we know whether to show Connect vs Publish)
  const refreshConnection = async () => {
    try {
      const c = await getShopifyConnection();
      setConnection(c);
    } catch {
      setConnection({ connected: false });
    }
  };
  useEffect(() => { refreshConnection(); }, []);

  // Detect OAuth callback return: URL has ?shopify=connected&shop=…
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("shopify");
    if (status === "connected") {
      refreshConnection();
      // Clean the URL so a refresh doesn't re-trigger this.
      const clean = new URL(window.location.href);
      clean.searchParams.delete("shopify");
      clean.searchParams.delete("shop");
      window.history.replaceState({}, "", clean.toString());
    } else if (status === "error") {
      setTopError(t("shopifyConnectFailed", { reason: params.get("reason") ?? "unknown" }));
    }
  }, []);

  // Auto-advance only build → publish. Identity → build is an explicit
  // click now so the agency has a chance to review / edit the product
  // catalog before we fire off the (long) theme generation.
  useEffect(() => {
    if (step === "build" && buildStatus.status === "done") setStep("publish");
  }, [step, buildStatus.status]);

  const onConnectShopify = () => {
    const shop = shopInput.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
      setTopError(t("shopifyInvalidDomain"));
      return;
    }
    try {
      window.location.href = getShopifyAuthorizeUrl(shop);
    } catch (err) {
      setTopError(err instanceof Error ? err.message : t("shopifyCouldntStartOauth"));
    }
  };

  const onPublish = async () => {
    if (!projectId) return;
    setTopError(null);
    setPublishing(true);
    try {
      const result = await publishToShopify(projectId);
      setPublishResult(result);
    } catch (err) {
      setTopError(err instanceof Error ? err.message : t("shopifyPublishFailed"));
    } finally {
      setPublishing(false);
    }
  };

  const onDownload = async () => {
    if (!projectId) return;
    setTopError(null);
    setDownloading(true);
    try {
      await downloadShopifyZip(projectId);
      setDownloaded(true);
    } catch (err) {
      setTopError(err instanceof Error ? err.message : t("downloadFailed"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-xl">
      {topError && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[12px] text-red-300">
          {topError}
        </div>
      )}

      {/* Step 1 — pick signal */}
      {step === "pick-signal" && (
        <div>
          <h3 className="text-[18px] font-black text-white mb-2">{t("shopifyPickSignalTitle")}</h3>
          <p className="text-[13px] text-white/40 mb-5">
            {t("shopifyPickSignalDesc")}
          </p>
          <SignalPicker selectedId={signalId} onSelect={setSignalId} />
          <button
            onClick={onPickSignalNext}
            disabled={!signalId}
            className="mt-5 w-full rounded-xl bg-white py-3 text-[13px] font-bold text-[#0A0A0A] disabled:opacity-30 hover:opacity-80 transition-opacity"
          >
            {t("shopifyContinue")}
          </button>
        </div>
      )}

      {/* Step 2 — identity + product editor */}
      {step === "identity" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.05] bg-[#111114] p-6">
            {!identity && !identityError && (
              <div className="flex items-center gap-3 text-white/60">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-[13px]">{t("shopifyAnalyzing")}</span>
              </div>
            )}
            {identityError && (
              <p className="text-[13px] text-red-400">{identityError}</p>
            )}
            {identity && (
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wider text-white/30">{t("shopifyBusinessLabel")}</div>
                <h4 className="text-[20px] font-black text-white">{identity.businessName}</h4>
                {identity.tagline && <p className="mt-1 text-[13px] text-white/50">{identity.tagline}</p>}
                <p className="mt-2 text-[12px] text-white/30">
                  {[identity.industry, identity.tone, identity.city].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}
          </div>

          {identity && projectId && (
            <ProductEditor
              projectId={projectId}
              accent="#96BF48"
              onSaved={(ps) => setIdentity((cur) => cur ? { ...cur, products: ps } : cur)}
            />
          )}

          {identity && (
            <button
              onClick={() => setStep("hero")}
              className="w-full rounded-xl bg-[#96BF48] py-3 text-[13px] font-bold text-white shadow-xl shadow-[#96BF48]/20 hover:opacity-90 transition-opacity"
            >
              {t("shopifyGenerateThemeCta")}
            </button>
          )}
        </div>
      )}

      {/* Step 3 — hero chooser (AI-generated variants) */}
      {step === "hero" && projectId && (
        <HeroChooser
          projectId={projectId}
          onReady={() => setStep("build")}
          onSkip={() => setStep("build")}
        />
      )}

      {/* Step 4 — build */}
      {step === "build" && (
        <BuildProgress
          status={buildStatus.status}
          phase={buildStatus.phase}
          filesDone={buildStatus.filesDone}
          filesTotal={buildStatus.filesTotal}
          startedAt={buildStatus.startedAt}
          attempt={buildStatus.attempt}
          attemptMax={buildStatus.attemptMax}
          error={buildStatus.error}
          accent="#96BF48"
          subtitle={t("shopifyBuildDesc")}
        />
      )}

      {/* Step 4 — publish */}
      {step === "publish" && (
        <div className="space-y-4">
          {publishResult ? (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
                  <Check size={16} strokeWidth={3} className="text-white" />
                </div>
                <h3 className="text-[18px] font-black text-white">{t("shopifyPushedTitle")}</h3>
              </div>
              <p className="text-[13px] text-white/60">
                {t("shopifyPushedBody", { themeFiles: publishResult.themeFiles, productsCreated: publishResult.productsCreated, shopDomain: publishResult.shopDomain })}
              </p>
              <a
                href={publishResult.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold text-[#0A0A0A] hover:opacity-80 transition-opacity"
              >
                {t("shopifyOpenAdmin")}
                <ExternalLink size={14} />
              </a>
            </div>
          ) : connection?.connected && connection.shopDomain ? (
            <div className="rounded-2xl border border-white/[0.05] bg-[#111114] p-6">
              <div className="mb-1 text-[11px] uppercase tracking-wider text-white/30">{t("shopifyConnectedStore")}</div>
              <h4 className="text-[16px] font-black text-white">{connection.shopDomain}</h4>
              <p className="mt-1 text-[12px] text-white/40">{t("shopifyScopes", { scopes: connection.scopes ?? "" })}</p>
              <button
                onClick={onPublish}
                disabled={publishing}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#96BF48] px-4 py-2.5 text-[13px] font-bold text-white hover:opacity-80 disabled:opacity-40 transition-opacity"
              >
                {publishing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {publishing ? t("shopifyPushing") : t("shopifyPushNow")}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.05] bg-[#111114] p-6">
              <h3 className="text-[16px] font-black text-white mb-1">{t("shopifyConnectTitle")}</h3>
              <p className="text-[13px] text-white/40 mb-4">
                {t("shopifyConnectDesc")}
              </p>
              <input
                type="text"
                placeholder={t("shopifyShopPlaceholder")}
                value={shopInput}
                onChange={(e) => setShopInput(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#0A0A0A] px-4 py-2.5 text-[14px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
              />
              <button
                onClick={onConnectShopify}
                className="mt-3 w-full rounded-xl bg-white py-3 text-[13px] font-bold text-[#0A0A0A] hover:opacity-80 transition-opacity"
              >
                {t("shopifyConnectCta")}
              </button>
            </div>
          )}

          {/* Always-available fallback: manual ZIP download */}
          <div className="rounded-2xl border border-white/[0.05] bg-[#111114] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-[14px] font-black text-white">{t("shopifyManualTitle")}</h4>
                <p className="mt-1 text-[12px] text-white/40">
                  {t("shopifyManualDesc")}
                </p>
              </div>
              <button
                onClick={onDownload}
                disabled={downloading || buildStatus.status !== "done"}
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2 text-[12px] font-bold text-white/70 hover:text-white hover:bg-white/[0.04] disabled:opacity-30 transition-all"
              >
                {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                {downloaded ? t("downloaded") : t("downloadZip")}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onExitToDashboard}
        className="mt-6 w-full rounded-xl border border-white/[0.05] py-2.5 text-[13px] font-semibold text-white/40 hover:bg-white/[0.04] hover:text-white"
      >
        {t("downloadBack")}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  WordPress flow wizard — pick signal → extract → build → connect → push
// ═══════════════════════════════════════════════════════════════════════════
//
// Design choice: WordPress supports two connection flavors —
//   • self_hosted: Application Password (paste-in flow, works for everyone)
//   • dotcom:     WordPress.com OAuth (only if the server operator has
//                 registered a WP.com developer app)
//
// The wizard defaults to self-hosted because it covers the overwhelming
// majority of agency sites and needs no server-side secrets. If the
// server advertises dotcomOAuthConfigured=true via the config-status
// endpoint, the user can flip to the OAuth flow instead.

type WordPressStep = "pick-signal" | "identity" | "hero" | "build" | "publish";

function WordPressWizard({ onExitToDashboard }: { onExitToDashboard: () => void }) {
  const t = useTranslations("deploy");
  const [step, setStep] = useState<WordPressStep>("pick-signal");
  const [signalId, setSignalId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [identity, setIdentity] = useState<ProjectIdentity | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);

  const [buildStatus, setBuildStatus] = useState<{
    status:     BuildJobStatus | null;
    phase:      BuildPhase | null;
    filesDone:  number;
    filesTotal: number;
    error:      string | null;
    startedAt:  string | null;
    attempt:    number | null;
    attemptMax: number | null;
  }>({
    status: null, phase: null, filesDone: 0, filesTotal: 0,
    error: null, startedAt: null, attempt: null, attemptMax: null,
  });
  const buildStartedRef = useRef(false);

  const [configStatus, setConfigStatus] = useState<WordPressConfigStatus | null>(null);
  const [connection, setConnection] = useState<WordPressConnection | null>(null);

  const [connectFlavor, setConnectFlavor] = useState<"self_hosted" | "dotcom">("self_hosted");
  // Self-hosted connect form
  const [siteUrlInput, setSiteUrlInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [appPasswordInput, setAppPasswordInput] = useState("");
  const [connecting, setConnecting] = useState(false);

  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<WordPressPublishResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded]   = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  // Step 1 → Step 2: kick off identity extraction on the wordpress-platform Project
  const onPickSignalNext = async () => {
    if (!signalId) return;
    setTopError(null);
    try {
      const { projectId } = await startWordPressDeploy(signalId);
      setProjectId(projectId);
      setStep("identity");
      setIdentityError(null);
      const { identity } = await extractWordPressIdentity(projectId);
      setIdentity(identity);
    } catch (err) {
      setIdentityError(err instanceof Error ? err.message : "Failed to analyze chat");
    }
  };

  // Auto-fire the build when entering the build step
  useEffect(() => {
    if (!projectId || step !== "build" || buildStartedRef.current) return;
    buildStartedRef.current = true;
    startWordPressBuild(projectId).catch((err) => {
      setTopError(err instanceof Error ? err.message : "Couldn't start build");
    });
  }, [projectId, step]);

  // Poll build status
  useEffect(() => {
    if (!projectId || (step !== "build" && step !== "publish")) return;
    if (buildStatus.status === "done" || buildStatus.status === "failed") return;

    let cancelled = false;
    const poll = async () => {
      try {
        const p = await getWordPressProject(projectId);
        if (cancelled) return;
        setBuildStatus({
          status:     p.buildJobStatus,
          phase:      p.buildPhase,
          filesDone:  p.buildFilesDone,
          filesTotal: p.buildFilesTotal,
          error:      p.buildError,
          startedAt:  p.buildStartedAt,
          attempt:    p.buildAttempt,
          attemptMax: p.buildAttemptMax,
        });
      } catch {
        /* ignore polling errors */
      }
    };
    poll();
    const iv = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [projectId, step, buildStatus.status]);

  // Config + connection on mount (tells us which flavors are available and
  // whether we already have a connected site).
  const refreshConnection = async () => {
    try {
      const c = await getWordPressConnection();
      setConnection(c);
    } catch {
      setConnection({ connected: false });
    }
  };
  useEffect(() => { refreshConnection(); }, []);
  useEffect(() => {
    (async () => {
      try {
        const s = await getWordPressConfigStatus();
        setConfigStatus(s);
        // If WP.com OAuth isn't configured, hide the toggle entirely.
        if (!s.dotcomOAuthConfigured) setConnectFlavor("self_hosted");
      } catch {
        setConfigStatus({
          selfHostedSupported:   true,
          dotcomOAuthConfigured: false,
          apiVersion:            "wp/v2",
          scopes:                "",
          redirectUri:           "",
        });
      }
    })();
  }, []);

  // Detect WP.com OAuth callback return: URL has ?wordpress=connected&site=…
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("wordpress");
    if (status === "connected") {
      refreshConnection();
      const clean = new URL(window.location.href);
      clean.searchParams.delete("wordpress");
      clean.searchParams.delete("site");
      window.history.replaceState({}, "", clean.toString());
    } else if (status === "error") {
      setTopError(t("wpConnectFailed", { reason: params.get("reason") ?? "unknown" }));
    }
  }, []);

  // Auto-advance only build → publish. Identity → build is an explicit
  // click now so the agency has a chance to review / edit the product
  // catalog (especially important for WooCommerce).
  useEffect(() => {
    if (step === "build" && buildStatus.status === "done") setStep("publish");
  }, [step, buildStatus.status]);

  const onConnectSelfHosted = async () => {
    setTopError(null);
    if (!siteUrlInput.trim() || !usernameInput.trim() || !appPasswordInput.trim()) {
      setTopError(t("wpMissingFields"));
      return;
    }
    setConnecting(true);
    try {
      await connectWordPressApplicationPassword({
        siteUrl:             siteUrlInput.trim(),
        username:            usernameInput.trim(),
        applicationPassword: appPasswordInput,
      });
      await refreshConnection();
      // Clear sensitive inputs once the token is stored server-side.
      setAppPasswordInput("");
    } catch (err) {
      setTopError(err instanceof Error ? err.message : t("wpCouldntVerify"));
    } finally {
      setConnecting(false);
    }
  };

  const onConnectDotCom = () => {
    try {
      window.location.href = getWordPressComAuthorizeUrl(siteUrlInput.trim() || undefined);
    } catch (err) {
      setTopError(err instanceof Error ? err.message : t("shopifyCouldntStartOauth"));
    }
  };

  const onPublish = async () => {
    if (!projectId) return;
    setTopError(null);
    setPublishing(true);
    try {
      const result = await publishToWordPress(projectId);
      setPublishResult(result);
    } catch (err) {
      setTopError(err instanceof Error ? err.message : t("shopifyPublishFailed"));
    } finally {
      setPublishing(false);
    }
  };

  const onDownload = async () => {
    if (!projectId) return;
    setTopError(null);
    setDownloading(true);
    try {
      await downloadWordPressZip(projectId);
      setDownloaded(true);
    } catch (err) {
      setTopError(err instanceof Error ? err.message : t("downloadFailed"));
    } finally {
      setDownloading(false);
    }
  };

  const wordpressAccent = "#21759B"; // WordPress brand blue

  return (
    <div className="max-w-xl">
      {topError && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[12px] text-red-300">
          {topError}
        </div>
      )}

      {/* Step 1 — pick signal */}
      {step === "pick-signal" && (
        <div>
          <h3 className="text-[18px] font-black text-white mb-2">{t("shopifyPickSignalTitle")}</h3>
          <p className="text-[13px] text-white/40 mb-5">
            {t("wpPickSignalDesc")}
          </p>
          <SignalPicker selectedId={signalId} onSelect={setSignalId} />
          <button
            onClick={onPickSignalNext}
            disabled={!signalId}
            className="mt-5 w-full rounded-xl bg-white py-3 text-[13px] font-bold text-[#0A0A0A] disabled:opacity-30 hover:opacity-80 transition-opacity"
          >
            {t("shopifyContinue")}
          </button>
        </div>
      )}

      {/* Step 2 — identity + product editor */}
      {step === "identity" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.05] bg-[#111114] p-6">
            {!identity && !identityError && (
              <div className="flex items-center gap-3 text-white/60">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-[13px]">{t("shopifyAnalyzing")}</span>
              </div>
            )}
            {identityError && (
              <p className="text-[13px] text-red-400">{identityError}</p>
            )}
            {identity && (
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wider text-white/30">{t("shopifyBusinessLabel")}</div>
                <h4 className="text-[20px] font-black text-white">{identity.businessName}</h4>
                {identity.tagline && <p className="mt-1 text-[13px] text-white/50">{identity.tagline}</p>}
                <p className="mt-2 text-[12px] text-white/30">
                  {[identity.industry, identity.tone, identity.city].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}
          </div>

          {identity && projectId && (
            <ProductEditor
              projectId={projectId}
              accent={wordpressAccent}
              onSaved={(ps) => setIdentity((cur) => cur ? { ...cur, products: ps } : cur)}
            />
          )}

          {identity && (
            <button
              onClick={() => setStep("hero")}
              className="w-full rounded-xl py-3 text-[13px] font-bold text-white shadow-xl hover:opacity-90 transition-opacity"
              style={{ background: wordpressAccent, boxShadow: `0 20px 40px -20px ${wordpressAccent}80` }}
            >
              {t("wpGenerateThemeCta")}
            </button>
          )}
        </div>
      )}

      {/* Step 3 — hero chooser (AI-generated variants) */}
      {step === "hero" && projectId && (
        <HeroChooser
          projectId={projectId}
          onReady={() => setStep("build")}
          onSkip={() => setStep("build")}
        />
      )}

      {/* Step 4 — build */}
      {step === "build" && (
        <BuildProgress
          status={buildStatus.status}
          phase={buildStatus.phase}
          filesDone={buildStatus.filesDone}
          filesTotal={buildStatus.filesTotal}
          startedAt={buildStatus.startedAt}
          attempt={buildStatus.attempt}
          attemptMax={buildStatus.attemptMax}
          error={buildStatus.error}
          accent={wordpressAccent}
          subtitle={t("wpBuildDesc")}
        />
      )}

      {/* Step 4 — publish */}
      {step === "publish" && (
        <div className="space-y-4">
          {publishResult ? (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
                  <Check size={16} strokeWidth={3} className="text-white" />
                </div>
                <h3 className="text-[18px] font-black text-white">{t("wpPushedTitle")}</h3>
              </div>
              <p className="text-[13px] text-white/60">
                {t("wpPushedPages", { pagesCreated: publishResult.pagesCreated })}
                {publishResult.wooCommerceAvailable
                  ? t("wpPushedWithWoo", { productsCreated: publishResult.productsCreated })
                  : publishResult.productsCreated === 0 && connection?.wooCommerceEnabled === false
                    ? t("wpPushedNoWoo")
                    : ""}
                {t("wpPushedSite", { siteUrl: publishResult.siteUrl })}
              </p>
              <p className="mt-3 text-[12px] text-white/40">
                {t("wpThemeUploadHint")}
              </p>
              <a
                href={publishResult.themeAdminUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold text-[#0A0A0A] hover:opacity-80 transition-opacity"
              >
                {t("wpOpenThemesAdmin")}
                <ExternalLink size={14} />
              </a>
            </div>
          ) : connection?.connected && connection.siteUrl ? (
            <div className="rounded-2xl border border-white/[0.05] bg-[#111114] p-6">
              <div className="mb-1 text-[11px] uppercase tracking-wider text-white/30">
                {connection.flavor === "dotcom" ? t("wpConnectedSiteDotcom") : t("wpConnectedSiteSelf")}
              </div>
              <h4 className="text-[16px] font-black text-white break-all">{connection.siteUrl}</h4>
              {connection.username && (
                <p className="mt-1 text-[12px] text-white/40">{t("wpUserLabel", { username: connection.username })}</p>
              )}
              {connection.wooCommerceEnabled ? (
                <p className="mt-1 text-[12px] text-emerald-400">{t("wpWooDetected")}</p>
              ) : (
                <p className="mt-1 text-[12px] text-white/30">{t("wpWooNotDetected")}</p>
              )}
              <button
                onClick={onPublish}
                disabled={publishing}
                className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-white hover:opacity-80 disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: wordpressAccent }}
              >
                {publishing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {publishing ? t("wpPushing") : t("wpPushNow")}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.05] bg-[#111114] p-6">
              <h3 className="text-[16px] font-black text-white mb-1">{t("wpConnectTitle")}</h3>
              <p className="text-[13px] text-white/40 mb-4">
                {t("wpConnectDesc")}
              </p>

              {/* Flavor toggle — only shown when WP.com OAuth is server-configured */}
              {configStatus?.dotcomOAuthConfigured && (
                <div className="mb-4 inline-flex rounded-xl border border-white/[0.08] bg-[#0A0A0A] p-0.5">
                  {(["self_hosted", "dotcom"] as const).map((flav) => (
                    <button
                      key={flav}
                      onClick={() => setConnectFlavor(flav)}
                      className={[
                        "rounded-lg px-3 py-1.5 text-[12px] font-bold transition-colors",
                        connectFlavor === flav
                          ? "bg-white text-[#0A0A0A]"
                          : "text-white/50 hover:text-white",
                      ].join(" ")}
                    >
                      {flav === "self_hosted" ? t("wpSelfHosted") : t("wpDotcom")}
                    </button>
                  ))}
                </div>
              )}

              {connectFlavor === "self_hosted" ? (
                <>
                  <label className="block text-[11px] uppercase tracking-wider text-white/30 mb-1">{t("wpSiteUrlLabel")}</label>
                  <input
                    type="text"
                    placeholder={t("wpSiteUrlPlaceholder")}
                    value={siteUrlInput}
                    onChange={(e) => setSiteUrlInput(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0A0A0A] px-4 py-2.5 text-[14px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 mb-3"
                  />
                  <label className="block text-[11px] uppercase tracking-wider text-white/30 mb-1">{t("wpUsernameLabel")}</label>
                  <input
                    type="text"
                    placeholder={t("wpUsernamePlaceholder")}
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0A0A0A] px-4 py-2.5 text-[14px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 mb-3"
                  />
                  <label className="block text-[11px] uppercase tracking-wider text-white/30 mb-1">
                    {t("wpAppPasswordLabel")}
                  </label>
                  <input
                    type="password"
                    placeholder={t("wpAppPasswordPlaceholder")}
                    value={appPasswordInput}
                    onChange={(e) => setAppPasswordInput(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0A0A0A] px-4 py-2.5 text-[14px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
                  />
                  <p className="mt-2 text-[11px] text-white/30 leading-relaxed">
                    {t("wpAppPasswordHint")}
                  </p>
                  <button
                    onClick={onConnectSelfHosted}
                    disabled={connecting}
                    className="mt-3 w-full rounded-xl py-3 text-[13px] font-bold text-white hover:opacity-80 disabled:opacity-40 transition-opacity"
                    style={{ backgroundColor: wordpressAccent }}
                  >
                    {connecting ? t("wpVerifying") : t("wpConnectSite")}
                  </button>
                </>
              ) : (
                <>
                  <label className="block text-[11px] uppercase tracking-wider text-white/30 mb-1">
                    {t("wpDotcomSiteUrlLabel")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("wpDotcomSiteUrlPlaceholder")}
                    value={siteUrlInput}
                    onChange={(e) => setSiteUrlInput(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0A0A0A] px-4 py-2.5 text-[14px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
                  />
                  <button
                    onClick={onConnectDotCom}
                    className="mt-3 w-full rounded-xl py-3 text-[13px] font-bold text-white hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: wordpressAccent }}
                  >
                    {t("wpConnectDotcom")}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Always-available fallback: manual ZIP download */}
          <div className="rounded-2xl border border-white/[0.05] bg-[#111114] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-[14px] font-black text-white">{t("shopifyManualTitle")}</h4>
                <p className="mt-1 text-[12px] text-white/40">
                  {t("wpManualDesc")}
                </p>
              </div>
              <button
                onClick={onDownload}
                disabled={downloading || buildStatus.status !== "done"}
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2 text-[12px] font-bold text-white/70 hover:text-white hover:bg-white/[0.04] disabled:opacity-30 transition-all"
              >
                {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                {downloaded ? t("downloaded") : t("downloadZip")}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onExitToDashboard}
        className="mt-6 w-full rounded-xl border border-white/[0.05] py-2.5 text-[13px] font-semibold text-white/40 hover:bg-white/[0.04] hover:text-white"
      >
        {t("downloadBack")}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

interface Props { setView: (v: DashboardView) => void; }

export function DeploymentHub({ setView }: Props) {
  const t = useTranslations("deploy");
  const [route, setRoute] = useState<Route>(null);

  // ── CMS placeholder flow (unchanged mock — scope for later phase) ──
  const [cms, setCms] = useState<CMS | null>(null);
  const [cmsDeploying, setCmsDeploying] = useState(false);
  const [cmsSuccess, setCmsSuccess] = useState(false);
  const [cmsProgress, setCmsProgress] = useState(0);

  const startCmsDeploy = () => {
    setCmsDeploying(true);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 10 + 4;
      if (p >= 100) { p = 100; clearInterval(iv); setTimeout(() => setCmsSuccess(true), 500); }
      setCmsProgress(Math.min(p, 100));
    }, 200);
  };

  if (cmsSuccess) {
    return (
      <CmsSuccessScreen onBack={() => {
        setCmsSuccess(false); setCmsDeploying(false); setRoute(null); setCms(null); setCmsProgress(0); setView("command");
      }} />
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        {route && (
          <button onClick={() => setRoute(null)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.05] bg-[#111114] hover:bg-white/[0.04] transition-colors">
            <ChevronLeft size={16} className="text-white/30" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">{t("title")}</h1>
          <p className="mt-0.5 text-[13px] text-white/30">
            {!route
              ? t("subtitleChooseRoute")
              : route === "cms"
              ? t("subtitlePickCms")
              : t("subtitleCustom")}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Route selector */}
        {!route && (
          <motion.div key="routes" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-2 gap-5 max-w-2xl">
              {[
                { id: "cms"    as Route, labelKey: "routeCmsLabel",    descKey: "routeCmsDesc",    icon: Globe,  accent: "#4353FF", bg: "bg-blue-500/10" },
                { id: "custom" as Route, labelKey: "routeCustomLabel", descKey: "routeCustomDesc", icon: Server, accent: "#FF6B35", bg: "bg-[#FF6B35]/10" },
              ].map(({ id, labelKey, descKey, icon: Icon, accent, bg }) => (
                <button key={id!} onClick={() => setRoute(id)}
                  className="group rounded-2xl bg-[#111114] border border-white/[0.05] p-7 text-left hover:border-white/[0.08] hover:shadow-xl hover:shadow-black/20 transition-all">
                  <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${bg}`}>
                    <Icon size={24} style={{ color: accent }} />
                  </div>
                  <h3 className="text-[16px] font-bold text-white">{t(labelKey)}</h3>
                  <p className="mt-1.5 text-[13px] text-white/30">{t(descKey)}</p>
                  <div className="mt-5 flex items-center gap-1.5 text-[13px] font-bold" style={{ color: accent }}>
                    {t("routeSelect")} <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* CMS route — Shopify + WordPress are the real flows; others are still placeholders */}
        {route === "cms" && !cmsDeploying && cms !== "shopify" && cms !== "wordpress" && (
          <motion.div key="cms" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-xl">
            <div className="grid grid-cols-2 gap-3 mb-6">
              {CMS_OPTIONS.map((opt) => (
                <button key={opt.id} onClick={() => setCms(opt.id)}
                  className={[
                    "relative rounded-xl border p-5 text-left transition-all",
                    cms === opt.id ? "border-2 shadow-xl shadow-black/20" : "border-white/[0.05] bg-[#111114] hover:border-white/[0.08]",
                  ].join(" ")}
                  style={cms === opt.id ? { borderColor: opt.color, backgroundColor: `${opt.color}08` } : {}}
                >
                  <div className="mb-3 h-2 w-2 rounded-full" style={{ backgroundColor: opt.color }} />
                  <p className="text-[14px] font-bold" style={cms === opt.id ? { color: opt.color } : {}}>{opt.label}</p>
                  <p className="mt-1 text-[11px] text-white/20">{opt.desc}</p>
                  {cms === opt.id && (
                    <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: opt.color }}>
                      <Check size={11} strokeWidth={3} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            {cms && (
              <motion.button initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} onClick={startCmsDeploy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-[13px] font-bold text-[#0A0A0A] hover:opacity-80 transition-opacity shadow-xl shadow-black/20">
                <Sparkles size={15} />
                {t("cmsDeployCta", { cms: CMS_OPTIONS.find((c) => c.id === cms)?.label ?? "" })}
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Shopify — real wizard */}
        {route === "cms" && cms === "shopify" && !cmsDeploying && (
          <motion.div key="shopify" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ShopifyWizard onExitToDashboard={() => { setRoute(null); setCms(null); setView("command"); }} />
          </motion.div>
        )}

        {/* WordPress — real wizard */}
        {route === "cms" && cms === "wordpress" && !cmsDeploying && (
          <motion.div key="wordpress" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <WordPressWizard onExitToDashboard={() => { setRoute(null); setCms(null); setView("command"); }} />
          </motion.div>
        )}

        {/* Custom route — real wizard */}
        {route === "custom" && (
          <motion.div key="custom" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <CustomWizard onExitToDashboard={() => { setRoute(null); setView("command"); }} />
          </motion.div>
        )}

        {/* CMS deploying — placeholder progress bar */}
        {cmsDeploying && !cmsSuccess && (
          <motion.div key="deploying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-sm mx-auto mt-10 text-center">
            <p className="text-[18px] font-black mb-1 text-white">{t("cmsDeployingTitle")}</p>
            <p className="text-[13px] text-white/30 mb-8">{t("cmsDeployingSubtitle")}</p>
            <div className="h-1.5 w-full rounded-full bg-white/[0.06] mb-6 overflow-hidden">
              <motion.div className="h-1.5 rounded-full bg-[#FF6B35]" style={{ width: `${cmsProgress}%` }} />
            </div>
            <div className="space-y-3 text-left">
              {(["cmsStepBuilding", "cmsStepDns", "cmsStepSsl", "cmsStepLive"] as const).map((key, i) => {
                const done = cmsProgress > (i + 1) * 25;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-all ${done ? "bg-green-500" : "bg-white/[0.06]"}`}>
                      {done && <Check size={11} strokeWidth={3} className="text-white" />}
                    </div>
                    <span className={`text-[13px] transition-colors ${done ? "text-white font-medium" : "text-white/20"}`}>{t(key)}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

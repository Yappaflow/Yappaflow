"use client";

/**
 * BuildProgress — the widget the user watches during the long
 * static-site / theme generation.
 *
 * Before this existed, the UI showed "0/18 files" and then jumped to the
 * download screen, with no signal for the 60-120 seconds in between. That's
 * the interval where the backend is mid-AI-call, `buildFilesDone` hasn't
 * moved yet because nothing persists until validation passes, and the user
 * thinks we've frozen.
 *
 * The fix has two halves:
 *   1. Backend emits `buildPhase` transitions: generating → validating →
 *      packaging → done, plus `buildStartedAt` so we have a real clock.
 *   2. This component uses those to compute a REALISTIC percentage that
 *      moves smoothly every frame, even when no count has changed on the
 *      backend yet. The curve is asymptotic — it speeds through the first
 *      30% of the generating band quickly and slows as it approaches the
 *      top, so the bar always appears to be moving but never overshoots
 *      into the next phase.
 *
 * We intentionally don't try to be *accurate* — there's no way to know
 * exactly how far through a stochastic AI call you are. The goal is
 * honest feedback: the bar reflects real phase transitions from the
 * server, and in between it animates based on elapsed time so the user
 * sees life.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import type { BuildJobStatus, BuildPhase } from "../../lib/deploy-api";

export interface BuildProgressProps {
  status:         BuildJobStatus | null;
  phase:          BuildPhase | null;
  filesDone:      number;
  filesTotal:     number;
  startedAt:      string | null;
  attempt:        number | null;
  attemptMax:     number | null;
  error:          string | null;
  /** Accent color for the bar (different brand colors per flow). */
  accent?:        string;
  /** "Generating your Shopify theme…" style sub-label. */
  subtitle?:      string;
}

// ── Phase bands (percentages) ─────────────────────────────────────────
// Each phase owns a range of the bar. Intra-band motion is time-based for
// `generating` (the long phase) and files-based for `packaging`; others
// snap to the band's midpoint.
const BAND: Record<Exclude<BuildPhase, "done" | "failed">, [number, number]> = {
  queued:     [0,  5],
  analyzing:  [5,  12],
  generating: [12, 78],
  // Patching reuses the generating band so the bar stays put during a
  // retry — by the time we're patching the user has already seen the bar
  // climb to ~78% once, and resetting it would feel like regression.
  patching:   [12, 78],
  validating: [78, 85],
  packaging:  [85, 99],
};

// How long we expect `generating` to take, in seconds. The asymptotic
// curve approaches the top of the band but never quite reaches it — we
// want the bar to still feel alive at the 60-second mark while leaving
// the last stretch for when the backend actually transitions phase.
// 75 s is the p50 for a 17-file Shopify theme on DeepSeek V3.2 as of
// 2026-04-21. Under-estimating is fine (curve just plateaus).
const EXPECTED_GENERATING_SECONDS = 75;

function phaseLabel(phase: BuildPhase | null, status: BuildJobStatus | null): string {
  if (status === "failed")         return "Build failed";
  if (phase === "done")            return "Ready to download";
  if (phase === "packaging")       return "Packaging bundle";
  if (phase === "validating")      return "Validating output";
  if (phase === "patching")        return "Patching flagged files";
  if (phase === "generating")      return "Generating theme";
  if (phase === "analyzing")       return "Analyzing identity";
  if (phase === "queued")          return "Queued";
  if (status === "pending")        return "Queued";
  if (status === "running")        return "Working";
  return "Waiting";
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

/**
 * Compute the display percentage from phase + time elapsed + file counts.
 * This is a pure function so the render loop can call it cheaply every
 * frame without side effects.
 */
function computePercent(
  status:    BuildJobStatus | null,
  phase:     BuildPhase | null,
  elapsed:   number,  // seconds
  filesDone: number,
  filesTotal: number
): number {
  if (status === "done" || phase === "done")   return 100;
  if (status === "failed" || phase === "failed") return 100;
  if (!phase) return status === "running" ? 4 : 0;

  const band = BAND[phase];
  if (!band) return 0;
  const [lo, hi] = band;
  const span = hi - lo;

  if (phase === "generating" || phase === "patching") {
    // Asymptotic: percent = lo + span * (1 - e^(-elapsed / T)).
    // At t=0 we're at `lo`, at t≈3T we're near `hi` but never cross it.
    // Patching shares the same curve — by the time we enter it, elapsed
    // is already large so the bar sits near the top of the band.
    const ratio = 1 - Math.exp(-elapsed / EXPECTED_GENERATING_SECONDS);
    return lo + span * ratio;
  }

  if (phase === "packaging") {
    // Files-based: move through the band proportionally with buildFilesDone.
    if (filesTotal <= 0) return (lo + hi) / 2;
    const ratio = Math.min(1, Math.max(0, filesDone / filesTotal));
    return lo + span * ratio;
  }

  // queued / analyzing / validating — snap to the middle of the band while
  // the backend is in that phase. These phases are short.
  return (lo + hi) / 2;
}

export function BuildProgress(props: BuildProgressProps) {
  const {
    status, phase, filesDone, filesTotal, startedAt,
    attempt, attemptMax, error,
    accent = "#FF6B35",
    subtitle,
  } = props;

  // Tick a client-side clock so the animated percent keeps moving between
  // the 2-second polls. 200 ms is plenty smooth for a progress bar and
  // avoids burning CPU on an idle tab.
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    if (status === "done" || status === "failed") return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [status]);

  const elapsedSec = startedAt
    ? Math.max(0, (now - new Date(startedAt).getTime()) / 1000)
    : 0;

  const percent = computePercent(status, phase, elapsedSec, filesDone, filesTotal);
  const isFailed = status === "failed" || phase === "failed";
  const isDone   = status === "done" || phase === "done";

  // Inline step indicator: visual breadcrumb of the phases so the user can
  // see what's done and what's pending. Hidden on failure (we show the
  // error prominently instead).
  const STEP_ORDER: BuildPhase[] = ["analyzing", "generating", "validating", "packaging", "done"];
  const STEP_LABEL: Record<BuildPhase, string> = {
    queued:     "Queued",
    analyzing:  "Analyze",
    generating: "Generate",
    // Patching isn't in STEP_ORDER — it's a transient sub-state of the
    // generate step. When we're patching, the step indicator still reads
    // "Generate" with the retry badge next to it.
    patching:   "Patch",
    validating: "Validate",
    packaging:  "Package",
    done:       "Done",
    failed:     "Failed",
  };
  // Map transient sub-phases back onto their visible step so the
  // breadcrumb doesn't blank out while we're patching.
  const visiblePhase: BuildPhase | null =
    phase === "patching" ? "generating" : phase;
  const currentIdx = visiblePhase ? STEP_ORDER.indexOf(visiblePhase) : -1;

  return (
    <div className="rounded-2xl border border-white/[0.05] bg-[#111114] p-6">
      {/* Header row: phase label + percent + elapsed */}
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          {isFailed ? (
            <AlertCircle size={16} className="text-red-400" />
          ) : isDone ? (
            <CheckCircle2 size={16} className="text-green-400" />
          ) : (
            <Loader2 size={16} className="animate-spin" style={{ color: accent }} />
          )}
          <h3 className="text-[15px] font-black text-white">
            {phaseLabel(phase, status)}
          </h3>
          {attempt != null && attemptMax != null && attempt > 1 && !isDone && !isFailed && (
            <span
              title="The validator rejected the last attempt and asked the model to try again with specific fixes."
              className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300"
            >
              <RotateCcw size={10} /> retry {attempt}/{attemptMax}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 tabular-nums text-[12px] text-white/40">
          {startedAt && !isDone && !isFailed && <span>{formatElapsed(elapsedSec)}</span>}
          <span className="font-bold text-white/70">{Math.round(percent)}%</span>
        </div>
      </div>

      {subtitle && (
        <p className="mb-3 text-[12px] text-white/40">{subtitle}</p>
      )}

      {/* The bar itself. We animate width with framer-motion so the 200ms
          tick interpolates visually smoothly rather than stepping. */}
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-1.5 rounded-full"
          style={{ background: isFailed ? "#ef4444" : accent }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Step indicator: 5 dots along the bottom so the user can see the
          whole pipeline and where we are inside it. */}
      {!isFailed && (
        <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
          {STEP_ORDER.map((s, i) => {
            const past    = s === "done" ? isDone : currentIdx > i;
            const current = currentIdx === i && !isDone;
            return (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: past || current
                      ? accent
                      : "rgba(255,255,255,0.15)",
                    opacity: current ? 1 : past ? 0.7 : 1,
                  }}
                />
                <span
                  className={[
                    "whitespace-nowrap",
                    current ? "text-white/80" : past ? "text-white/40" : "text-white/20",
                  ].join(" ")}
                >
                  {STEP_LABEL[s]}
                </span>
                {i < STEP_ORDER.length - 1 && (
                  <div className="h-px w-4 bg-white/[0.06]" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* File counter — only useful during packaging; shown as fine print
          so the user has a concrete "things are happening" signal. */}
      {!isFailed && !isDone && filesTotal > 0 && filesDone > 0 && (
        <p className="mt-3 text-[11px] text-white/30">
          {filesDone} / {filesTotal} files saved
        </p>
      )}

      {isFailed && (
        <div className="mt-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-[12px] text-red-300">
          {error ?? "Build failed — check the server logs."}
        </div>
      )}
    </div>
  );
}

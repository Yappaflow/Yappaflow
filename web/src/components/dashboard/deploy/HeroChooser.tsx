/**
 * Hero Chooser — pre-build step where the user picks a composition.
 *
 * Drops into any deploy wizard between the identity step and the build
 * step. The component is self-contained: it owns its API state, its
 * three iframes, and its refinement textbox. The wrapping wizard only
 * needs to:
 *   1.  Render <HeroChooser projectId={pid} onReady={…} />
 *   2.  Hand control back to itself via `onReady` once the user has
 *       locked (and optionally refined) a variant — that's the signal
 *       the full-site build can kick off with a locked hero.
 *
 * Flow inside the component:
 *
 *    ┌───────────────┐  Generate   ┌──────────────┐  Pick   ┌───────────┐
 *    │  intro pane   │ ──────────▶ │ 3 variant    │ ──────▶ │  picked   │
 *    │  "Generate"   │             │ iframes +    │         │  + refine │
 *    └───────────────┘             │ refine box   │         │  or build │
 *                                  └──────────────┘         └───────────┘
 *
 * The iframes use `srcdoc` so the HTML renders instantly without a server-
 * side browser — zero-cost previews, perfect fidelity to what the AI
 * emitted, and sandbox flags keep them isolated from the host app.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, RotateCw, ArrowRight, Sparkles } from "lucide-react";
import {
  getHeroChooserState,
  generateHeroVariants,
  pickHeroVariant,
  refineHeroVariant,
  type HeroVariant,
  type HeroChooserStatus,
} from "@/lib/deploy-api";

export interface HeroChooserProps {
  projectId: string;
  /** Fired when the user has locked a variant and is ready for the full build. */
  onReady:   () => void;
  /**
   * Optional: let the user skip the chooser entirely and go straight to
   * a one-shot build. The wizard can pass a handler here for users who
   * don't want the extra step.
   */
  onSkip?:   () => void;
}

const INTRO_COPY = {
  title:       "Pick a hero",
  subtitle:
    "Before we build the whole site, choose one of three hero compositions. " +
    "Same brand, same palette, same words — just different lanes. You can " +
    "tweak the chosen one with a note before we kick off the full build.",
  generateBtn: "Generate three options",
  skipBtn:     "Skip — build now",
};

export function HeroChooser({ projectId, onReady, onSkip }: HeroChooserProps) {
  const [status, setStatus] = useState<HeroChooserStatus>("none");
  const [variants, setVariants] = useState<HeroVariant[]>([]);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [refinementText, setRefinementText] = useState("");
  const [busy, setBusy] = useState<"generate" | "pick" | "refine" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Hydrate existing chooser state on mount ────────────────────────
  // Handles page reloads mid-flow: if the user generated 3 variants,
  // picked one, then refreshed, we put them back where they were.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getHeroChooserState(projectId);
        if (cancelled) return;
        setStatus(s.status);
        setVariants(s.variants);
        setPickedId(s.pickedVariantId ?? null);
        setRefinementText(s.refinementText ?? "");
      } catch (err) {
        // A fresh project returns status:"none" not a 404; any error
        // here is a real transport failure.
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load chooser state");
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  // ── Generate 3 variants ────────────────────────────────────────────
  const handleGenerate = async () => {
    setBusy("generate");
    setError(null);
    setStatus("generating");
    try {
      const { variants } = await generateHeroVariants(projectId);
      setVariants(variants);
      setStatus("ready");
      setPickedId(null);
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Variant generation failed");
    } finally {
      setBusy(null);
    }
  };

  // ── Pick one variant ──────────────────────────────────────────────
  const handlePick = async (variantId: string) => {
    setBusy("pick");
    setError(null);
    try {
      await pickHeroVariant(projectId, variantId);
      setPickedId(variantId);
      setStatus("picked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't pick variant");
    } finally {
      setBusy(null);
    }
  };

  // ── Refine the picked variant ─────────────────────────────────────
  const handleRefine = async () => {
    if (!refinementText.trim()) return;
    setBusy("refine");
    setError(null);
    setStatus("refining");
    try {
      const { variant } = await refineHeroVariant(projectId, refinementText.trim());
      // Replace the refined variant in place so the user sees the new HTML.
      setVariants((prev) =>
        prev.map((v) => (v.id === variant.id ? variant : v))
      );
      setStatus("refined");
    } catch (err) {
      setStatus("picked");  // roll back so the UI shows the previous variant
      setError(err instanceof Error ? err.message : "Refinement failed");
    } finally {
      setBusy(null);
    }
  };

  const pickedVariant = useMemo(
    () => variants.find((v) => v.id === pickedId) ?? null,
    [variants, pickedId]
  );

  // ── Stage: nothing generated yet ────────────────────────────────────
  if (status === "none" && variants.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-6 rounded-2xl border border-white/10 bg-white/[0.02] px-8 py-12 text-center"
      >
        <div className="flex flex-col items-center gap-2">
          <Sparkles className="h-7 w-7 text-amber-300" />
          <h2 className="text-2xl font-semibold">{INTRO_COPY.title}</h2>
          <p className="max-w-md text-sm text-white/60">{INTRO_COPY.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            disabled={busy === "generate"}
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-5 py-2.5 text-sm font-medium text-black transition hover:bg-amber-200 disabled:opacity-50"
          >
            {busy === "generate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {INTRO_COPY.generateBtn}
          </button>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              {INTRO_COPY.skipBtn}
            </button>
          )}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </motion.div>
    );
  }

  // ── Stage: generating (spinner + three skeleton slots) ─────────────
  if (status === "generating") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating three variants — about 30 seconds…
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="aspect-[1280/2000] animate-pulse rounded-xl border border-white/10 bg-white/[0.03]"
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Stage: failed (offer retry) ────────────────────────────────────
  if (status === "failed") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-400/20 bg-red-500/5 px-8 py-10 text-center">
        <p className="text-red-300">
          {error ?? "Variant generation failed."}
        </p>
        <button
          type="button"
          disabled={busy === "generate"}
          onClick={handleGenerate}
          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm transition hover:bg-white/15 disabled:opacity-50"
        >
          {busy === "generate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
          Try again
        </button>
      </div>
    );
  }

  // ── Stage: ready / picked / refined / refining — three iframes + UI
  const refining = busy === "refine" || status === "refining";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">
          {pickedId ? "Your hero — add a tweak or continue" : "Pick one"}
        </h2>
        <p className="text-sm text-white/60">
          {pickedId
            ? "You can type a note to refine the copy, colors or layout, or continue straight to the full build."
            : "Same brand in three different compositions. Click the one that feels right."}
        </p>
      </div>

      {/*
        Grid layout: stacks vertically on narrow screens, side-by-side at lg.
        We intentionally do NOT use xl: here — the wizard wraps the whole step
        in a wider container (max-w-7xl) so lg (≥1024px) is the right knee.
      */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {variants.map((v) => {
          const isPicked = v.id === pickedId;
          // Dim non-picked variants after a pick, and disable clicks
          // during refine calls so the user can't accidentally pick a
          // different variant mid-refinement.
          const dim = pickedId !== null && !isPicked;
          return (
            <div
              key={v.id}
              className={[
                "group relative flex flex-col gap-3 rounded-xl border transition",
                isPicked
                  ? "border-amber-300/60 bg-amber-300/[0.06]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20",
                dim ? "opacity-60 hover:opacity-75" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between px-4 pt-3 text-xs uppercase tracking-wider text-white/50">
                <span>{v.flavor}</span>
                {isPicked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/20 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                    <Check className="h-3 w-3" />
                    Picked
                  </span>
                )}
              </div>

              {/*
                Desktop-scale full-page preview (Webflow-style):
                  - Outer `@container` establishes a Tailwind 4 container-query
                    context so we can use `cqw` units inside.
                  - `aspect-[1280/2000]` locks the card to a tall portrait
                    ratio so the user sees the ENTIRE generated page — hero,
                    first-fold composition, and the below-the-fold section —
                    not just the top 800px. The hero variant prompt requires
                    a below-fold section with ≥3 substantive elements, and we
                    want the chooser to surface that so the user is picking
                    on real content, not a cropped headline.
                  - The iframe is rendered at 1280×2000 (a "normal" desktop
                    viewport, tall enough to capture the full mockup) and
                    scaled down via CSS so the user sees the true desktop
                    rendering — typography proportions, spacing, hero
                    composition all behave the way they will on a real laptop.
                    This is the only honest way to show a full-page preview
                    at 3-up size; rendering the iframe at its column width
                    makes the AI's 72px headline look like 14px and misleads.
                  - scale factor = container-width / 1280, expressed via cqw.
              */}
              <div className="@container/preview w-full">
                <div className="relative aspect-[1280/2000] w-full overflow-hidden rounded-md border border-white/5 bg-white">
                  <iframe
                    title={`Hero variant ${v.flavor}`}
                    sandbox="allow-scripts"
                    srcDoc={v.html}
                    scrolling="no"
                    style={{
                      width:           "1280px",
                      height:          "2000px",
                      transform:       "scale(calc(100cqw / 1280))",
                      transformOrigin: "top left",
                    }}
                    className="absolute left-0 top-0 border-0 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between px-4 pb-3">
                <span className="text-xs text-white/40">
                  {v.direction}
                </span>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => handlePick(v.id)}
                  className={[
                    "rounded-full px-3 py-1.5 text-xs font-medium transition",
                    isPicked
                      ? "bg-amber-300 text-black hover:bg-amber-200"
                      : "bg-white/10 text-white/80 hover:bg-white/20",
                    "disabled:opacity-50",
                  ].join(" ")}
                >
                  {isPicked ? "Selected" : "Pick this one"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Refinement textbox — only after a pick. */}
      <AnimatePresence>
        {pickedVariant && (
          <motion.div
            initial={{ opacity: 0, y: 12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 12, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <label className="text-sm font-medium text-white/80" htmlFor="hero-refine">
                Want to tweak something? (optional)
              </label>
              <textarea
                id="hero-refine"
                value={refinementText}
                onChange={(e) => setRefinementText(e.target.value)}
                rows={3}
                placeholder="e.g. Make the headline warmer, use navy instead of amber, swap the CTA to “Book a fitting”"
                className="resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none ring-0 transition focus:border-amber-300/60"
                maxLength={2000}
                disabled={refining}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-white/40">
                  {refinementText.length}/2000
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={refining || !refinementText.trim()}
                    onClick={handleRefine}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm transition hover:bg-white/15 disabled:opacity-50"
                  >
                    {refining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Apply tweak
                  </button>
                  <button
                    type="button"
                    onClick={onReady}
                    disabled={refining}
                    className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-200 disabled:opacity-50"
                  >
                    Build with this hero
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secondary action: regenerate all three. Shown only when we have
          variants but the user hasn't picked one yet — offers an escape
          hatch when all three options feel wrong. */}
      {!pickedId && (
        <div className="flex items-center justify-center">
          <button
            type="button"
            disabled={busy !== null}
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-white/60 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            {busy === "generate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
            Regenerate all three
          </button>
        </div>
      )}
    </motion.div>
  );
}

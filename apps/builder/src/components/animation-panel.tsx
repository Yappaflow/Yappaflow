"use client";

import { useCallback, useEffect } from "react";
import { motion, useAnimation, type TargetAndTransition } from "framer-motion";
import { type AnimationPreset } from "@yappaflow/types";
import { useProjectStore } from "@/lib/store";

// ─── Preset metadata ──────────────────────────────────────────────────────────

type PresetMeta = {
  label: string;
  description: string;
  scrollOnly?: boolean;
};

const PRESET_META: Record<AnimationPreset, PresetMeta> = {
  none: { label: "None", description: "No animation" },
  "fade-in": { label: "Fade In", description: "Opacity 0 → 1" },
  "slide-up": { label: "Slide Up", description: "Rise from below" },
  "slide-left": { label: "Slide Left", description: "Enter from left" },
  "slide-right": { label: "Slide Right", description: "Enter from right" },
  "scale-in": { label: "Scale In", description: "Grow from center" },
  "reveal-mask": { label: "Reveal Mask", description: "Clip-path wipe" },
  "stagger-children": { label: "Stagger", description: "Children cascade in" },
  "parallax-y": { label: "Parallax Y", description: "Scroll depth effect", scrollOnly: true },
  "marquee": { label: "Marquee", description: "Horizontal ticker", scrollOnly: true },
  "cursor-follow": { label: "Cursor Follow", description: "Tracks pointer", scrollOnly: true },
  "scroll-pin": { label: "Scroll Pin", description: "Sticky scroll", scrollOnly: true },
  "scroll-scrub": { label: "Scroll Scrub", description: "Scrub on scroll", scrollOnly: true },
};

const ENTRANCE_PRESETS: AnimationPreset[] = [
  "fade-in",
  "slide-up",
  "slide-left",
  "slide-right",
  "scale-in",
  "reveal-mask",
  "stagger-children",
];

const SCROLL_PRESETS: AnimationPreset[] = [
  "parallax-y",
  "scroll-pin",
  "scroll-scrub",
];

const CONTINUOUS_PRESETS: AnimationPreset[] = [
  "marquee",
  "cursor-follow",
];

// ─── Preview variants ─────────────────────────────────────────────────────────

type VariantDef = {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
};

const EASE = [0.16, 1, 0.3, 1] as const;

const PREVIEW_VARIANTS: Partial<Record<AnimationPreset, VariantDef>> = {
  "fade-in": {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.55, ease: EASE } },
  },
  "slide-up": {
    initial: { y: 14, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { duration: 0.55, ease: EASE } },
  },
  "slide-left": {
    initial: { x: -14, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { duration: 0.55, ease: EASE } },
  },
  "slide-right": {
    initial: { x: 14, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { duration: 0.55, ease: EASE } },
  },
  "scale-in": {
    initial: { scale: 0.78, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { duration: 0.55, ease: EASE } },
  },
  "reveal-mask": {
    initial: { clipPath: "inset(100% 0% 0% 0%)" },
    animate: { clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 0.65, ease: EASE } },
  },
};

// ─── AnimPreview ──────────────────────────────────────────────────────────────

function StaggerPreview() {
  const controls = useAnimation();

  const replay = useCallback(async () => {
    controls.set({ y: 8, opacity: 0 });
    await controls.start((i: number) => ({
      y: 0,
      opacity: 1,
      transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" },
    }));
  }, [controls]);

  useEffect(() => { void replay(); }, [replay]);

  return (
    <div
      className="flex flex-col gap-1.5 w-full"
      onMouseEnter={() => void replay()}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          custom={i}
          animate={controls}
          className="h-1.5 rounded-full bg-current opacity-70"
          style={{ width: `${80 - i * 18}%` }}
        />
      ))}
    </div>
  );
}

function StandardPreview({ preset }: { preset: AnimationPreset }) {
  const controls = useAnimation();
  const variant = PREVIEW_VARIANTS[preset];

  const replay = useCallback(async () => {
    if (!variant) return;
    controls.set(variant.initial);
    await controls.start(variant.animate);
  }, [controls, variant]);

  useEffect(() => { void replay(); }, [replay]);

  return (
    <div
      className="flex items-center justify-center w-full h-full overflow-hidden"
      onMouseEnter={() => void replay()}
    >
      <motion.div
        animate={controls}
        className="w-7 h-7 rounded-md bg-current opacity-70"
      />
    </div>
  );
}

function ScrollOnlyPreview({ icon }: { icon: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 h-full opacity-40">
      <span className="text-base leading-none">{icon}</span>
      <span className="text-[9px] uppercase tracking-widest">scroll</span>
    </div>
  );
}

function NonePreview() {
  return (
    <div className="flex items-center justify-center h-full opacity-30">
      <div className="w-7 h-7 rounded-md border-2 border-dashed border-current" />
    </div>
  );
}

function AnimPreview({ preset }: { preset: AnimationPreset }) {
  if (preset === "none") return <NonePreview />;
  if (preset === "stagger-children") return <StaggerPreview />;
  if (PRESET_META[preset]?.scrollOnly) {
    const icons: Record<string, string> = {
      "parallax-y": "↕",
      "marquee": "↔",
      "cursor-follow": "⊕",
      "scroll-pin": "⊙",
      "scroll-scrub": "⏎",
    };
    return <ScrollOnlyPreview icon={icons[preset] ?? "⊡"} />;
  }
  return <StandardPreview preset={preset} />;
}

// ─── AnimCard ─────────────────────────────────────────────────────────────────

function AnimCard({
  preset,
  active,
  disabled,
  onClick,
}: {
  preset: AnimationPreset;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const meta = PRESET_META[preset];

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? {} : { scale: 0.96 }}
      title={meta.description}
      className={[
        "group relative flex flex-col items-center rounded-lg border p-0 overflow-hidden text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        active
          ? "border-blue-500 bg-blue-500/10 shadow-[0_0_0_1px_theme(colors.blue.500)]"
          : "border-current/10 hover:border-current/30 hover:bg-current/5",
        disabled ? "cursor-default" : "cursor-pointer",
      ].join(" ")}
    >
      {/* Preview stage */}
      <div className="w-full h-14 flex items-center justify-center px-2 py-2">
        <AnimPreview preset={preset} />
      </div>

      {/* Label */}
      <div
        className={[
          "w-full border-t border-current/10 px-2 py-1.5 text-center",
          active ? "bg-blue-500/10" : "bg-current/5",
        ].join(" ")}
      >
        <span className="block text-[10px] font-medium leading-tight truncate">
          {meta.label}
        </span>
        {meta.scrollOnly ? (
          <span className="block text-[8.5px] uppercase tracking-wider opacity-40 mt-0.5">
            export only
          </span>
        ) : null}
      </div>

      {active ? (
        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
      ) : null}
    </motion.button>
  );
}

// ─── AnimationPanel ───────────────────────────────────────────────────────────

function SectionGroup({
  title,
  presets,
  activePreset,
  onApply,
}: {
  title: string;
  presets: AnimationPreset[];
  activePreset: AnimationPreset | null;
  onApply: (p: AnimationPreset) => void;
}) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-50">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-1.5">
        {presets.map((preset) => (
          <AnimCard
            key={preset}
            preset={preset}
            active={activePreset === preset}
            onClick={() => onApply(preset)}
          />
        ))}
      </div>
    </div>
  );
}

export function AnimationPanel() {
  const selection = useProjectStore((s) => s.selection);
  const project = useProjectStore((s) => s.project);
  const updateSectionAnimation = useProjectStore((s) => s.updateSectionAnimation);
  const replayAnimations = useProjectStore((s) => s.replayAnimations);

  // Resolve the selected section's current animation preset
  let activePreset: AnimationPreset | null = null;
  if (selection && project) {
    const page = project.pages.find((p) => p.id === selection.pageId);
    const section = page?.sections.find((s) => s.id === selection.sectionId);
    activePreset = (section?.animation as AnimationPreset) ?? "none";
  }

  const apply = useCallback(
    (preset: AnimationPreset) => {
      if (!selection) return;
      updateSectionAnimation(selection.pageId, selection.sectionId, preset === "none" ? null : preset);
      // Give the store a tick to commit, then replay
      setTimeout(() => replayAnimations(), 50);
    },
    [selection, updateSectionAnimation, replayAnimations],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-current/10 px-4 py-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-60">
          Animation Library
        </h2>
        <p className="mt-1 text-[11px] opacity-40 leading-snug">
          Pick a motion preset for the selected section.
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!selection ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center opacity-40">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="4" y="8" width="24" height="16" rx="3" />
              <line x1="4" y1="14" x2="28" y2="14" />
              <circle cx="16" cy="21" r="1.5" fill="currentColor" stroke="none" />
            </svg>
            <p className="text-xs max-w-[140px] leading-snug">
              Click a section on the canvas to select it
            </p>
          </div>
        ) : (
          <>
            {/* Current status */}
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-current/5 px-3 py-2">
              <span className="text-[10px] uppercase tracking-wider opacity-40">Active</span>
              <span className="ml-auto rounded-md bg-current/10 px-2 py-0.5 text-[10px] font-mono">
                {activePreset ?? "none"}
              </span>
            </div>

            {/* None */}
            <div className="mb-5">
              <AnimCard
                preset="none"
                active={!activePreset || activePreset === "none"}
                onClick={() => apply("none")}
              />
            </div>

            <SectionGroup
              title="Entrance"
              presets={ENTRANCE_PRESETS}
              activePreset={activePreset}
              onApply={apply}
            />

            <SectionGroup
              title="Scroll"
              presets={SCROLL_PRESETS}
              activePreset={activePreset}
              onApply={apply}
            />

            <SectionGroup
              title="Continuous"
              presets={CONTINUOUS_PRESETS}
              activePreset={activePreset}
              onApply={apply}
            />
          </>
        )}
      </div>
    </div>
  );
}

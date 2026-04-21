"use client";

import { useRef, type CSSProperties } from "react";
import { useAmbient, type AmbientPattern } from "../hooks/use-ambient.js";
import { cn } from "../../utils/cn.js";

export interface AmbientLayerProps {
  pattern?: AmbientPattern | "noise";
  intensity?: "low" | "medium" | "high";
  className?: string;
  style?: CSSProperties;
}

/**
 * <AmbientLayer> — the background atmosphere.
 *
 * Positioned absolutely inside a relative parent. GPU-only animations.
 * "noise" is a static SVG grain shipped inline — it doesn't animate but
 * provides film-grain texture that keeps the composition from feeling
 * digitally sterile.
 */
export function AmbientLayer({
  pattern = "breathe",
  intensity = "low",
  className,
  style,
}: AmbientLayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const motionPattern = pattern === "noise" ? "grain" : pattern;
  useAmbient(ref, { pattern: motionPattern, intensity });

  const baseStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: "var(--ff-z-ambient, 5)" as unknown as number,
    willChange: "transform, opacity",
    ...(pattern === "noise" ? { backgroundImage: NOISE_DATA_URL, mixBlendMode: "overlay", opacity: 0.4 } : null),
    ...(pattern === "drift"
      ? {
          background:
            "radial-gradient(60% 50% at 30% 20%, var(--ff-accent) 0%, transparent 60%), radial-gradient(40% 40% at 80% 80%, var(--ff-text-tertiary) 0%, transparent 70%)",
          opacity: 0.14,
          backgroundSize: "180% 180%",
          filter: "blur(40px)",
        }
      : null),
    ...style,
  };

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn("ff-ambient", `ff-ambient--${pattern}`, className)}
      style={baseStyle}
      data-ambient-pattern={pattern}
      data-ambient-intensity={intensity}
    />
  );
}

/**
 * 80×80 SVG noise, base64-encoded. Cheap texture, no network round-trip.
 */
const NOISE_DATA_URL =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")";

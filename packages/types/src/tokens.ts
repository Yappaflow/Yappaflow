/**
 * Token references — the vocabulary SiteProject sections use to talk about
 * colors, spacing, radii, and animation.
 *
 * Sections don't bake raw CSS values. Instead they carry *references* that the
 * builder and the CMS adapters resolve against the merged DNA at render / export
 * time. A ColorToken like "accent" resolves to dna.colors.summary.accents[0];
 * a SpacingToken like "lg" resolves to a scale derived from dna.grid.rhythm.
 *
 * This indirection is what lets a single SiteProject render identically in
 * the builder preview, in a Shopify liquid theme, and in a Webflow export —
 * each target reads the DNA and plugs in its own resolved values.
 */

import { z } from "zod";

/** Named color slots. Adapters map these to DNA palette roles. */
export const COLOR_TOKENS = [
  "background",
  "foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "border",
  "surface",
  "surface-foreground",
] as const;
export type ColorTokenName = (typeof COLOR_TOKENS)[number];

/** A color value in a SiteProject: either a named token or a raw color string. */
export const ColorTokenSchema = z.union([
  z.enum(COLOR_TOKENS),
  z.string(), // raw #hex / rgb() / oklch() — an escape hatch for when the palette doesn't cover a slot
]);
export type ColorToken = z.infer<typeof ColorTokenSchema>;

/** Spacing scale. Adapters resolve these against the DNA rhythm. */
export const SPACING_TOKENS = ["none", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"] as const;
export type SpacingTokenName = (typeof SPACING_TOKENS)[number];
export const SpacingTokenSchema = z.enum(SPACING_TOKENS);
export type SpacingToken = z.infer<typeof SpacingTokenSchema>;

/** Radius scale for cards, buttons, images. */
export const RADIUS_TOKENS = ["none", "sm", "md", "lg", "pill", "circle"] as const;
export type RadiusToken = (typeof RADIUS_TOKENS)[number];
export const RadiusTokenSchema = z.enum(RADIUS_TOKENS);

/**
 * Animation presets — the 12 motion names every CMS target supports via the
 * shared GSAP runtime (Phase 11). Sections bind one preset via `animation`;
 * adapters serialize it as `data-yf-anim="<preset>"` on the section root.
 *
 * Keep this list in lockstep with `packages/animations/dist/runtime.js` when
 * that package lands. Adding a new preset means: (1) a new runtime handler,
 * (2) every adapter keeps shipping the attribute as-is, (3) this enum grows.
 */
export const ANIMATION_PRESETS = [
  "none",
  "fade-in",
  "slide-up",
  "slide-left",
  "slide-right",
  "scale-in",
  "parallax-y",
  "reveal-mask",
  "stagger-children",
  "marquee",
  "cursor-follow",
  "scroll-pin",
  "scroll-scrub",
] as const;
export type AnimationPreset = (typeof ANIMATION_PRESETS)[number];
export const AnimationPresetSchema = z.enum(ANIMATION_PRESETS);

/** An asset reference — image, video, or inline SVG. */
export const AssetRefSchema = z.object({
  kind: z.enum(["image", "video", "svg"]),
  /** URL (http/https, data:, or a /-relative path the adapter resolves). */
  url: z.string(),
  alt: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  /** Optional blurhash / LQIP for progressive load. */
  placeholder: z.string().optional(),
});
export type AssetRef = z.infer<typeof AssetRefSchema>;

/**
 * Per-section style deltas from the DNA baseline. All fields optional — an
 * empty StyleDelta means "use the DNA defaults exactly." The builder exposes
 * these as the right-rail style controls.
 */
export const StyleDeltaSchema = z
  .object({
    background: ColorTokenSchema.optional(),
    foreground: ColorTokenSchema.optional(),
    accent: ColorTokenSchema.optional(),
    paddingY: SpacingTokenSchema.optional(),
    paddingX: SpacingTokenSchema.optional(),
    gap: SpacingTokenSchema.optional(),
    radius: RadiusTokenSchema.optional(),
    /** Full-bleed vs. contained to the DNA max-width. */
    container: z.enum(["contained", "full-bleed"]).optional(),
  })
  .partial();
export type StyleDelta = z.infer<typeof StyleDeltaSchema>;

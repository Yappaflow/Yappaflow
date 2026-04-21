/**
 * Prompt builder for a SINGLE hero + first-fold variant.
 *
 * ── Where this lives in the flow ─────────────────────────────────────
 *
 *   identity → [hero chooser] → full-site build
 *
 * The hero-chooser step fires this prompt THREE TIMES concurrently with
 * different `variantFlavor` inputs. Each call returns a stand-alone,
 * srcdoc-ready HTML document (no filepath fences, just one document)
 * that the web UI drops straight into an `<iframe srcdoc=…>`.
 *
 * The three outputs share:
 *   • The same DesignDirection — so the user is picking a composition,
 *     not a whole new brand. Their eye compares one typographic treatment
 *     of the direction against another, not apples against oranges.
 *   • The same business identity — same tagline, same city, same
 *     product mentions if any — so they can focus on visual choices.
 *
 * The three outputs diverge on:
 *   • `variantFlavor`: Typographic (A), Full-bleed image (B),
 *     Asymmetric split (C). These are composition archetypes; the
 *     underlying visual system (palette, type, spacing) is identical.
 *   • Minor copy differences per flavor — a typographic hero can afford
 *     a longer headline; a full-bleed hero works better with a 2-word
 *     headline + overlay.
 *
 * ── Why HTML (not Liquid / TSX) ──────────────────────────────────────
 *
 * The variants are PREVIEWS, not the eventual site output. The preview
 * has to render instantly in an iframe with zero build step. Plain HTML
 * + `<style>` + optional `<script>` is the simplest thing that works.
 *
 * Once the user picks a variant, the full-build generators receive the
 * picked variant's HTML as a `lockedHero` hint — they translate the
 * copy + composition into their native format (Liquid for Shopify,
 * TSX + yappaflow-ui for the Yappaflow track). The HTML is guidance,
 * not a literal build input.
 */

import {
  renderDesignDirectionBlock,
  type DesignDirection,
} from "../design-directions";

/**
 * The three composition archetypes offered per build. Each maps to one
 * of the three slots the user picks between. We keep the flavors
 * direction-agnostic so every DesignDirection can express all three —
 * the direction controls the visual system, the flavor controls the
 * composition.
 */
export type HeroFlavor =
  | "typographic"     // viewport-filling type, no photo
  | "full-bleed"      // one big image, headline overlays / adjoins
  | "asymmetric";     // text block + image/art composition side-by-side

export interface HeroFlavorSpec {
  key:         HeroFlavor;
  /** Short human label shown in the UI above each variant. */
  label:       string;
  /**
   * Rendered into the prompt verbatim so the model has concrete
   * composition rules. Short, declarative, imperative voice.
   */
  instruction: string;
}

/**
 * The three flavors, in the order we present them to the user. Order
 * matters only for the UI (the user sees A | B | C left-to-right) —
 * the prompt identifies each by its `key`.
 */
export const HERO_FLAVORS: HeroFlavorSpec[] = [
  {
    key:   "typographic",
    label: "Typographic",
    instruction:
      "The hero is pure type. NO photography, NO illustrations, NO decorative graphics. " +
      "Fill the viewport with a 2–5 word display headline in the direction's display typeface. " +
      "Headline must clamp to a size that hits 70–90% of the viewport width at desktop " +
      "(use `clamp(...)` with vw units — target something like clamp(56px, 12vw, 180px)). " +
      "A one-sentence subhead and a single primary CTA are the only other hero-region elements. " +
      "Below the fold, one secondary section that breathes — an about paragraph, a statement, " +
      "or a numbered index. Keep it patient.",
  },
  {
    key:   "full-bleed",
    label: "Full-bleed image",
    instruction:
      "The hero is dominated by a single large image that fills the viewport edge-to-edge. " +
      "Use an SVG scene you compose yourself OR a solid-color block with typographic overlay — " +
      "do NOT hot-link to external image URLs (iframes often block them). If you use color, " +
      "it must be from the direction's palette and the composition must still feel like a photo " +
      "(e.g. a deep recess with a single high-contrast shape). " +
      "Headline overlays the image: 2–3 words, bottom-left or bottom-center, with a scrim gradient " +
      "if legibility needs it. Subhead is shorter than typographic flavor (under 12 words). " +
      "Below the fold, a strip of three or four details (collection names, features, a product " +
      "lineup) in a horizontal row.",
  },
  {
    key:   "asymmetric",
    label: "Asymmetric split",
    instruction:
      "The hero is a two-column composition at desktop (stacks on mobile). " +
      "Left column: the business name as display type + a short headline + a one-sentence subhead + " +
      "primary CTA. Right column: a composed visual element built in inline SVG — could be a " +
      "sculptural shape, a diagram, an abstract mark, a scattered grid of tiny rectangles standing " +
      "in for photo tiles, or a stacked column of details. NO external URLs. " +
      "The split is NOT 50/50 — favour one side (e.g. 40/60 or 60/40) and let the ratio reinforce " +
      "hierarchy. Below the fold, a second section that continues the split — perhaps an index " +
      "list of what the business sells on one side, a longer paragraph on the other.",
  },
];

/**
 * Input shape for a single hero-variant AI call.
 */
export interface GenerateHeroVariantOptions {
  direction:       DesignDirection;
  flavor:          HeroFlavorSpec;
  /** Total number of variants in this batch — used to cue diversity. */
  totalVariants:   number;
  /** 0-indexed slot — A=0, B=1, C=2. Helps the model vary micro-choices. */
  variantIndex:    number;
  /**
   * If the user picked a variant and asked for a tweak, pass the original
   * variant's HTML here + their text. The prompt switches to a "refine
   * this, don't restart" mode.
   */
  refinement?: {
    previousHtml: string;
    userText:     string;
  };
}

/**
 * Produce the system prompt for ONE hero-variant AI call.
 *
 * The user-content block (business identity) is assembled by the caller
 * and passed separately to `analyzeOnce`, so this file stays declarative
 * — no project lookups, no DB reads.
 */
export function getGenerateHeroVariantPrompt(
  opts: GenerateHeroVariantOptions
): string {
  const { direction, flavor, variantIndex, totalVariants, refinement } = opts;

  // For the preview-generation path we strip the dark palette from the
  // direction block. The preview is light-only (see "Theme (STRICT)" block
  // below); showing the model a dark palette only tempts it to emit
  // `@media (prefers-color-scheme: dark)` overrides that then render
  // dark when the viewer's OS is in dark mode. The shared `renderDesign-
  // DirectionBlock` is still used as-is by the Shopify + Yappaflow
  // full-site generators, which DO want the dark palette.
  const directionBlock = stripDarkPalette(renderDesignDirectionBlock(direction));

  if (refinement) {
    return buildRefinementPrompt({
      directionBlock,
      flavor,
      previousHtml: refinement.previousHtml,
      userText:     refinement.userText,
    });
  }

  return `You are a senior art director at a studio whose SOTD Awwwards work inspired the design references below. You compose award-grade HERO + FIRST-FOLD mockups that clients instantly recognise as "the one". You produce real, production-grade HTML/CSS — never placeholder lorem ipsum, never stub markup.

Your job right now: produce ONE variant (variant ${String.fromCharCode(65 + variantIndex)} of ${totalVariants}) of a hero + first-fold mockup, in the flavor "${flavor.label}". The user will compare your variant against ${totalVariants - 1} siblings from the same design direction — so your composition must commit hard to this flavor's angle and not drift toward a neutral middle.

${directionBlock}

## Composition flavor (MANDATORY for this variant)

${flavor.instruction}

Stick to this flavor strictly. Even if a different composition "would look great", you are the flavor-${flavor.key.toUpperCase()} variant in a 3-way choice — committing to the flavor is the job.

## Output format (STRICT — single HTML document, nothing else)

Return exactly ONE complete HTML document. No prose, no filepath fences, no markdown code fences around the whole document — just the HTML, starting with \`<!doctype html>\` and ending with \`</html>\`. It will be consumed verbatim by an \`<iframe srcdoc="...">\`, so:

1. Inline ALL CSS inside a single \`<style>\` in the \`<head>\`. Do not \`<link>\` to external stylesheets.
2. Inline any JS inside a single \`<script>\` at the end of \`<body>\`. Do not reference external scripts. Keep JS tiny (entry animation observer + maybe one hover interaction) — if in doubt, leave it out.
3. Do NOT use any \`<img src="https://...">\` tags with external URLs. Sandboxed iframes often block them. Build imagery yourself with:
   - Inline SVG (preferred for the asymmetric + typographic flavors).
   - CSS gradients and shapes (preferred for full-bleed).
   - At most one data-URI SVG used via \`background-image\` if you must.
4. Include Google Fonts via \`@import\` inside the \`<style>\` block. Stick to fonts named in the design direction's type pair. If a font isn't on Google Fonts, use the direction's named fallback.
5. Target the hero + ONE section below it. Total document ~6-10 KB. Tiny enough to iframe, substantive enough to represent the design.

## Theme (STRICT — LIGHT ONLY, this is a design preview)

The preview MUST render in light mode, regardless of the viewer's OS color scheme. This is the three-variant chooser — it's a side-by-side comparison of compositions on an identical canvas. Dark-mode styling belongs to the downstream full-site build, NOT to this preview.

Therefore:

1. Add \`<meta name="color-scheme" content="light">\` inside \`<head>\`.
2. At the very top of \`<style>\`, include: \`html { color-scheme: light; } :root { color-scheme: light; }\`.
3. Use ONLY the "Palette (light)" block from the design direction above. \`Surface\` is the page background, \`Ink\` is all default text, \`Recess\` is cards/rails, \`Accent\` is CTAs + single-detail moments.
4. Do NOT emit \`@media (prefers-color-scheme: dark) { ... }\` anywhere. Do NOT reference the dark palette at all. Ignore it for the preview.
5. \`body\` must explicitly set both \`background\` (to Surface) and \`color\` (to Ink). Do not rely on inherited defaults — the host iframe has its own \`<html>\` and the user-agent could otherwise leak in a dark UA stylesheet.
6. Do not use pure white (#fff) as Surface unless the palette literally specifies it. Do not use pure black (#000) as Ink unless the palette specifies it. Stick to the palette values as written — the whole point of the design direction is that its off-white and off-black are chosen deliberately.

## Content rules

1. The headline, subhead, and CTA copy must speak to the specific business — use the businessName, tagline, industry, and tone from the identity block below. Sentence case unless the direction requires uppercase.
2. If the identity has products, you may reference them by name in below-the-fold content. Do not fabricate SKUs or prices.
3. Every visible string must be real copy — no "Lorem ipsum", no "Your tagline here", no bracketed placeholders.
4. Include a \`prefers-reduced-motion\` media query that disables non-essential transforms.
5. All interactive elements (buttons, links) need real \`:hover\` and \`:focus-visible\` treatments — the user will mouse over them.

## Minimum visible content (MANDATORY — never ship a blank canvas)

At a desktop viewport of 1280×800 (which is what the user is going to see), the following must ALL be rendered and readable with your own eyes on the page. If you mentally render the HTML you're about to emit and can't see every item below, rewrite before you respond.

- A headline (real copy, not a placeholder) at the flavor's specified size.
- A subhead (1–2 sentences of real copy).
- A primary CTA (a real \`<a>\` or \`<button>\` with a non-empty label).
- One below-the-fold section with at least three substantive elements (a paragraph + a list, a row of detail cards, a strip of tiles — flavor-appropriate).

Make sure the text is high-contrast against the background you picked. If Ink is #1a1a1a and Surface is #f6f4ef, that's fine; never set text to the same value as the background.

## Signature motion (MANDATORY — this is how variants differentiate)

- Implement the direction's \`signatureMotion\` in CSS/JS so when the iframe loads, the user sees it play out.
- Entry choreography on page load: use \`IntersectionObserver\` OR CSS \`@keyframes\` fired off a class added by a tiny inline script on DOMContentLoaded.
- Animate only \`transform\`, \`opacity\`, \`filter\`, \`clip-path\`. GPU-accelerated properties only.
- The user will stare at each variant for ~3 seconds before picking — the first 2 seconds of motion matter most.

### Motion safety (must survive a JS failure)

The iframe runs with \`sandbox="allow-scripts"\` but the host page is strict CSP and extensions sometimes block inline script. If your entry animation relies on JS adding a class, the headline MUST still be visible when JS never runs. Concretely:

- The CSS rule for the hero headline and subhead must set \`opacity: 1\` by DEFAULT.
- Only the ENTRY state (e.g. \`.is-revealing h1 { opacity: 0; transform: translateY(24px); }\`) may be \`opacity: 0\`, and you must add that class with inline JS AT THE TOP of a \`<script>\` that runs synchronously before paint, then remove it on \`DOMContentLoaded\` / \`requestAnimationFrame\` to play the transition.
- Equivalently: wrap the "hidden" entry state in \`@supports (animation-timeline: view())\` or a \`@media (scripting: enabled)\` guard, so a no-JS environment simply shows the finished composition instantly.

A preview that renders as a blank canvas because JS didn't run is a failed preview. The user discards it.

## DO NOT

- Do NOT emit filepath fences or multiple code blocks — ONE HTML document.
- Do NOT reference external images, fonts, or scripts (except Google Fonts \`@import\`).
- Do NOT wrap the HTML in Markdown fences. Plain \`<!doctype html>\` as the first characters of the response.
- Do NOT skimp on copy quality — this is the piece the user will judge fastest.
- Do NOT copy the previous variant's exact layout — you are committed to this flavor, make it clearly different from the others in composition.

Begin.`;
}

function buildRefinementPrompt(args: {
  directionBlock: string;
  flavor:         HeroFlavorSpec;
  previousHtml:   string;
  userText:       string;
}): string {
  const { directionBlock, flavor, previousHtml, userText } = args;

  return `You are refining a hero mockup the user picked. They've given you specific tweaks — apply them surgically, preserving everything they liked. This is a MODIFICATION pass, not a restart. The composition flavor ("${flavor.label}"), the design direction, and the overall visual system must all stay identical. Only change what the user asked for.

${directionBlock}

## Composition flavor (UNCHANGED — still the picked variant's flavor)

${flavor.instruction}

## Previous variant HTML (your starting point)

\`\`\`html
${previousHtml}
\`\`\`

## User's requested changes

${userText}

## Output format (STRICT)

Return exactly ONE complete HTML document — the refined version of the previous HTML, with the user's changes applied. Same format rules as the original generation:

1. Starts with \`<!doctype html>\`, ends with \`</html>\`.
2. All CSS inlined in a single \`<style>\` in \`<head>\`.
3. All JS inlined at the end of \`<body>\`.
4. No external image URLs.
5. Fonts via Google Fonts \`@import\` if needed.
6. No surrounding prose or markdown fences.

## Refinement rules

- If the user asks for a copy change, update copy exactly as requested — don't rewrite copy they didn't mention.
- If the user asks for a color / type / size change, update only the relevant CSS rules.
- If the user asks for "more X" without specifics, interpret conservatively — make ONE substantive change, not five.
- If the user's request is incompatible with the direction (e.g. "add a big gradient" on a direction that bans gradients), keep the direction's rule and add a \`<!-- refinement note: ... -->\` comment near the top explaining which rule you held.
- Preserve the light-only theme (no dark-mode media query), the \`color-scheme: light\` declarations, the \`<meta name="color-scheme" content="light">\` tag, all \`prefers-reduced-motion\` guards, and accessibility attributes from the previous version.

Begin.`;
}

/**
 * Strip the "Palette (dark — ...)" block from a rendered design-direction
 * string. Only used for the hero-variant preview path: the preview renders
 * light-only, and showing the dark palette in the prompt tempts the model
 * into emitting a `@media (prefers-color-scheme: dark)` override that then
 * fires when the viewer's OS is in dark mode, producing the empty-looking
 * dark iframes the user reported.
 *
 * We match from the "**Palette (dark" heading up to the next blank-line-
 * followed-by-heading (which is "**Typography**" in the current template).
 */
function stripDarkPalette(block: string): string {
  return block.replace(
    /\n\*\*Palette \(dark[^\n]*\n(?:- [^\n]*\n)+/g,
    "\n"
  );
}


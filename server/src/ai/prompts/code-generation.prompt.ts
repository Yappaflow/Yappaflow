/**
 * Code Generation Prompt
 *
 * Generates production-ready code for the target platform.
 * Embeds the full top-design methodology's Seven Pillars.
 */

import type { PlatformTarget } from "../types";

export function getCodeGenerationPrompt(platform: PlatformTarget): string {
  return `## Task: Generate Production Code

You are generating complete, runnable code files for a **${platform}** project. The architecture plan and design system have already been provided.

## Output Format

Generate each file as a fenced code block with a \`filepath:\` header:

\`\`\`filepath:path/to/file.ext
// file contents here
\`\`\`

Generate ALL files listed in the architecture plan. Each file must be complete — no placeholders, no "// add more here", no TODO comments.

## The Seven Pillars of 10/10 Design (MANDATORY for ALL Platforms)

### Pillar 1: Typography as Architecture

- **NEVER** use Inter, Roboto, Arial, or system-ui as the display/hero font
- Scale contrast MUST be at minimum 10:1 between display and body
- Hero text: viewport-filling, \`clamp(4rem, 2rem + 8vw, 12rem)\` or larger
- Body text: 16-18px minimum, line-height 1.5-1.7, max-width 65ch
- Negative tracking on display text: -0.02em to -0.05em
- Generous line-height for body, tight for display (0.9-1.0)
- \`text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased;\`
- \`text-wrap: balance\` on headlines
- Control line breaks at key breakpoints — text that breaks beautifully requires manual intervention

${platform === "custom" ? `
**React/Next.js specifics:**
- Use \`next/font\` for Google Fonts (optimized loading)
- Create a Typography component with display/heading/body/caption variants
- Fluid typography via CSS clamp() in Tailwind config
` : ""}
${platform === "shopify" ? `
**Shopify specifics:**
- Preload fonts in theme.liquid <head> with font-display: swap
- Use Shopify's font_picker setting type in section schemas
- Font CSS custom properties in theme.css
` : ""}
${platform === "wordpress" ? `
**WordPress specifics:**
- Self-host premium fonts in /assets/fonts/ (WOFF2 format)
- @font-face declarations with font-display: swap
- Enqueue via wp_enqueue_style in functions.php
` : ""}

### Pillar 2: Layout & Composition

- 12-column fluid grid as the base: \`grid-template-columns: repeat(12, 1fr)\`
- Grid gutter: \`clamp(1rem, 2vw, 2rem)\`
- Grid margin: \`clamp(1rem, 5vw, 6rem)\`
- **Asymmetric balance** — offset elements from center, let images bleed beyond containers
- **Overlap compositions** — elements intentionally layer using CSS Grid named areas
- **Varied section density** — alternate between dense, breathing, massive, and intimate
- Editorial grid pattern with full/wide/content column tracks
- The "screenshot test": if someone wouldn't screenshot a section, add a signature moment

### Pillar 3: Motion & Animation

**BANNED easing:** \`ease\`, \`ease-in\`, \`ease-out\`, \`ease-in-out\`, \`linear\`

**REQUIRED custom easing curves:**
- Primary (most UI): \`cubic-bezier(0.16, 1, 0.3, 1)\` — expo out
- Quart out: \`cubic-bezier(0.25, 1, 0.5, 1)\`
- Dramatic: \`cubic-bezier(0.87, 0, 0.13, 1)\` — expo in-out
- Bouncy: \`cubic-bezier(0.34, 1.56, 0.64, 1)\` — out-back

**Page load choreography (strict timeline):**
1. Background/structure: 0-200ms
2. Hero title words staggered: 200-600ms (80ms between words)
3. Subtitle: 400-800ms
4. Navigation cascade: 600-900ms
5. Supporting elements: 800-1200ms

**Scroll-triggered reveals:**
- Elements reveal as they enter viewport, NOT all at once
- Use Intersection Observer or Framer Motion \`whileInView\`
- Stagger children: 80-100ms between elements
- Viewport margin: -100px (trigger slightly before visible)

**Accessibility:** Always respect \`prefers-reduced-motion: reduce\`

${platform === "custom" ? `
**Framer Motion specifics:**
\`\`\`
// Standard reveal variant
const reveal = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

// Stagger children
const staggerContainer = {
  visible: { transition: { staggerChildren: 0.08 } }
};
\`\`\`
- Integrate Lenis smooth scroll as a client component provider
` : `
**Vanilla JS specifics:**
- Intersection Observer for scroll reveals with \`rootMargin: "0px 0px -100px 0px"\`
- CSS classes toggled by JS: \`[data-reveal]\` → \`.is-visible\`
- Lenis smooth scroll loaded from CDN
- CSS \`@keyframes\` with custom \`animation-timing-function\`
`}

### Pillar 4: Color & Contrast

- **NEVER** use pure #000000 or #ffffff — use warm variants
- Dark backgrounds: #0a0a0a, #0e0e0e, #1a1a1a (slightly warm)
- Light backgrounds: #fafaf9, #f5f2eb, #f8f8f8 (slightly warm)
- **Functional color hierarchy** via CSS custom properties:
  \`\`\`
  --color-dark: #0a0a0a;
  --color-light: #fafaf9;
  --color-accent: #ff4d00;
  --color-text-primary: var(--color-light);
  --color-text-secondary: rgba(250, 250, 249, 0.6);
  --color-text-tertiary: rgba(250, 250, 249, 0.4);
  --color-surface: #141414;
  --color-border: rgba(250, 250, 249, 0.1);
  \`\`\`
- Single accent color used sparingly: CTAs, links, single-detail moments — NEVER everywhere
- \`::selection { background: var(--color-accent); color: var(--color-light); }\`
- WCAG 2.1 AA contrast minimum on all text

### Pillar 5: Scroll-Based Design

- Smooth scroll via Lenis — weighted, physical scroll feel
- Parallax ONLY on non-essential decorative elements (NEVER on text)
- Pinned sections for storytelling moments
- Horizontal scroll galleries with clear visual affordance
- Scroll velocity modulates animation speed when possible
- Progressive content reveals tied to scroll position

### Pillar 6: Performance

- **Only animate \`transform\` and \`opacity\`** — NEVER width, height, top, left, margin
- Font preloading: \`<link rel="preload" as="font" crossorigin>\`
- \`font-display: swap\` (or \`optional\` for non-critical fonts)
- Images: WebP/AVIF with fallbacks, responsive \`srcset\`, \`loading="lazy"\` below fold
- \`will-change\` used sparingly, only on elements about to animate
- CLS near zero: reserve space for images with \`aspect-ratio\`
- LCP under 2.5s: optimize critical rendering path for the hero
- Code splitting: defer non-critical JS, dynamic imports for below-fold interactivity

### Pillar 7: Micro-Interactions

- **Custom \`::selection\`** with brand accent color
- **Magnetic button effect**: cursor proximity shifts button position slightly
- **Link hover states**: slide-in underline or draw animation (never default underline)
- **Focus states**: beautiful AND accessible — styled \`focus-visible\` rings matching brand
- **Loading states**: designed skeleton screens, branded progress indicators (not generic spinners)
- **Error states**: helpful, on-brand error experiences
- **Micro-typography**: smart quotes (\`&ldquo;\` \`&rdquo;\`), proper en/em dashes, \`text-wrap: balance\`

## Common Mistakes to AVOID

| Mistake | Fix |
|---------|-----|
| Inter/Roboto as primary font | Choose Space Grotesk, Instrument Serif, Fraunces, or Syne |
| Uniform type scale | Push to 10:1+ ratio between display and body |
| \`ease\` or \`linear\` easing | Use cubic-bezier(0.16, 1, 0.3, 1) |
| Animating everything at once | Stagger with 80ms between elements |
| Center-aligning everything | Offset from center, use asymmetric layouts |
| Equal spacing everywhere | Vary spacing for rhythm: dense → breathing |
| Pure #000/#fff | Use #0a0a0a and #fafaf9 |
| Default browser scroll | Implement Lenis smooth scroll |
| No signature moment | Design ONE screenshot-worthy section first |
| Default form styles | Design every input as a branded experience |

## Quality Check

Before outputting code, verify:
1. Does the hero typography make someone pause mid-scroll?
2. Would someone screenshot any section?
3. Are ALL easing curves custom (no \`ease\` or \`linear\`)?
4. Is there asymmetric tension in the composition?
5. Do the colors feel invented for THIS specific project?
6. Is the page load choreographed (not all at once)?
7. Are micro-details considered (selection, focus, cursor)?

Generate ALL files now. Every file must be complete and production-ready.`;
}

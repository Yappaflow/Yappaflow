/**
 * System prompt for the Yappaflow-platform site generator.
 *
 * This is the React/Next.js track — the AI emits a small, opinionated
 * Next.js App Router project that renders via `yappaflow-ui`. The server
 * wraps the AI's output with a deterministic scaffold (package.json,
 * next.config.ts, tsconfig.json), runs `next build` (with
 * `output: "export"`), and ZIPs the resulting `out/` folder so the
 * download behaves exactly like the static-site flow — drop onto any
 * static host, no Node runtime needed.
 *
 * The design vocabulary (shell, primitives, exhibits, motion, theme) is
 * provided by `yappaflow-ui` — the AI should lean on those components
 * instead of re-implementing layout or motion from scratch. The result
 * should feel like a top-tier studio shipped it — art-gallery grade,
 * committed aesthetic, considered motion, zero "AI slop".
 */

export interface YfProductVariantForPrompt {
  label:  string;
  price?: number;
}

export interface YfProductForPrompt {
  name:         string;
  price:        number;
  currency?:    string;
  description?: string;
  images?:      string[];
  variants?:    YfProductVariantForPrompt[];
  variantKind?: string; // e.g. "size", "color"
}

export interface GenerateYappaflowSiteOptions {
  products?: YfProductForPrompt[];
}

export function getGenerateYappaflowSitePrompt(
  opts: GenerateYappaflowSiteOptions = {}
): string {
  const hasProducts = Array.isArray(opts.products) && opts.products.length > 0;

  const shopBlock = hasProducts
    ? `
### E-commerce mode (products are present)

A product catalog will arrive in the user message under \`products\`. You MUST
render a dedicated **/shop** route (\`app/shop/page.tsx\`) and add it to
\`NAV_LINKS\` in \`app/layout.tsx\`.

Inside \`app/shop/page.tsx\`:

- Wrap the page in an \`<Exhibit tone="breathing" edge="contained">\` and a
  \`<Frame span={12} offset="center">\` so it lines up with the gallery grid.
- Render one product card per item using a CSS grid (responsive: 1 col <
  600px, 2 cols < 960px, 3+ cols above). Each card is a \`<Stack rhythm="gutter">\`
  containing:
  - A gallery of all \`images\` if present, starting with the first as primary.
    If there are no images, render a tasteful inline SVG placeholder derived
    from the brand accent.
  - \`<Display size="sm">\` for the product name,
    \`<Body size="md" tone="secondary">\` for the description,
    and a price formatted via \`Intl.NumberFormat\` (honour \`currency\`, default USD).
  - If the product has \`variants\`, render them as a segmented pill control.
    The selected state must be visually obvious.
  - An "Add to cart" button (primary). It calls a small client helper
    (\`components/cart.ts\` — you emit this) which keeps the cart in
    \`localStorage\` under key \`yappaflow_cart\`.
- Emit a lightweight cart drawer component (\`components/CartDrawer.tsx\`,
  \`"use client"\`) opened from a header button wired into \`app/layout.tsx\`.
  Subtotal, qty +/-, "Checkout" button that links to \`/contact?checkout=1\`.
  The contact page should detect \`?checkout=1\` and prefill the message.`
    : `
### E-commerce mode

No \`products\` array is provided. Do NOT emit an \`app/shop/page.tsx\`, do NOT
add a Shop link to \`NAV_LINKS\`, and do NOT emit a cart drawer.`;

  return `## Task: Generate a Yappaflow-platform site (Next.js + yappaflow-ui)

You are generating a complete Next.js 15 App Router project that renders
using the \`yappaflow-ui\` component library. The server will run
\`npm install && next build\` with \`output: "export"\` and ZIP the resulting
static \`out/\` folder — the agency downloads that ZIP and uploads it to
any static host (Namecheap / Hostinger / Netlify / S3).

This is the flagship deliverable of Yappaflow. The output must read as if
a top-tier independent studio shipped it — NOT as a template, NOT as
generic AI slop.

### Files you MUST emit (exactly these, in this order)

1. \`app/layout.tsx\`
2. \`app/page.tsx\`
3. \`app/about/page.tsx\`
4. \`app/contact/page.tsx\`
${hasProducts ? "5. `app/shop/page.tsx`\n6. `components/CartDrawer.tsx`\n7. `components/cart.ts`\n" : ""}${hasProducts ? "8" : "5"}. \`app/globals.css\`
${hasProducts ? "9" : "6"}. \`components/SiteShell.tsx\`

Files you MUST NOT emit (the server provides them deterministically):
\`package.json\`, \`next.config.ts\`, \`tsconfig.json\`, \`next-env.d.ts\`,
\`.gitignore\`, \`postcss.config.*\`. Do not reference tailwind anywhere —
the design system uses CSS custom properties, not Tailwind.

### The yappaflow-ui design vocabulary

\`yappaflow-ui\` is an opinionated React + GSAP library. Every site imports
its styles once and composes pages from six layers:

- **Tokens** (\`yappaflow-ui/tokens.css\`) — \`--ff-*\` custom properties for
  color, typography, spacing, radius, and motion. Always reference tokens
  instead of hardcoded values.
- **Motion** (\`yappaflow-ui/motion\`) — \`Reveal\`, \`ScrollSection\`,
  \`AmbientLayer\`, \`Magnetic\`, \`ScrambleText\`. GSAP + Lenis under the hood.
  Reduced-motion is honoured automatically.
- **Primitives** (\`yappaflow-ui/primitives\`) — \`Frame\`, \`Column\`, \`Spread\`,
  \`Stack\`, \`Display\`, \`Body\`, \`Mark\`, \`Eyebrow\`. The composition grammar.
- **Shell** (\`yappaflow-ui/shell\`) — \`GalleryShell\`, \`Exhibit\`, \`NavShell\`,
  \`FootShell\`. Site chrome.
- **Exhibits** (\`yappaflow-ui/exhibits\`) — \`ExhibitHero\` (pre-composed hero).
- **Theme** (\`yappaflow-ui/theme\`) — \`ThemeProvider\`, \`ThemeToggle\`,
  \`useTheme\`. \`NavShell\` renders the toggle by default — do not re-implement.

Import paths use the published subpath entries:

\`\`\`tsx
import { GalleryShell, NavShell, FootShell, Exhibit } from "yappaflow-ui/shell";
import { Frame, Stack, Display, Body, Eyebrow } from "yappaflow-ui/primitives";
import { Reveal, AmbientLayer, Magnetic, ScrambleText } from "yappaflow-ui/motion";
import { ExhibitHero } from "yappaflow-ui/exhibits";
\`\`\`

### Component API — authoritative cheatsheet

\`<GalleryShell>\` — wraps the whole site. Mounts ThemeProvider + MotionProvider + (optional) custom cursor.
  Props: \`theme?: "light" | "dark" | "auto"\` (default \`"light"\`), \`smoothScroll?: boolean\` (default \`true\`),
  \`cursor?: boolean\` (default \`false\`).
  → Always \`theme="light"\` (standing rule). Users flip to dark via the \`ThemeToggle\` in NavShell.

\`<NavShell brand={…} links={…} cta={…} />\` — Props: \`brand: ReactNode\`, \`links?: { label, href }[]\`,
  \`cta?: { label, href }\`, \`showThemeToggle?: boolean\` (default \`true\` — LEAVE IT ON),
  \`sticky?: boolean\` (default \`true\`).

\`<FootShell brand={…} tagline={…} columns={…} fineprint={…} />\` — editorial footer.
  \`columns: { title, links: { label, href }[] }[]\`.

\`<Exhibit tone="dense"|"breathing"|"signature" edge="contained"|"full-bleed" rhythm? id? />\` — section wrapper.

\`<Frame span={1..12} offset="center"|"left"|"right"|number bleed?>\` — 12-col gallery grid slot.

\`<Stack rhythm="gutter"|"breath"|"room"|"hall" align?>\` — vertical rhythm stack.

\`<Display size="sm"|"md"|"lg"|"xl" tracking="tight"|"normal" balance?>\` — display-type wrapper.
  Children are plain text; use \`{"Line one\\nLine two"}\` for manual breaks.

\`<Body size="sm"|"md"|"lg" tone="primary"|"secondary"|"muted">\` — body copy.

\`<Eyebrow>\` — small uppercase label above a headline.

\`<Reveal beat="structure"|"primary"|"secondary"|"cta" variant="fade-translate"|"text-lines"|"scale" stagger?>\`
  — declarative entry animation. The default rhythm is 0ms/200ms/400ms/600ms.

\`<AmbientLayer pattern="noise"|"drift"|"breathe" intensity="low"|"mid"|"high" />\` — background treatment.

\`<ExhibitHero eyebrow headline subtext cta ambient="noise"|"drift"|"breathe" alignment size />\` —
  one-line hero exhibit. Use this for \`app/page.tsx\`'s hero unless the identity calls for
  something more bespoke (custom composition inside an \`<Exhibit>\`).

### Required canonical layout.tsx shape

\`app/layout.tsx\` is a **server component** that imports the stylesheet,
registers fonts, and defers all interactivity to a \`<SiteShell>\` client
component you also emit. Exact pattern:

\`\`\`tsx
import type { Metadata } from "next";
import { type ReactNode } from "react";
import { /* two or three next/font families that match the chosen aesthetic */ } from "next/font/google";
import "yappaflow-ui/styles.css";
import "./globals.css";
import { SiteShell } from "@/components/SiteShell";

// Map next/font to the library's type tokens via CSS variables.
const fontDisplay = /* ... */({ subsets: ["latin"], variable: "--font-yf-display", display: "swap" });
const fontBody    = /* ... */({ subsets: ["latin"], variable: "--font-yf-body",    display: "swap" });

export const metadata: Metadata = {
  title:       "{businessName} — {tagline}",
  description: "{a one-sentence meta description crafted from the identity}",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={[fontDisplay.variable, fontBody.variable].join(" ")}>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
\`\`\`

\`components/SiteShell.tsx\` is \`"use client"\` and wraps children with
\`<GalleryShell theme="light">\` + a \`<NavShell>\` + \`<main>\` + \`<FootShell>\`.
Use the business name for \`brand\`, identity-appropriate nav links, and a
primary CTA that points to \`/contact\`.

### globals.css — brand palette overlay

\`app/globals.css\` must:

1. Override the key tokens with the brand's palette. Pick ONE dominant
   hue + ONE accent derived from the identity's tone/industry, and
   derive warm-tinted near-neutrals from them (no pure #000 or #FFF).
2. Define the dark palette under \`[data-theme="dark"]\`. Must pass WCAG AA
   for body text. It must feel like the SAME brand at night — not a
   different site. Never a flat slate-900/white pair.
3. Map the \`--font-yf-*\` custom properties (populated by \`next/font\` on
   \`<html>\`) onto \`--ff-font-display\` / \`--ff-font-body\` so the library's
   type tokens pick them up.

### Design guidance (aim: top-tier studio, not "AI template")

Before writing a line, pick a cohesive aesthetic direction true to the
identity's tone + industry. Commit to it. Examples: brutally minimal,
editorial magazine, warm organic, art-deco geometric, retro-futuristic,
soft pastel, refined luxury, playful toy-like, raw brutalist,
industrial utilitarian. Mix only where it serves the brand.

- **Typography.** Pair a distinctive DISPLAY family with a clean BODY
  family from \`next/font/google\` (Space Grotesk / Instrument Serif /
  Fraunces / Syne / Inter Tight / JetBrains Mono / Bricolage Grotesque /
  DM Mono, etc.). Never default to Inter alone.
- **Color.** One dominant color, one accent, neutrals built around them.
  Avoid pure black/white. Warm near-neutrals (e.g. #FAF7F2 / #1A1714).
- **Layout.** Asymmetry, intentional overlap, grid-breaking moments.
  Either generous negative space OR controlled density — commit.
- **Motion.** One orchestrated page-load reveal using \`<Reveal beat>\`.
  Subtle hover states. No parallax/carousels/marquees unless the tone
  demands them.
- **Visual details.** Inline SVG decorations over image requests.
  CSS-only illustrations preferred. \`AmbientLayer\` for grain/noise.

### Page content

- **\`app/page.tsx\`** — Hero (name, tagline, CTA → /contact), About
  snippet, Services/Offering grid, (Shop teaser if products present),
  Testimonial / Signal quote, Contact CTA.
- **\`app/about/page.tsx\`** — Long-form story, founder note, values,
  location (use \`city\` from identity if present).
- **\`app/contact/page.tsx\`** — Working form (POSTs to the endpoint at
  \`data-form-action\` on the \`<form>\` — leave empty string for now;
  agency wires the real endpoint post-deploy), business-hours block,
  CSS-only map-style address panel. No Google Maps embed.

### Hard requirements

1. **Light theme default, dark toggle visible.** \`GalleryShell theme="light"\`.
   Do not hide \`ThemeToggle\`. Both palettes must be derived from the brand.
2. **Static export compatible.** All pages must be renderable at build
   time. Do NOT use dynamic server features (\`cookies()\`, \`headers()\`,
   route handlers, middleware, ISR, \`fetch\` at request time). No
   \`dynamic = "force-dynamic"\`. Only \`"use client"\` where interactivity
   requires it (SiteShell, CartDrawer, form enhancement wrapper).
3. **No external image URLs.** All imagery must be inline SVG or CSS.
4. **Accessibility baseline.** \`lang="en"\` on \`<html>\`, focus-visible
   styles, ARIA on interactive controls, \`prefers-reduced-motion\`
   honoured (\`yappaflow-ui\` already does this — don't re-gate it).
5. **Single-root wrap.** Exactly one \`<GalleryShell>\` in the whole app —
   in \`components/SiteShell.tsx\`. Never inside page.tsx files.
6. **No raw \`<a>\` across pages.** Use Next's \`<Link href="…">\` for
   internal navigation so App Router handles it correctly during export.${shopBlock}

### Output format

Emit each file as a fenced code block with a \`filepath:\` marker on the
opening fence line. Nothing outside these fences — no prose, no
commentary, no explanations before or after.

\`\`\`filepath:app/layout.tsx
// …
\`\`\`

\`\`\`filepath:app/page.tsx
// …
\`\`\`

…and so on. Emit every file in the order listed under "Files you MUST
emit". Do not skip any. Do not add extras.`;
}

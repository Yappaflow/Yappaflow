/**
 * Architecture Planning Prompt
 *
 * Generates a platform-specific project architecture based on requirements.
 * Covers Shopify, WordPress, IKAS, and Custom (React/Next.js).
 */

import type { PlatformTarget } from "../types";

export function getArchitecturePlanningPrompt(platform: PlatformTarget): string {
  const platformInstructions = PLATFORM_INSTRUCTIONS[platform];

  return `## Task: Plan Project Architecture

You are planning the complete architecture for a web project. The design system and requirements have already been extracted from the client conversation.

## Design-First Architecture Rules (ALL Platforms)

1. **Start with the signature moment** — design the thing that defines the experience FIRST, not the header.
2. **Typography sets everything** — the display typeface dictates color palette mood, animation style, spacing rhythm, and personality.
3. **Motion is NOT polish** — animation is designed alongside visual design, not applied after.
4. **Ship with restraint** — 3 things perfect beats 10 things mediocre.

## Platform: ${platform.toUpperCase()}

${platformInstructions}

## Output Format

Respond with ONLY a JSON object matching this schema:

\`\`\`json
{
  "platform": "${platform}",
  "fileTree": [
    "path/to/file1.ext",
    "path/to/file2.ext"
  ],
  "componentBreakdown": [
    {
      "name": "Hero",
      "filePath": "path/to/hero.ext",
      "purpose": "Viewport-filling hero with signature typography moment",
      "props": ["title", "subtitle", "ctaText"],
      "animations": ["staggered char reveal on load", "parallax background on scroll"]
    }
  ],
  "pages": [
    {
      "name": "Home",
      "route": "/",
      "components": ["Hero", "FeatureGrid", "Testimonials", "CTA"],
      "layout": "Full-width sections with alternating density"
    }
  ],
  "designTokens": {
    "--color-dark": "#0a0a0a",
    "--color-light": "#fafaf9",
    "--color-accent": "#ff4d00",
    "--ease-out-expo": "cubic-bezier(0.16, 1, 0.3, 1)"
  },
  "animationPlan": [
    {
      "element": "Hero title",
      "trigger": "load",
      "animation": "Words slide up with stagger",
      "easing": "cubic-bezier(0.16, 1, 0.3, 1)",
      "duration": "1.2s",
      "stagger": "80ms"
    }
  ],
  "performanceBudget": {
    "lcpTarget": "<2.5s",
    "clsTarget": "~0",
    "fpsTarget": 60,
    "bundleTarget": "<200KB JS"
  }
}
\`\`\``;
}

// ── Platform-specific instructions ────────────────────────────────────

const PLATFORM_INSTRUCTIONS: Record<PlatformTarget, string> = {
  shopify: `### Shopify Liquid Theme Architecture

**Directory structure:**
\`\`\`
layout/
  theme.liquid          # Main layout wrapper
templates/
  index.json            # Homepage template
  page.json             # Generic page
  product.json          # Product detail
  collection.json       # Collection/category
  cart.json             # Cart page
sections/
  hero.liquid           # Hero section (section schema)
  featured-collection.liquid
  newsletter.liquid
  footer.liquid
  header.liquid
snippets/
  product-card.liquid   # Reusable product card
  icon-*.liquid         # SVG icons
assets/
  theme.css             # Main stylesheet with design tokens
  animations.js         # Custom animations (Intersection Observer, smooth scroll)
  typography.css        # Font loading and type scale
config/
  settings_schema.json  # Theme customizer settings
  settings_data.json    # Default values
\`\`\`

**Architecture rules:**
- Every section must have a \`{% schema %}\` block with customizer settings
- Use CSS custom properties for all design tokens (colors, fonts, spacing, easing)
- Animations via vanilla JS + Intersection Observer (no heavy libraries)
- Smooth scroll via Lenis (loaded from CDN in theme.liquid)
- Font loading: Google Fonts preloaded in theme.liquid \`<head>\`
- Responsive images: use Shopify's \`| image_url\` filter with width params
- Section-based architecture: each section is independently configurable
- Performance: defer non-critical JS, lazy-load below-fold images`,

  wordpress: `### WordPress PHP Theme Architecture

**Directory structure:**
\`\`\`
style.css               # Theme header + base styles
functions.php           # Theme setup, enqueues, CPTs, menus
index.php               # Fallback template
front-page.php          # Homepage (static front page)
page.php                # Generic page
single.php              # Single post
archive.php             # Post archive
header.php              # Site header (wp_head)
footer.php              # Site footer (wp_footer)
template-parts/
  hero.php              # Hero section partial
  content-card.php      # Post/page card
  feature-grid.php      # Feature grid
  newsletter.php        # Newsletter signup
assets/
  css/
    theme.css           # Main stylesheet with design tokens
    typography.css      # Font loading and type scale
    animations.css      # Animation keyframes and utilities
  js/
    animations.js       # Scroll reveals, smooth scroll
    navigation.js       # Mobile menu, sticky header
  fonts/                # Self-hosted premium fonts (WOFF2)
  images/
inc/
  customizer.php        # Theme customizer settings
  custom-post-types.php # CPTs if needed
  enqueue.php           # Script/style enqueue functions
\`\`\`

**Architecture rules:**
- Use WordPress template hierarchy strictly (front-page.php, page.php, etc.)
- Template parts via \`get_template_part()\` for reusable components
- Enqueue all CSS/JS properly via \`wp_enqueue_style/script\` in functions.php
- CSS custom properties for design tokens (same variables, PHP generates them from customizer)
- Animations: vanilla JS + Intersection Observer, Lenis smooth scroll
- Font loading: self-host premium fonts in /assets/fonts/ with @font-face
- WordPress customizer for colors, fonts, and content options
- Use \`wp_get_attachment_image()\` for responsive images with srcset
- Accessibility: proper heading hierarchy, skip links, ARIA landmarks`,

  ikas: `### IKAS Theme Architecture

**Directory structure:**
\`\`\`
theme.json              # Theme configuration
templates/
  index.html            # Homepage
  product.html          # Product detail
  collection.html       # Collection page
  page.html             # Generic page
  cart.html              # Cart
components/
  header.html           # Site header
  footer.html           # Site footer
  hero.html             # Hero section
  product-card.html     # Product card
  feature-grid.html     # Feature grid
assets/
  css/
    theme.css           # Design tokens + base styles
    animations.css      # Animation utilities
  js/
    animations.js       # Custom interactions
  images/
config/
  settings.json         # Theme settings schema
\`\`\`

**Architecture rules:**
- Use IKAS template engine syntax for dynamic data
- CSS custom properties for all design tokens
- Component-based architecture for reusable UI elements
- Vanilla JS for animations (no heavy frameworks)
- Responsive images with proper srcset handling
- E-commerce-optimized: product cards, cart interactions, checkout flow
- Performance: minimal JS, optimized images, critical CSS inlined`,

  custom: `### Custom React/Next.js Architecture

**Directory structure:**
\`\`\`
src/
  app/
    layout.tsx           # Root layout (fonts, metadata, providers)
    page.tsx             # Homepage
    about/page.tsx       # About page
    [slug]/page.tsx      # Dynamic pages
    globals.css          # Design tokens, base styles, animations
  components/
    ui/
      Button.tsx         # Magnetic button with hover effects
      Container.tsx      # Grid container with grid-break variants
      Typography.tsx     # Display, heading, body text components
      Card.tsx           # Tilt/hover card with 3D effect
    sections/
      Hero.tsx           # Viewport-filling hero with signature moment
      FeatureGrid.tsx    # Bento-grid feature showcase
      Testimonials.tsx   # Client testimonials with scroll reveal
      CTA.tsx            # Call-to-action with magnetic button
      Footer.tsx         # Footer with considered hover states
    layout/
      Header.tsx         # Sticky header with scroll-aware behavior
      Navigation.tsx     # Navigation with cascade reveal
    effects/
      SmoothScroll.tsx   # Lenis smooth scroll provider
      ScrollReveal.tsx   # Framer Motion scroll-triggered reveal wrapper
      SplitText.tsx      # Text splitting for word/char animation
      MagneticCursor.tsx # Custom cursor with magnetic effect
  lib/
    fonts.ts             # next/font configuration for premium fonts
    animations.ts        # Shared Framer Motion variants and easing curves
    design-tokens.ts     # TypeScript design token definitions
  hooks/
    useScrollProgress.ts # Scroll position hook
    useMediaQuery.ts     # Responsive hook
tailwind.config.ts       # Extended Tailwind with design tokens
\`\`\`

**Architecture rules:**
- Next.js App Router with server components where appropriate
- Tailwind CSS extended with custom design tokens (colors, fonts, spacing, easing)
- Framer Motion for ALL animations (NEVER CSS transitions for complex motion)
- Custom easing curves ONLY: [0.16, 1, 0.3, 1] (expo out), [0.25, 1, 0.5, 1] (quart out)
- Lenis smooth scroll wrapping the entire app
- next/font for optimized premium font loading
- Component composition: sections built from atomic UI components
- \`prefers-reduced-motion\` respected via Framer Motion's \`useReducedMotion\`
- Image optimization via next/image with responsive srcset
- Code splitting: heavy components (3D, complex animations) loaded dynamically`,
};

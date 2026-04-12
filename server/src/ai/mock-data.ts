/**
 * Mock AI Responses
 *
 * Realistic sample data for testing the full pipeline without an API key.
 * Activated when AI_MOCK_MODE=true or ANTHROPIC_API_KEY is empty.
 */

import type { ConversationAnalysisResult, ArchitecturePlan } from "./types";

// ── Mock conversation analysis ────────────────────────────────────────

export const MOCK_ANALYSIS: ConversationAnalysisResult = {
  projectType: "e-commerce",
  platformPreference: "custom",
  confidence: 0.87,
  designSystem: {
    colorPalette: {
      primary: "#0e0e0e",
      secondary: "#fafaf9",
      accent: "#c4553d",
      background: "#0e0e0e",
      text: "#fafaf9",
    },
    typography: {
      displayFont: "Space Grotesk",
      bodyFont: "DM Sans",
      heroScale: "clamp(4rem, 2rem + 8vw, 12rem)",
      bodyScale: "1.125rem",
      tracking: "-0.03em",
    },
    easing: {
      primary: "cubic-bezier(0.16, 1, 0.3, 1)",
      dramatic: "cubic-bezier(0.87, 0, 0.13, 1)",
      symmetric: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
    spacing: {
      sectionPadding: "clamp(4rem, 10vh, 8rem)",
      gridGutter: "clamp(1rem, 2vw, 2rem)",
      gridMargin: "clamp(1rem, 5vw, 6rem)",
    },
    animationStyle: "studio-freight",
    scrollBehavior: "smooth-lenis",
    signatureMoment: "Hero with viewport-filling brand name that splits into characters on load, each revealing with staggered upward motion",
    mood: "bold",
  },
  designRequirements: {
    style: "dark mode, bold typography, asymmetric grid, product-focused",
    references: ["https://studiofright.com", "https://locomotive.ca"],
    responsive: true,
    darkMode: true,
  },
  contentRequirements: {
    pages: ["Home", "Products", "Product Detail", "About", "Contact", "Cart"],
    features: ["product gallery", "cart", "search", "newsletter signup", "size guide"],
    integrations: ["payment gateway", "email marketing", "analytics"],
    languages: ["en"],
  },
  businessContext: {
    industry: "fashion",
    targetAudience: "young professionals 25-35, style-conscious",
    competitors: ["zara.com", "asos.com"],
    timeline: "3 weeks",
    budgetSignal: "premium",
  },
  brandEssence: "bold",
  visualTension: "raw minimalism vs dramatic typography",
  signatureMoment: "Hero text fills viewport with staggered char reveal on dark background",
};

// ── Mock architecture plan ────────────────────────────────────────────

export const MOCK_PLAN: ArchitecturePlan = {
  platform: "custom",
  fileTree: [
    "index.html",
    "css/theme.css",
    "css/animations.css",
    "js/animations.js",
    "js/cart.js",
  ],
  componentBreakdown: [
    {
      name: "Hero",
      filePath: "index.html",
      purpose: "Viewport-filling hero with dramatic brand statement",
      props: ["heading", "subheading", "cta_text"],
      animations: ["staggered word reveal on load", "subtle parallax on scroll"],
    },
    {
      name: "Product Grid",
      filePath: "index.html",
      purpose: "Asymmetric product grid with hover interactions",
      props: ["products[]", "columns"],
      animations: ["scroll-triggered fade-up with stagger", "image scale on hover"],
    },
    {
      name: "Features",
      filePath: "index.html",
      purpose: "USP/value proposition cards",
      props: ["features[]"],
      animations: ["stagger reveal on scroll"],
    },
    {
      name: "Newsletter",
      filePath: "index.html",
      purpose: "Email capture section",
      props: ["heading", "placeholder"],
      animations: ["fade-up on scroll enter"],
    },
    {
      name: "About",
      filePath: "index.html",
      purpose: "Brand story split-screen section",
      props: ["title", "description", "image"],
      animations: ["parallax image, text reveal on scroll"],
    },
  ],
  pages: [
    {
      name: "Home",
      route: "/",
      components: ["Hero", "Product Grid", "Features", "About", "Newsletter"],
      layout: "Full-width single-page with smooth scroll sections",
    },
  ],
  designTokens: {
    "--color-dark": "#0e0e0e",
    "--color-light": "#fafaf9",
    "--color-accent": "#c4553d",
    "--color-text-primary": "#fafaf9",
    "--color-text-secondary": "rgba(250, 250, 249, 0.6)",
    "--color-border": "rgba(250, 250, 249, 0.1)",
    "--ease-out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
    "--ease-out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
    "--font-display": "'Space Grotesk', sans-serif",
    "--font-body": "'DM Sans', sans-serif",
  },
  animationPlan: [
    {
      element: "Hero heading",
      trigger: "load",
      animation: "Words slide up individually with stagger",
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      duration: "1.2s",
      stagger: "80ms",
    },
    {
      element: "Product cards",
      trigger: "scroll",
      animation: "Fade up with slight Y translation",
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      duration: "0.8s",
      stagger: "100ms",
    },
    {
      element: "Navigation items",
      trigger: "load",
      animation: "Cascade reveal from left",
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      duration: "0.5s",
      stagger: "50ms",
    },
  ],
  performanceBudget: {
    lcpTarget: "<2.5s",
    clsTarget: "~0",
    fpsTarget: 60,
    bundleTarget: "<150KB JS",
  },
};

// ── Mock generated code (hero section as sample) ──────────────────────

export const MOCK_GENERATED_CODE = `\`\`\`filepath:sections/hero.liquid
{% comment %}
  Hero Section — Viewport-filling statement with staggered word reveal
  Design Score: Typography 9/10, Composition 9/10, Motion 9/10
{% endcomment %}

<section
  class="hero"
  data-section-id="{{ section.id }}"
  data-section-type="hero"
>
  <div class="hero__container">
    <h1 class="hero__title" data-reveal="words">
      {{ section.settings.heading | default: 'Define Your Style' }}
    </h1>

    {% if section.settings.subheading != blank %}
      <p class="hero__subtitle" data-reveal="fade">
        {{ section.settings.subheading }}
      </p>
    {% endif %}

    {% if section.settings.cta_text != blank %}
      <a
        href="{{ section.settings.cta_link }}"
        class="hero__cta magnetic-btn"
        data-reveal="fade"
      >
        <span data-text="{{ section.settings.cta_text }}">
          {{ section.settings.cta_text }}
        </span>
      </a>
    {% endif %}
  </div>
</section>

<style>
  .hero {
    position: relative;
    min-height: 100vh;
    display: flex;
    align-items: flex-end;
    padding: var(--grid-margin);
    padding-bottom: 15vh;
    background-color: {{ section.settings.background_color | default: 'var(--color-dark)' }};
    overflow: hidden;
  }

  .hero__title {
    font-family: var(--font-display);
    font-size: clamp(4rem, 2rem + 8vw, 12rem);
    font-weight: 700;
    line-height: 0.9;
    letter-spacing: -0.04em;
    color: var(--color-light);
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    text-wrap: balance;
    margin: 0;
  }

  .hero__title .word {
    display: inline-block;
    overflow: hidden;
  }

  .hero__title .word-inner {
    display: inline-block;
    transform: translateY(110%);
    transition: transform 1.2s var(--ease-out-expo);
  }

  .hero__title.is-visible .word-inner {
    transform: translateY(0);
  }

  .hero__subtitle {
    font-family: var(--font-body);
    font-size: 1.125rem;
    line-height: 1.6;
    color: var(--color-text-secondary);
    max-width: 45ch;
    margin-top: 2rem;
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.8s var(--ease-out-expo) 0.6s,
                transform 0.8s var(--ease-out-expo) 0.6s;
  }

  .hero__subtitle.is-visible {
    opacity: 1;
    transform: translateY(0);
  }

  .hero__cta {
    display: inline-block;
    margin-top: 2.5rem;
    padding: 1rem 2.5rem;
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--color-light);
    border: 1px solid var(--color-border);
    text-decoration: none;
    position: relative;
    overflow: hidden;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.6s var(--ease-out-expo) 0.8s,
                transform 0.6s var(--ease-out-expo) 0.8s;
  }

  .hero__cta.is-visible {
    opacity: 1;
    transform: translateY(0);
  }

  .hero__cta::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--color-accent);
    transform: scaleX(0);
    transform-origin: right;
    transition: transform 0.5s var(--ease-out-expo);
  }

  .hero__cta:hover::before {
    transform: scaleX(1);
    transform-origin: left;
  }

  .hero__cta span {
    position: relative;
    z-index: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .hero__title .word-inner,
    .hero__subtitle,
    .hero__cta {
      transform: none;
      opacity: 1;
      transition: none;
    }
  }
</style>

{% schema %}
{
  "name": "Hero",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "Heading",
      "default": "Define Your Style"
    },
    {
      "type": "textarea",
      "id": "subheading",
      "label": "Subheading",
      "default": "Curated fashion for the modern professional. Bold choices, refined taste."
    },
    {
      "type": "text",
      "id": "cta_text",
      "label": "Button text",
      "default": "Shop Collection"
    },
    {
      "type": "url",
      "id": "cta_link",
      "label": "Button link"
    },
    {
      "type": "color",
      "id": "background_color",
      "label": "Background color",
      "default": "#0e0e0e"
    }
  ],
  "presets": [
    {
      "name": "Hero",
      "category": "Hero"
    }
  ]
}
{% endschema %}
\`\`\`

\`\`\`filepath:assets/theme.css
/* ═══════════════════════════════════════════════════
   Yappaflow Generated Theme — Design Tokens
   Score: Typography 9 | Composition 9 | Motion 9 | Color 9 | Details 8
   ═══════════════════════════════════════════════════ */

:root {
  /* Color System — warm variants, never pure black/white */
  --color-dark: #0e0e0e;
  --color-light: #fafaf9;
  --color-accent: #c4553d;
  --color-surface: #141414;
  --color-text-primary: #fafaf9;
  --color-text-secondary: rgba(250, 250, 249, 0.6);
  --color-text-tertiary: rgba(250, 250, 249, 0.4);
  --color-border: rgba(250, 250, 249, 0.1);

  /* Typography */
  --font-display: 'Space Grotesk', sans-serif;
  --font-body: 'DM Sans', sans-serif;

  /* Spacing */
  --grid-columns: 12;
  --grid-gutter: clamp(1rem, 2vw, 2rem);
  --grid-margin: clamp(1rem, 5vw, 6rem);
  --section-padding: clamp(4rem, 10vh, 8rem);

  /* Easing — NEVER use ease, linear, ease-in-out */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-in-out-expo: cubic-bezier(0.87, 0, 0.13, 1);

  /* Duration */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --duration-slower: 800ms;
}

/* ── Base Reset ─────────────────────────────────── */

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  font-size: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

body {
  font-family: var(--font-body);
  font-size: 1.125rem;
  line-height: 1.6;
  color: var(--color-text-primary);
  background-color: var(--color-dark);
}

/* ── Selection ──────────────────────────────────── */

::selection {
  background: var(--color-accent);
  color: var(--color-light);
}

/* ── Focus States (beautiful AND accessible) ────── */

:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}

/* ── Grid System ────────────────────────────────── */

.grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns), 1fr);
  gap: var(--grid-gutter);
  padding-inline: var(--grid-margin);
  max-width: 1800px;
  margin-inline: auto;
}

/* ── Section Spacing ────────────────────────────── */

.section { padding-block: var(--section-padding); }

/* ── Links ──────────────────────────────────────── */

a {
  color: inherit;
  text-decoration: none;
}

.link-underline {
  position: relative;
}

.link-underline::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 0.4s var(--ease-out-expo);
}

.link-underline:hover::after {
  transform: scaleX(1);
  transform-origin: left;
}

/* ── Reduced Motion ─────────────────────────────── */

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
\`\`\`

\`\`\`filepath:assets/animations.js
/**
 * Yappaflow Generated — Animation Controller
 * Smooth scroll + scroll-triggered reveals + word splitting
 */

(function() {
  'use strict';

  // ── Word Splitting for Hero Text ────────────────────
  document.querySelectorAll('[data-reveal="words"]').forEach(el => {
    const text = el.textContent.trim();
    const words = text.split(' ');
    el.innerHTML = words.map((word, i) =>
      '<span class="word"><span class="word-inner" style="transition-delay: ' +
      (200 + i * 80) + 'ms">' + word + '</span></span>'
    ).join(' ');
  });

  // ── Intersection Observer for Reveals ───────────────
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -100px 0px',
    threshold: 0.1
  };

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all revealable elements
  document.querySelectorAll('[data-reveal]').forEach(el => {
    revealObserver.observe(el);
  });

  // ── Magnetic Button Effect ──────────────────────────
  document.querySelectorAll('.magnetic-btn').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = 'translate(' + (x * 0.2) + 'px, ' + (y * 0.2) + 'px)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
      btn.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.transition = 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)';
    });
  });
})();
\`\`\`

\`\`\`filepath:config/settings_schema.json
[
  {
    "name": "theme_info",
    "theme_name": "Yappaflow Bold",
    "theme_version": "1.0.0",
    "theme_author": "Yappaflow AI Engine",
    "theme_documentation_url": "",
    "theme_support_url": ""
  },
  {
    "name": "Colors",
    "settings": [
      {
        "type": "color",
        "id": "color_dark",
        "label": "Dark color",
        "default": "#0e0e0e"
      },
      {
        "type": "color",
        "id": "color_light",
        "label": "Light color",
        "default": "#fafaf9"
      },
      {
        "type": "color",
        "id": "color_accent",
        "label": "Accent color",
        "default": "#c4553d"
      }
    ]
  },
  {
    "name": "Typography",
    "settings": [
      {
        "type": "font_picker",
        "id": "font_display",
        "label": "Display font",
        "default": "space_grotesk_n7"
      },
      {
        "type": "font_picker",
        "id": "font_body",
        "label": "Body font",
        "default": "dm_sans_n4"
      }
    ]
  }
]
\`\`\``;

// ── Simulate streaming with delays ────────────────────────────────────

export async function simulateStreaming(
  text: string,
  onChunk: (chunk: string) => void,
  chunkSize: number = 30,
  delayMs: number = 20
): Promise<void> {
  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, i + chunkSize);
    onChunk(chunk);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

/**
 * Shared design doctrine — the "how to design well" prefix that gets prompt-cached on every
 * planning/generation call. The cost math only works if this block is stable across projects.
 *
 * Written to match the Yappaflow AI vendor strategy (see memory): Claude Sonnet 4.6 as the
 * generation model, DeepSeek/Gemini Flash Lite for analysis.
 */

export const DESIGN_DOCTRINE = `You are a senior art director working with a strict design DNA file.

Principles (non-negotiable):
1. TYPE DOES THE WORK. Use at most 2 families. Pick a scale from the DNA and never interpolate.
2. COLOR IS A SYSTEM. Use the DNA's custom properties where present. No untheme'd colors.
3. GRID CARRIES TONE. Asymmetric editorial ≠ centered marketing. Respect the DNA's archetype.
4. MOTION IS INTENTIONAL. Use the DNA's easings and durations. Never invent bouncy springs if
   the reference is restrained.
5. IMAGES ARE THE HERO WHEN THE BRIEF SAYS SO. Otherwise type is the hero.
6. DARK BY DEFAULT ONLY WHEN THE BRIEF SAYS SO. The yappaflow default is light with a toggle.
7. CODE QUALITY: semantic HTML, 1 CSS variable per token, no framework bloat unless requested.
8. ACCESSIBILITY: AA contrast on all text, focus outlines intact, reduced-motion media query.
9. NEVER SHIP CANNED COPY. If content blocks are missing, leave labeled placeholders — never
   "Lorem ipsum" and never generic marketing phrases like "Transform your business".
10. YAPPAFLOW CONVENTION: every site must ship with a dark-theme toggle; default is light theme.`;

export const DARK_THEME_TOGGLE_SNIPPET = `<!-- Yappaflow dark-theme toggle: required on every site per user doctrine.
The site defaults to light; this button flips to dark and persists via data-theme on <html>.-->
<button
  type="button"
  data-theme-toggle
  aria-label="Toggle dark mode"
  class="theme-toggle"
>
  <span class="sr-only">Toggle dark mode</span>
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" fill="currentColor"/></svg>
</button>
<script>
  (function () {
    const root = document.documentElement;
    const saved = localStorage.getItem('yf-theme');
    if (saved) root.dataset.theme = saved;
    const btn = document.querySelector('[data-theme-toggle]');
    btn && btn.addEventListener('click', function () {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      localStorage.setItem('yf-theme', next);
    });
  })();
</script>`;

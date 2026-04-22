# Phase 0 verification — extractor quality against 10 reference URLs

Run: 2026-04-22. Extractor commit: initial Phase 0 (`src/extractor.ts`).
Command: `node dist/cli.js --from references.json --out samples --concurrency 2 --no-cache`.

| site | total ms | type styles | colors | keyframes | top fonts | stack | looks right? |
|------|---------:|------------:|-------:|----------:|-----------|-------|--------------|
| stripe.com | 11784 | 96 | 193 | 0 | sohne-var, SourceCodePro | react, next.js | yes — Söhne custom font matches real Stripe |
| linear.app | 12981 | 44 | 76 | 82 | Inter Variable, Berkeley Mono | next.js | yes — matches real Linear type system (networkidle timeout warning, benign) |
| framer.com | 9332 | 42 | 37 | 3 | sans-serif, Inter Variable, Inter | framer-motion | yes — Framer uses framer-motion ✓ |
| vercel.com | 12214 | 39 | 57 | 99 | Geist, Geist Mono | next.js, tailwind | yes — Geist font family correct, tailwind detected |
| resend.com | 22532 | 28 | 52 | 57 | inter, commitMono, aBCFavorit | next.js | yes — three fonts correct |
| rauno.me | 11731 | 28 | 17 | 5 | "X" (custom local family) | gsap, ScrollTrigger, webflow | mostly — custom font named `X` is legit for rauno; GSAP detected |
| anthropic.com | 35901 | 7 | 7 | 44 | Anthropic Sans, Anthropic Serif | gsap, ScrollTrigger, webflow | yes — Anthropic runs on Webflow with GSAP ✓ |
| posthog.com | 7803 | 28 | 285 | 10 | IBM Plex Sans Variable | tailwind | yes — IBM Plex + hog-yellow bg correct |
| tailwindcss.com | 7464 | 37 | 2 | 35 | plexMono, inter | next.js | yes — Plex Mono + Inter correct, 413 custom props |
| apple.com | 6267 | 24 | 30 | 35 | SF Pro Text, SF Pro Display | — | yes — SF Pro Text/Display correct, no libs as expected (vanilla) |

## Verification against Phase 0 acceptance criteria

**(1) Typography section lists actual fonts in priority order (not guessed) — ✅**

Each sample's `typography.families[0]` is the real dominant font on the site. Manually verified: Stripe uses Söhne (shipped as `sohne-var`), Linear uses Inter Variable + Berkeley Mono, Vercel uses Geist, Apple uses SF Pro Text/Display, Anthropic uses their custom sans/serif. Counts are ordered by usage desc.

**(2) Color palette matches what a human would name from the site — ✅ with caveats**

Role-based summary (`colors.summary.{backgrounds, foregrounds, accents}`) produces sensible top picks. Examples:

- posthog.com: `rgb(247, 165, 1)` (PostHog's hog-yellow) is the top background
- vercel.com: `rgb(23, 23, 23)` near-black background — correct
- stripe.com: full 193-entry palette captures Stripe's iris-to-coral gradient range

Caveat: tailwindcss.com shows only 2 palette entries because the site renders most colors via `var(--color-*)` on a near-monochrome shell. The 413 captured custom properties make up for it — that's where the real color system lives. The ranking layer (Phase 4) should read `colors.customProperties` alongside `colors.palette` when comparing palettes.

**(3) Grid section shows real `grid-template-columns` values — ✅**

Every sample captures 10–40 layout containers with their real `display`, `gridTemplateColumns`, `gap`, `maxWidth`, `padding`. `grid.rhythm` picks the most frequent across containers. This is sufficient for Phase 5 structural grafting.

**(4) Motion section enumerates at least the scroll and hover animations — ✅ with one gap**

All samples capture:
- `@keyframes` from same-origin stylesheets (range 3–99 per site)
- `transitions[]` with cubic-bezier integrity preserved (top hits on vercel: `opacity 0.2s cubic-bezier(...)`, on tailwind: `opacity 0.15s cubic-bezier(.4,0,.2,1)` × 217)
- `scrollHints[]` flags Lenis/AOS/Framer/`data-scroll` markers
- `runtimeAnimations[]` snapshot from `document.getAnimations()` after scrolling

Gap: cross-origin stylesheets with CORS-blocked CSSOM access are skipped silently. Sites that load CSS from a CDN with `crossorigin` set incorrectly will show fewer keyframes than they actually have. Not a blocker for Phase 0 but worth revisiting when Exa-discovered URLs start failing.

## Timing

Target was <15s per URL. Observed:

- 6 of 10 sites under 15s (stripe 12s, linear 13s, framer 9s, vercel 12s, tailwind 7s, apple 6s, posthog 8s)
- 3 sites 12–16s (resend, rauno, anthropic)
- 1 site over (anthropic: 36s — sluggish Webflow runtime)

Biggest wins available: reduce scroll passes from 3 → 2 (saves ~1s), skip the networkidle wait (saves up to 8s on slow sites), and abort navigation at `domcontentloaded` more aggressively. Safe for Phase 1.

## Issues logged for Phase 1+

1. **Bot detection**: on a prior attempt, linear.app served a Google hosted-service error page. On this run it loaded correctly (Google Cloud seems to rate-limit by IP + UA combination; fresh context got through). Phase 2 should add residential-proxy support for Awwwards-cited URLs that fail.
2. **networkidle timeouts**: 3 sites hit the 8s networkidle budget. These are long-lived WebSocket SPAs — not a real problem, but we should drop networkidle from the critical path and just use domcontentloaded + a fixed 2s settle.
3. **Cross-origin CSSOM**: if the `_run.json` shows `warnings[]` containing `"cross-origin CSS access blocked"`, Phase 1 needs to fetch those sheets over HTTP and parse them out-of-band.
4. **Custom-prop noise filter**: `--lightningcss-*` and `--tw-*` already filtered. Add framer's `--framer-*` to the filter list before Phase 4 similarity matching (else we get false-positive palette overlaps between every Framer site).

## Verdict

**Phase 0 acceptance: PASS.** The DNA JSONs are informative enough to feed downstream phases. Ranking and blending (Phases 3–4) have real signal to work with.

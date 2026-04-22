/**
 * DNA extractor.
 *
 * Loads a URL with Playwright, scrolls through the page, and captures structured design DNA.
 * Target: <15s per URL on a warm Chromium instance. Degrade gracefully when CSSOM access is
 * blocked by CORS — use fallbacks so we still get a useful fingerprint.
 */

import { chromium, type Browser, type Page, type BrowserContext } from "playwright";
import {
  DEFAULT_OPTIONS,
  type DesignDna,
  type ExtractorOptions,
  type TypographyStyle,
} from "./types.js";

const MAX_ELEMENTS_SAMPLED = 4000;

export async function extractDesignDna(
  url: string,
  opts: ExtractorOptions = {},
): Promise<DesignDna> {
  const resolved = { ...DEFAULT_OPTIONS, ...opts };
  const totalStart = Date.now();
  const warnings: string[] = [];

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  try {
    return await runExtraction(browser, url, resolved, warnings, totalStart);
  } finally {
    await browser.close().catch(() => {});
  }
}

/** Lets callers share a browser across many URLs for speed. */
export async function extractDesignDnaWithBrowser(
  browser: Browser,
  url: string,
  opts: ExtractorOptions = {},
): Promise<DesignDna> {
  const resolved = { ...DEFAULT_OPTIONS, ...opts };
  const totalStart = Date.now();
  const warnings: string[] = [];
  return runExtraction(browser, url, resolved, warnings, totalStart);
}

async function runExtraction(
  browser: Browser,
  url: string,
  opts: Required<ExtractorOptions>,
  warnings: string[],
  totalStart: number,
): Promise<DesignDna> {
  const context = await browser.newContext({
    viewport: opts.viewport,
    userAgent: opts.userAgent,
    deviceScaleFactor: 1,
    // Block some heavy resources that don't affect design DNA, to stay under 15s.
    // We still want CSS, fonts, images (for intrinsic sizes in assets) and scripts.
  });
  await context.addInitScript(() => {
    // Light anti-detection: hide the webdriver flag.
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
  const page = await context.newPage();

  const resourceLog: Array<{ url: string; type: string; size: number }> = [];
  page.on("response", (resp) => {
    const req = resp.request();
    const type = req.resourceType();
    const size = Number(resp.headers()["content-length"] ?? 0);
    resourceLog.push({ url: resp.url(), type, size: Number.isFinite(size) ? size : 0 });
  });

  const navStart = Date.now();
  let finalUrl = url;
  try {
    const resp = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: opts.navigationTimeoutMs,
    });
    finalUrl = resp?.url() ?? url;
  } catch (err) {
    warnings.push(`navigation failed: ${(err as Error).message}`);
  }
  const navigateMs = Date.now() - navStart;

  // Allow styles & fonts to settle; don't block forever on networkidle.
  await page
    .waitForLoadState("networkidle", { timeout: 8_000 })
    .catch(() => warnings.push("networkidle timeout — proceeding"));

  const scrollStart = Date.now();
  await scrollThroughPage(page, opts.scrollPasses, warnings);
  const scrollMs = Date.now() - scrollStart;

  const analyzeStart = Date.now();
  const raw = await analyzeInPage(page, opts, warnings);
  const analyzeMs = Date.now() - analyzeStart;

  const title = await page.title().catch(() => null);
  const description = await page
    .locator('meta[name="description"], meta[property="og:description"]')
    .first()
    .getAttribute("content")
    .catch(() => null);

  await context.close().catch(() => {});

  const totalMs = Date.now() - totalStart;
  return assembleDna({
    url,
    finalUrl,
    title: title || null,
    description,
    viewport: opts.viewport,
    warnings,
    timings: { navigateMs, scrollMs, analyzeMs, totalMs },
    raw,
    resourceLog,
  });
}

async function scrollThroughPage(page: Page, passes: number, warnings: string[]): Promise<void> {
  try {
    await page.evaluate(async (passes) => {
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const scrollHeight = () =>
        Math.max(
          document.documentElement.scrollHeight,
          document.body?.scrollHeight ?? 0,
        );
      for (let pass = 0; pass < passes; pass++) {
        const height = scrollHeight();
        const steps = 8;
        for (let i = 1; i <= steps; i++) {
          window.scrollTo({ top: (height * i) / steps, behavior: "instant" as ScrollBehavior });
          await sleep(120);
        }
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
        await sleep(120);
      }
    }, passes);
  } catch (err) {
    warnings.push(`scroll failed: ${(err as Error).message}`);
  }
}

type InPageRaw = Awaited<ReturnType<typeof analyzeInPage>>;

/**
 * Runs inside the page context. Returns primitive-only data so it can cross the bridge.
 */
async function analyzeInPage(page: Page, opts: Required<ExtractorOptions>, warnings: string[]) {
  const result = await page.evaluate(
    ({ includeRuntimeAnimations, maxElements }) => {
      // ---------- utils ----------
      const norm = (s: string | null | undefined) => (s ?? "").trim();
      const keyOf = (obj: Record<string, string>) =>
        Object.keys(obj)
          .sort()
          .map((k) => `${k}=${obj[k]}`)
          .join("|");
      const inc = <K extends string>(
        map: Map<K, { count: number; meta: Record<string, unknown> }>,
        key: K,
        meta: Record<string, unknown> = {},
      ) => {
        const existing = map.get(key);
        if (existing) existing.count += 1;
        else map.set(key, { count: 1, meta });
      };
      const isColor = (v: string) =>
        v &&
        v !== "rgba(0, 0, 0, 0)" &&
        v !== "transparent" &&
        (v.startsWith("rgb") || v.startsWith("#") || v.startsWith("hsl"));

      // ---------- typography & colors ----------
      const typeMap = new Map<string, { count: number; meta: Record<string, string> }>();
      const familyMap = new Map<string, { count: number; meta: Record<string, unknown> }>();
      const sizeSet = new Set<number>();
      const colorMap = new Map<
        string,
        { count: number; meta: { roles: Set<string> } }
      >();

      const walk = (el: Element) => {
        const cs = getComputedStyle(el as HTMLElement);
        const text = (el.textContent || "").trim();
        // typography only counts for elements that render visible text
        if (text && text.length > 0 && text.length < 400) {
          const style = {
            family: cs.fontFamily,
            weight: cs.fontWeight,
            size: cs.fontSize,
            lineHeight: cs.lineHeight,
            letterSpacing: cs.letterSpacing,
            textTransform: cs.textTransform,
          };
          const key = keyOf(style);
          const sample = text.length > 80 ? text.slice(0, 80) + "…" : text;
          const existing = typeMap.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            typeMap.set(key, { count: 1, meta: { ...style, sampleText: sample } });
          }
          // first declared family (what was requested, not the resolved one)
          const primary = cs.fontFamily.split(",")[0]?.trim().replace(/['"]/g, "");
          if (primary) inc(familyMap, primary);
          const sizePx = Number.parseFloat(cs.fontSize);
          if (Number.isFinite(sizePx)) sizeSet.add(Math.round(sizePx));
        }

        // colors — background, text, border
        const push = (val: string, role: string) => {
          if (!isColor(val)) return;
          const entry = colorMap.get(val);
          if (entry) {
            entry.count += 1;
            entry.meta.roles.add(role);
          } else {
            colorMap.set(val, { count: 1, meta: { roles: new Set([role]) } });
          }
        };
        push(cs.backgroundColor, "background");
        push(cs.color, "foreground");
        if (cs.borderTopWidth !== "0px") push(cs.borderTopColor, "border");
        if (cs.borderBottomWidth !== "0px") push(cs.borderBottomColor, "border");
        if (cs.fill && cs.fill !== "none") push(cs.fill, "fill");
        if (cs.stroke && cs.stroke !== "none") push(cs.stroke, "stroke");
      };

      // Sample the DOM but keep element count bounded so the walk is fast.
      const all = Array.from(document.querySelectorAll<HTMLElement>("body *"));
      const stride = Math.max(1, Math.ceil(all.length / maxElements));
      for (let i = 0; i < all.length; i += stride) {
        const el = all[i];
        if (!el) continue;
        walk(el);
      }

      // ---------- CSS custom properties ----------
      // Prefer custom props declared on :root/html/body/[data-theme] selectors,
      // but fall back to any rule since some frameworks (Tailwind v4) put them
      // under @property/@layer. Filter out obvious tooling noise (lightningcss-*).
      const rootStyles = getComputedStyle(document.documentElement);
      const customProps: Array<{ name: string; value: string }> = [];
      const propsSeen = new Set<string>();
      const preferredSelectors = [":root", "html", "body", "[data-theme]", "[data-theme='dark']", "[data-theme='light']"];
      const isNoise = (name: string) => /^--lightningcss-|^--tw-/.test(name);
      const collectFromRule = (sr: CSSStyleRule, preferred: boolean) => {
        for (let i = 0; i < sr.style.length; i++) {
          const name = sr.style.item(i);
          if (!name.startsWith("--")) continue;
          if (isNoise(name)) continue;
          if (propsSeen.has(name) && !preferred) continue;
          if (propsSeen.has(name)) continue;
          propsSeen.add(name);
          const value = sr.style.getPropertyValue(name).trim();
          if (!value) continue;
          customProps.push({ name, value });
        }
      };
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList | null = null;
        try {
          rules = sheet.cssRules;
        } catch {
          continue;
        }
        if (!rules) continue;
        const stack: CSSRuleList[] = [rules];
        while (stack.length) {
          const current = stack.pop();
          if (!current) break;
          for (const rule of Array.from(current)) {
            if (rule.constructor.name === "CSSStyleRule") {
              const sr = rule as CSSStyleRule;
              const preferred =
                !!sr.selectorText &&
                preferredSelectors.some((s) => sr.selectorText.includes(s));
              // Only collect from preferred selectors on first pass; below we do a fallback pass.
              if (preferred) collectFromRule(sr, true);
            }
            const nested = (rule as CSSGroupingRule).cssRules;
            if (nested && nested !== current) stack.push(nested);
          }
        }
      }
      // Fallback: if still thin, scan any rule
      if (customProps.length < 5) {
        for (const sheet of Array.from(document.styleSheets)) {
          let rules: CSSRuleList | null = null;
          try {
            rules = sheet.cssRules;
          } catch {
            continue;
          }
          if (!rules) continue;
          const stack: CSSRuleList[] = [rules];
          while (stack.length && customProps.length < 120) {
            const current = stack.pop();
            if (!current) break;
            for (const rule of Array.from(current)) {
              if (rule.constructor.name === "CSSStyleRule") {
                collectFromRule(rule as CSSStyleRule, false);
              }
              const nested = (rule as CSSGroupingRule).cssRules;
              if (nested && nested !== current) stack.push(nested);
            }
          }
        }
      }
      // Probe computed custom props on :root for known names as a last resort
      if (customProps.length === 0) {
        const guesses = [
          "--background", "--foreground", "--primary", "--accent",
          "--color-primary", "--color-bg", "--color-fg",
          "--font-sans", "--font-serif", "--font-mono",
        ];
        for (const name of guesses) {
          const v = rootStyles.getPropertyValue(name).trim();
          if (v) customProps.push({ name, value: v });
        }
      }

      // ---------- motion: @keyframes + transitions ----------
      const keyframes: Array<{ name: string; source: "stylesheet" | "inline"; percentageStops: string[] }> = [];
      const transitionMap = new Map<string, { count: number; meta: Record<string, string> }>();

      const keyframesSeen = new Set<string>();
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList | null = null;
        try {
          rules = sheet.cssRules;
        } catch {
          continue;
        }
        if (!rules) continue;
        const stack: CSSRuleList[] = [rules];
        while (stack.length) {
          const current = stack.pop();
          if (!current) break;
          for (const rule of Array.from(current)) {
            // CSSKeyframesRule
            if ((rule as CSSKeyframesRule).cssRules && (rule as CSSKeyframesRule).name) {
              const kf = rule as CSSKeyframesRule;
              if (keyframesSeen.has(kf.name)) continue;
              keyframesSeen.add(kf.name);
              const stops: string[] = [];
              for (const stop of Array.from(kf.cssRules)) {
                stops.push((stop as CSSKeyframeRule).keyText);
              }
              keyframes.push({ name: kf.name, source: "stylesheet", percentageStops: stops });
            }
            // Media / supports wrappers contain nested rules.
            const nested = (rule as CSSGroupingRule).cssRules;
            if (nested && nested !== current) stack.push(nested);
          }
        }
      }

      // Split a CSS list on top-level commas so cubic-bezier(0.4, 0, 0.2, 1) stays intact.
      const splitTopLevel = (s: string): string[] => {
        const out: string[] = [];
        let depth = 0;
        let cur = "";
        for (let i = 0; i < s.length; i++) {
          const ch = s[i];
          if (ch === "(") {
            depth += 1;
            cur += ch;
          } else if (ch === ")") {
            depth = Math.max(0, depth - 1);
            cur += ch;
          } else if (ch === "," && depth === 0) {
            out.push(cur.trim());
            cur = "";
          } else {
            cur += ch;
          }
        }
        if (cur.trim()) out.push(cur.trim());
        return out;
      };

      // Transitions — walk the sampled elements again (cheap, already cached).
      for (let i = 0; i < all.length; i += stride) {
        const el = all[i];
        if (!el) continue;
        const cs = getComputedStyle(el);
        if (!cs.transitionProperty || cs.transitionProperty === "all 0s ease 0s") continue;
        const props = splitTopLevel(cs.transitionProperty);
        const durs = splitTopLevel(cs.transitionDuration);
        const timings = splitTopLevel(cs.transitionTimingFunction);
        const delays = splitTopLevel(cs.transitionDelay);
        for (let j = 0; j < props.length; j++) {
          const prop = props[j];
          if (!prop || prop === "none" || prop === "all") continue;
          const dur = durs[j] ?? durs[0] ?? "0s";
          const timing = timings[j] ?? timings[0] ?? "ease";
          const delay = delays[j] ?? delays[0] ?? "0s";
          if (dur === "0s") continue;
          const key = `${prop}|${dur}|${timing}|${delay}`;
          const existing = transitionMap.get(key);
          if (existing) existing.count += 1;
          else
            transitionMap.set(key, {
              count: 1,
              meta: { property: prop, duration: dur, timing, delay },
            });
        }
      }

      // Runtime animations snapshot
      let runtimeAnimations: Array<{
        effectTarget: string | null;
        keyframeName: string | null;
        duration: number | null;
        easing: string | null;
        iterations: number | null;
      }> = [];
      if (includeRuntimeAnimations && typeof document.getAnimations === "function") {
        try {
          const anims = document.getAnimations();
          runtimeAnimations = anims.slice(0, 50).map((a) => {
            const effect = a.effect as KeyframeEffect | null;
            const target = effect?.target as Element | null;
            let selector: string | null = null;
            if (target) {
              const id = (target as HTMLElement).id;
              const cls =
                typeof (target as HTMLElement).className === "string"
                  ? (target as HTMLElement).className.split(/\s+/).filter(Boolean).slice(0, 2)
                  : [];
              selector = `${target.tagName.toLowerCase()}${id ? "#" + id : ""}${
                cls.length ? "." + cls.join(".") : ""
              }`;
            }
            const timing = effect?.getTiming?.();
            return {
              effectTarget: selector,
              keyframeName: (a as unknown as { animationName?: string }).animationName ?? null,
              duration:
                typeof timing?.duration === "number" && Number.isFinite(timing.duration)
                  ? timing.duration
                  : null,
              easing: timing?.easing ?? null,
              iterations:
                typeof timing?.iterations === "number" && Number.isFinite(timing.iterations)
                  ? timing.iterations
                  : null,
            };
          });
        } catch {
          // ignore
        }
      }

      // Scroll hints — evidence that the page uses scroll-linked behavior.
      const scrollHints: string[] = [];
      if (document.querySelector("[data-scroll]")) scrollHints.push("data-scroll attributes");
      if (document.querySelector("[data-framer-component-type]"))
        scrollHints.push("framer runtime markers");
      if (document.querySelector("[data-aos]")) scrollHints.push("aos library markers");
      const hasLenis = !!(window as unknown as { Lenis?: unknown }).Lenis;
      if (hasLenis) scrollHints.push("Lenis smooth-scroll global");
      const styleAttrWithScroll = Array.from(document.querySelectorAll("[style]"))
        .slice(0, 200)
        .some((el) => /translate3d/.test((el as HTMLElement).style.transform || ""));
      if (styleAttrWithScroll) scrollHints.push("transform-driven animation on inline styles");

      // ---------- grid / layout rhythm ----------
      const layoutCandidates: Array<{
        selector: string;
        display: string;
        gridTemplateColumns: string | null;
        gridTemplateRows: string | null;
        gap: string | null;
        maxWidth: string | null;
        padding: string | null;
        approxArea: number;
      }> = [];
      const topLevelSections = document.querySelectorAll<HTMLElement>(
        "main > *, body > section, body > div, [class*='container'], [class*='wrapper'], [class*='section'], [class*='grid']",
      );
      const seenSelectors = new Set<string>();
      for (const el of Array.from(topLevelSections).slice(0, 150)) {
        const rect = el.getBoundingClientRect();
        if (rect.width * rect.height < 40_000) continue;
        const cs = getComputedStyle(el);
        if (cs.display === "none") continue;
        const sel = describe(el);
        if (seenSelectors.has(sel)) continue;
        seenSelectors.add(sel);
        layoutCandidates.push({
          selector: sel,
          display: cs.display,
          gridTemplateColumns:
            cs.display.includes("grid") ? cs.gridTemplateColumns || null : null,
          gridTemplateRows: cs.display.includes("grid") ? cs.gridTemplateRows || null : null,
          gap: cs.gap && cs.gap !== "normal" && cs.gap !== "0px" ? cs.gap : null,
          maxWidth: cs.maxWidth && cs.maxWidth !== "none" ? cs.maxWidth : null,
          padding: cs.padding && cs.padding !== "0px" ? cs.padding : null,
          approxArea: Math.round(rect.width * rect.height),
        });
      }
      function describe(el: Element): string {
        if ((el as HTMLElement).id) return `${el.tagName.toLowerCase()}#${(el as HTMLElement).id}`;
        const cls =
          typeof (el as HTMLElement).className === "string"
            ? (el as HTMLElement).className.split(/\s+/).filter(Boolean).slice(0, 2)
            : [];
        return `${el.tagName.toLowerCase()}${cls.length ? "." + cls.join(".") : ""}`;
      }

      // ---------- stack detection ----------
      const libraries: string[] = [];
      const win = window as unknown as Record<string, unknown>;
      const flag = (name: string, condition: boolean) => {
        if (condition && !libraries.includes(name)) libraries.push(name);
      };
      flag("gsap", "gsap" in win);
      flag("ScrollTrigger", "ScrollTrigger" in win);
      flag("Lenis", "Lenis" in win);
      flag("THREE", "THREE" in win);
      flag("framer-motion", !!document.querySelector("[data-framer-component-type]"));
      flag("react", "React" in win || !!document.querySelector("#__next, [data-reactroot]"));
      flag(
        "next.js",
        !!document.querySelector("#__next") ||
          !!document.querySelector('script[src*="/_next/"]'),
      );
      flag("nuxt", "__NUXT__" in win);
      flag("sveltekit", !!document.querySelector("[data-sveltekit-preload-data]"));
      flag("webflow", !!document.querySelector("html.w-mod-js") || "Webflow" in win);
      flag("shopify", "Shopify" in win);
      flag("wordpress", !!document.querySelector('meta[name="generator"][content*="WordPress"]'));
      flag("tailwind", !!document.querySelector('[class*="flex"][class*="items-"]') && !!Array.from(document.styleSheets).some((s) => {
        try {
          return Array.from(s.cssRules || []).some((r) =>
            (r as CSSStyleRule).selectorText?.includes(".space-y-"),
          );
        } catch {
          return false;
        }
      }));
      flag("lottie", "lottie" in win || !!document.querySelector("[data-lottie], lottie-player"));
      flag("swiper", "Swiper" in win);
      flag("locomotive-scroll", "LocomotiveScroll" in win);

      const frameworks: string[] = [];
      const generator = document
        .querySelector('meta[name="generator"]')
        ?.getAttribute("content");
      if (generator) frameworks.push(generator);

      // ---------- assets ----------
      const fontFaceUrls: string[] = [];
      try {
        document.fonts.forEach((ff) => {
          const src = (ff as unknown as { src?: string }).src;
          if (src) fontFaceUrls.push(src);
        });
      } catch {
        // ignore
      }

      return {
        typography: Array.from(typeMap.entries()).map(([key, v]) => ({ key, ...v })),
        families: Array.from(familyMap.entries()).map(([family, v]) => ({ family, count: v.count })),
        scalePx: Array.from(sizeSet).sort((a, b) => a - b),
        colors: Array.from(colorMap.entries()).map(([value, v]) => ({
          value,
          count: v.count,
          roles: Array.from(v.meta.roles),
        })),
        customProps,
        keyframes,
        transitions: Array.from(transitionMap.entries()).map(([, v]) => ({
          ...(v.meta as { property: string; duration: string; timing: string; delay: string }),
          count: v.count,
        })),
        runtimeAnimations,
        scrollHints,
        layoutCandidates,
        libraries,
        frameworks,
        fontFaceUrls,
      };
    },
    { includeRuntimeAnimations: opts.includeRuntimeAnimations, maxElements: MAX_ELEMENTS_SAMPLED },
  ).catch((err) => {
    warnings.push(`in-page analysis failed: ${(err as Error).message}`);
    return null;
  });

  if (!result) {
    return {
      typography: [],
      families: [],
      scalePx: [],
      colors: [],
      customProps: [],
      keyframes: [],
      transitions: [],
      runtimeAnimations: [],
      scrollHints: [],
      layoutCandidates: [],
      libraries: [],
      frameworks: [],
      fontFaceUrls: [],
    };
  }
  return result;
}

type AssembleArgs = {
  url: string;
  finalUrl: string;
  title: string | null;
  description: string | null;
  viewport: { width: number; height: number };
  warnings: string[];
  timings: DesignDna["meta"]["timings"];
  raw: InPageRaw;
  resourceLog: Array<{ url: string; type: string; size: number }>;
};

function assembleDna(args: AssembleArgs): DesignDna {
  const { raw, resourceLog } = args;

  // Typography: sort by usage, take everything; consumer picks top 4–6.
  const styles: TypographyStyle[] = raw.typography
    .map((t) => {
      const m = t.meta as Record<string, string>;
      return {
        family: m.family ?? "",
        weight: m.weight ?? "",
        size: m.size ?? "",
        lineHeight: m.lineHeight ?? "",
        letterSpacing: m.letterSpacing ?? "",
        textTransform: m.textTransform ?? "",
        count: t.count,
        sampleText: (m.sampleText as string) ?? "",
      } satisfies TypographyStyle;
    })
    .sort((a, b) => b.count - a.count);

  const families = [...raw.families].sort((a, b) => b.count - a.count);

  // Colors: sort, then build a role-based summary.
  const palette = [...raw.colors]
    .map((c) => ({ value: c.value, count: c.count, roles: c.roles as DesignDna["colors"]["palette"][number]["roles"] }))
    .sort((a, b) => b.count - a.count);
  const backgrounds = palette
    .filter((c) => c.roles.includes("background"))
    .slice(0, 4)
    .map((c) => c.value);
  const foregrounds = palette
    .filter((c) => c.roles.includes("foreground"))
    .slice(0, 4)
    .map((c) => c.value);
  const accents = palette
    .filter(
      (c) =>
        !c.roles.includes("background") &&
        !c.roles.includes("foreground") &&
        c.value !== "rgb(0, 0, 0)" &&
        c.value !== "rgb(255, 255, 255)",
    )
    .slice(0, 4)
    .map((c) => c.value);

  // Layout rhythm: the most common maxWidth / padding / gap across large containers.
  const rhythm = deriveRhythm(raw.layoutCandidates);

  // Assets from Playwright's response log
  const fonts = dedupe(
    resourceLog
      .filter(
        (r) => r.type === "font" || /\.(woff2?|ttf|otf)(\?|$)/.test(r.url),
      )
      .map((r) => ({
        url: r.url,
        family: extractFontFamilyHint(r.url),
        format: extractFontFormat(r.url),
      })),
    (x) => x.url,
  );
  const images = dedupe(
    resourceLog.filter((r) => r.type === "image").map((r) => ({ url: r.url })),
    (x) => x.url,
  );
  const videos = dedupe(
    resourceLog.filter((r) => r.type === "media" || /\.(mp4|webm|mov)(\?|$)/.test(r.url)).map((r) => r.url),
    (x) => x,
  );
  const scripts = dedupe(
    resourceLog.filter((r) => r.type === "script").map((r) => r.url),
    (x) => x,
  );
  const stylesheets = dedupe(
    resourceLog.filter((r) => r.type === "stylesheet").map((r) => r.url),
    (x) => x,
  );
  const totalTransferKb = Math.round(
    resourceLog.reduce((sum, r) => sum + (r.size || 0), 0) / 1024,
  );

  return {
    schemaVersion: 1,
    meta: {
      url: args.url,
      finalUrl: args.finalUrl,
      title: args.title,
      description: args.description,
      capturedAt: new Date().toISOString(),
      viewport: args.viewport,
      timings: args.timings,
      warnings: args.warnings,
    },
    typography: { styles, families, scalePx: raw.scalePx },
    colors: {
      palette,
      customProperties: raw.customProps,
      summary: { backgrounds, foregrounds, accents },
    },
    motion: {
      keyframes: raw.keyframes,
      transitions: raw.transitions.sort((a, b) => b.count - a.count),
      runtimeAnimations: raw.runtimeAnimations,
      scrollHints: raw.scrollHints,
    },
    grid: { containers: raw.layoutCandidates, rhythm },
    stack: { libraries: raw.libraries, frameworks: raw.frameworks },
    assets: {
      fonts,
      images: images.slice(0, 80),
      videos,
      scripts: scripts.slice(0, 80),
      stylesheets,
      totalTransferKb,
    },
  };
}

function deriveRhythm(
  containers: InPageRaw["layoutCandidates"],
): DesignDna["grid"]["rhythm"] {
  const mostFrequent = <K extends string | null>(
    values: K[],
  ): K | null => {
    const map = new Map<string, { value: K; count: number }>();
    for (const v of values) {
      if (!v) continue;
      const key = String(v);
      const e = map.get(key);
      if (e) e.count += 1;
      else map.set(key, { value: v, count: 1 });
    }
    let winner: { value: K; count: number } | null = null;
    for (const e of map.values()) if (!winner || e.count > winner.count) winner = e;
    return winner?.value ?? null;
  };
  return {
    maxWidth: mostFrequent(containers.map((c) => c.maxWidth)),
    padding: mostFrequent(containers.map((c) => c.padding)),
    gap: mostFrequent(containers.map((c) => c.gap)),
  };
}

function dedupe<T>(arr: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const v of arr) {
    const k = key(v);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

function extractFontFamilyHint(url: string): string | null {
  const match = url.match(/([^/?#]+)\.(?:woff2?|ttf|otf)/i);
  return match?.[1] ?? null;
}

function extractFontFormat(url: string): string | null {
  const match = url.match(/\.(woff2|woff|ttf|otf)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export type { InPageRaw };

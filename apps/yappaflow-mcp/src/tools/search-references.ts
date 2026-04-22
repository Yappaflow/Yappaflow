/**
 * search_references — the discovery half of the pipeline.
 *
 * Steps:
 *   1. Generate 5 queries from a brief (3 concept, 2 craft). LLM-backed when available;
 *      deterministic template when offline.
 *   2. Call Exa in parallel for each query with the appropriate domain filters.
 *   3. For Awwwards / Muzli / Godly / SiteInspire results, navigate via Playwright and
 *      resolve the outbound "Visit Site" URL (phase 0 approximation: follow the canonical
 *      link attribute).
 *   4. Dedupe, cap at 2×k candidates.
 *   5. Extract DNA in parallel with a shared Playwright browser.
 *   6. Rank by concept × craft (calls rankReferences internally for consistency).
 */

import type { Config } from "../config.js";
import type { DnaCache } from "../cache.js";
import type { Brief } from "./brief.js";
import { briefToSentence } from "./brief.js";
import type { DesignDna } from "../types.js";
import { extractDesignDnaWithBrowser } from "../extractor.js";
import { getBrowser } from "../browser.js";
import { rankReferences, type RankedReference } from "./rank.js";
import { OpenRouterClient, parseJson } from "../llm/openrouter.js";

export type SearchResult = {
  queries: { concept: string[]; craft: string[] };
  references: RankedReference[];
  offlineMode: boolean;
  warnings: string[];
};

const GALLERY_DOMAINS = ["awwwards.com", "muz.li", "muzli.design", "godly.website", "siteinspire.com"];

export async function searchReferences(params: {
  brief: Brief;
  k: number;
  config: Config;
  cache: DnaCache;
  llm: OpenRouterClient;
}): Promise<SearchResult> {
  const { brief, k, config, cache, llm } = params;
  const warnings: string[] = [];

  const queries = llm.offline
    ? offlineQueries(brief)
    : await generateQueries(brief, llm).catch((err) => {
        warnings.push(`query generation failed: ${(err as Error).message} — using fallback`);
        return offlineQueries(brief);
      });

  const exaHits = await runExaSearches(queries, config).catch((err) => {
    warnings.push(`exa search failed: ${(err as Error).message}`);
    return [] as ExaHit[];
  });

  let candidates: ExaHit[];
  if (exaHits.length === 0) {
    warnings.push("no Exa hits — using the offline seed list");
    candidates = offlineSeedCandidates(brief);
  } else {
    candidates = exaHits;
  }

  // Resolve gallery outbound URLs
  const resolved = await resolveOutboundUrls(candidates, warnings);
  const uniqueUrls = dedupe(resolved.map((r) => r.url), (x) => canonicalDomain(x));
  const capped = uniqueUrls.slice(0, Math.max(k * 2, k + 4));

  // Extract DNA for each
  const browser = await getBrowser();
  const dnas: { url: string; dna: DesignDna }[] = [];
  const seen = new Set<string>();
  await Promise.all(
    capped.map(async (url) => {
      try {
        const cached = cache.get(url);
        if (cached) {
          if (!seen.has(url)) {
            seen.add(url);
            dnas.push({ url, dna: cached.dna });
          }
          return;
        }
        const dna = await extractDesignDnaWithBrowser(browser, url);
        cache.put(url, dna);
        if (!seen.has(url)) {
          seen.add(url);
          dnas.push({ url, dna });
        }
      } catch (err) {
        warnings.push(`extract failed for ${url}: ${(err as Error).message}`);
      }
    }),
  );

  const ranked = await rankReferences({ brief, references: dnas, config });
  return {
    queries,
    references: ranked.slice(0, k),
    offlineMode: llm.offline,
    warnings,
  };
}

// ----------------- query generation -----------------

async function generateQueries(brief: Brief, llm: OpenRouterClient): Promise<SearchResult["queries"]> {
  const raw = await llm.complete({
    stage: "analysis",
    system: `You generate web-search queries used to find DESIGN REFERENCE websites. Given a brief,
return JSON: { "concept": [3 strings], "craft": [2 strings] }.
- Concept queries target functional peers (competitors, same industry shape).
- Craft queries target visual/design peers (aesthetic, motion, typography character).
- Craft queries MUST include site filters: site:awwwards.com OR site:muzli.design OR site:godly.website OR site:siteinspire.com
Return only JSON.`,
    user: briefToSentence(brief),
    responseFormat: "json",
    temperature: 0.2,
    maxTokens: 400,
  });
  const parsed = parseJson<{ concept: string[]; craft: string[] }>(raw);
  return {
    concept: (parsed.concept ?? []).slice(0, 3),
    craft: (parsed.craft ?? []).slice(0, 2),
  };
}

function offlineQueries(brief: Brief): SearchResult["queries"] {
  const subject = brief.subcategory || brief.industry;
  const concept = [
    `best ${subject} website 2025`,
    `${subject} ${brief.tone || "modern"} website design`,
    `${brief.content_model.join(" ")} ${subject} marketing site`.trim(),
  ];
  const crafted = `${brief.palette_character || "editorial"} ${brief.motion_ambition || "subtle motion"}`.trim();
  const siteFilter = "site:awwwards.com OR site:muzli.design OR site:godly.website OR site:siteinspire.com";
  const craft = [
    `${crafted} ${subject} ${siteFilter}`,
    `${brief.grid_archetype.replace(/_/g, " ")} ${brief.tone || ""} ${siteFilter}`.replace(/\s+/g, " ").trim(),
  ];
  return { concept, craft };
}

// ----------------- exa -----------------

type ExaHit = {
  url: string;
  title: string;
  fromGallery: boolean;
  score: number;
  query: string;
};

async function runExaSearches(queries: SearchResult["queries"], config: Config): Promise<ExaHit[]> {
  if (!config.exa.apiKey) return [];
  const all: ExaHit[] = [];
  const run = async (query: string, flavor: "concept" | "craft") => {
    try {
      const res = await fetch(`${config.exa.baseUrl}/search`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": config.exa.apiKey!,
        },
        body: JSON.stringify({
          query,
          numResults: flavor === "craft" ? 10 : 6,
          type: "auto",
          useAutoprompt: true,
        }),
      });
      if (!res.ok) return;
      const body = (await res.json()) as { results: Array<{ url: string; title?: string; score?: number }> };
      for (const r of body.results ?? []) {
        all.push({
          url: r.url,
          title: r.title ?? "",
          fromGallery: GALLERY_DOMAINS.some((d) => r.url.includes(d)),
          score: r.score ?? 0,
          query,
        });
      }
    } catch {
      // swallow; warnings handled by caller
    }
  };
  await Promise.all([...queries.concept.map((q) => run(q, "concept")), ...queries.craft.map((q) => run(q, "craft"))]);
  return all;
}

// ----------------- outbound resolution -----------------

async function resolveOutboundUrls(
  hits: ExaHit[],
  warnings: string[],
): Promise<Array<{ url: string; title: string }>> {
  const out: Array<{ url: string; title: string }> = [];
  const browser = await getBrowser();
  await Promise.all(
    hits.map(async (hit) => {
      if (!hit.fromGallery) {
        out.push({ url: hit.url, title: hit.title });
        return;
      }
      try {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await context.newPage();
        await page.goto(hit.url, { waitUntil: "domcontentloaded", timeout: 15_000 });
        // Heuristics — different galleries use different markers.
        const candidate = await page
          .evaluate(() => {
            const selectors = [
              "a[href*='visit']",
              "a.site-visit",
              "a[data-event='website-clicked']",
              "a[target='_blank'][rel*='noopener']",
              "a[href^='http']:not([href*='awwwards']):not([href*='muzli']):not([href*='godly']):not([href*='siteinspire'])",
            ];
            for (const s of selectors) {
              const el = document.querySelector<HTMLAnchorElement>(s);
              if (el?.href) return el.href;
            }
            return null;
          })
          .catch(() => null);
        await context.close().catch(() => {});
        if (candidate) out.push({ url: candidate, title: hit.title });
        else warnings.push(`could not resolve outbound URL from ${hit.url}`);
      } catch (err) {
        warnings.push(`gallery nav failed for ${hit.url}: ${(err as Error).message}`);
      }
    }),
  );
  return out;
}

function canonicalDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
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

// ----------------- offline seed list -----------------
/**
 * When Exa is unavailable, fall back to a hand-curated list that still feeds the rest
 * of the pipeline with realistic candidates. Scoped by industry when we can match.
 */
function offlineSeedCandidates(brief: Brief): ExaHit[] {
  const BY_INDUSTRY: Record<string, string[]> = {
    photography: [
      "https://www.studio-felix.com",
      "https://www.madeinevolve.com",
      "https://kennethcappello.com",
    ],
    saas: [
      "https://linear.app",
      "https://vercel.com",
      "https://resend.com",
      "https://framer.com",
    ],
    "ecommerce-fashion": [
      "https://acnestudios.com",
      "https://www.ssense.com",
      "https://drakes.com",
    ],
    restaurant: [
      "https://www.atomixnyc.com",
      "https://www.cosmerestaurant.com",
    ],
    agency: [
      "https://www.instrument.com",
      "https://basic.agency",
      "https://www.tundra.cool",
    ],
    creator: [
      "https://rauno.me",
      "https://paco.me",
      "https://emilkowalski.com",
    ],
  };
  const seed = BY_INDUSTRY[brief.industry] ?? BY_INDUSTRY["saas"]!;
  return seed.map((url) => ({ url, title: "", fromGallery: false, score: 0.5, query: "offline" }));
}

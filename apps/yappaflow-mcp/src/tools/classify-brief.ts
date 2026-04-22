/**
 * classify_brief — convert a free-form conversation into a structured Brief.
 * Uses the analysis-stage model (cheap, strict JSON). Offline mode returns a fixture
 * so local development and CI don't need an OpenRouter key.
 */

import { BriefSchema, FIXTURE_BRIEF, type Brief } from "./brief.js";
import { OfflineError, parseJson, type OpenRouterClient } from "../llm/openrouter.js";

const SYSTEM = `You are a senior product-design strategist. A web agency has given you a
conversation with a client. Extract a JSON brief matching this schema:

{
  "industry":            string,   // one of: photography, saas, ecommerce-fashion, ecommerce-other, restaurant, agency, creator, other
  "subcategory":         string,   // free text, e.g. "luxury fashion"
  "audience":            string,   // e.g. "brand buyers", "self-serve developers"
  "content_model":       string[], // e.g. ["hero","case_studies","about","contact"]
  "palette_character":   string,   // e.g. "warm minimal", "monochrome tension"
  "motion_ambition":     string,   // e.g. "editorial cinema", "subtle fades", "none"
  "grid_archetype":      one of ["asymmetric_editorial","centered_marketing","full_bleed_product","dense_dashboard","split_hero","any"],
  "named_comparables":   string[], // full URLs the client referenced as "I want something like this"
  "tone":                string,   // two or three adjectives, e.g. "confident, slow, weighted"
  "preferred_platform":  one of ["html","shopify","wordpress","ikas","webflow"]
}

Return ONLY valid JSON. Do not explain. When a slot is unknown, use an empty string or [].`;

export async function classifyBrief(params: {
  transcript: string;
  llm: OpenRouterClient;
  offline: boolean;
}): Promise<Brief> {
  const { transcript, llm, offline } = params;
  if (offline || llm.offline) {
    return offlineClassify(transcript);
  }
  const raw = await llm.complete({
    stage: "analysis",
    system: SYSTEM,
    user: transcript,
    responseFormat: "json",
    temperature: 0,
    maxTokens: 1024,
  });
  try {
    const parsed = parseJson<unknown>(raw);
    return BriefSchema.parse(parsed);
  } catch (err) {
    throw new Error(`classify_brief: could not parse model output (${(err as Error).message})`);
  }
}

/**
 * Offline heuristic — keyword-match a small set of signals out of the transcript.
 * Not meant to replace the LLM; just enough to let downstream phases be tested.
 */
function offlineClassify(transcript: string): Brief {
  const lc = transcript.toLowerCase();
  const pick = <T extends string>(map: Array<[RegExp, T]>, fallback: T): T => {
    for (const [rx, val] of map) if (rx.test(lc)) return val;
    return fallback;
  };

  const industry = pick(
    [
      [/photograph|studio|photo/i, "photography"],
      [/shop|commerce|fashion|boutique|brand store/i, "ecommerce-fashion"],
      [/restaurant|cafe|menu|dine/i, "restaurant"],
      [/agency|creative agency/i, "agency"],
      [/saas|developer|api|product/i, "saas"],
      [/creator|portfolio|personal/i, "creator"],
    ],
    "other",
  );

  const grid_archetype = pick(
    [
      [/editorial|asymmetric|magazine/i, "asymmetric_editorial" as const],
      [/centered|marketing/i, "centered_marketing" as const],
      [/full[- ]bleed|product[- ]focus/i, "full_bleed_product" as const],
      [/dashboard|dense/i, "dense_dashboard" as const],
      [/split[- ]hero|hero split/i, "split_hero" as const],
    ],
    "any" as const,
  );

  const motion_ambition = pick(
    [
      [/cinema|editorial motion|slow/i, "editorial cinema"],
      [/none|static|no animation/i, "none"],
      [/spring|playful|bounce/i, "playful spring"],
    ],
    "subtle fades",
  );

  const palette_character = pick(
    [
      [/monochrome|black and white|mono/i, "monochrome tension"],
      [/warm|beige|cream|sand/i, "warm minimal"],
      [/vibrant|bold color|saturated/i, "vibrant accents on neutral base"],
      [/dark|night/i, "dark editorial"],
    ],
    "neutral minimal",
  );

  const preferred_platform = pick(
    [
      [/shopify/i, "shopify" as const],
      [/wordpress|woocommerce/i, "wordpress" as const],
      [/ikas/i, "ikas" as const],
      [/webflow/i, "webflow" as const],
    ],
    "html" as const,
  );

  const urlMatches = Array.from(transcript.matchAll(/https?:\/\/[^\s)]+/gi)).map((m) => m[0]);

  const content_model: string[] = [];
  if (/hero|landing/i.test(lc)) content_model.push("hero");
  if (/about/i.test(lc)) content_model.push("about");
  if (/case stud|portfolio|work/i.test(lc)) content_model.push("case_studies");
  if (/team/i.test(lc)) content_model.push("team");
  if (/contact|inquiry|email/i.test(lc)) content_model.push("contact");
  if (/product|shop|pdp/i.test(lc)) content_model.push("product");

  return BriefSchema.parse({
    industry,
    subcategory: "",
    audience: "",
    content_model: content_model.length ? content_model : FIXTURE_BRIEF.content_model,
    palette_character,
    motion_ambition,
    grid_archetype,
    named_comparables: urlMatches,
    tone: "",
    preferred_platform,
  });
}

/** Surface OfflineError for callers that want to explain why a stub result was returned. */
export { OfflineError };

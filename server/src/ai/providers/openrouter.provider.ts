/**
 * OpenRouter Provider (fallback)
 *
 * OpenRouter is a gateway across dozens of open-weight models. We keep
 * it as a fallback so that if DeepSeek is down, rate-limited, or pricing
 * changes, we can instantly flip to the cheapest inference available at
 * that moment without redeploying.
 *
 * They follow the OpenAI chat-completions shape. Two extra headers
 * (`HTTP-Referer`, `X-Title`) control branding on their public app
 * leaderboard — optional but polite.
 *
 * Docs: https://openrouter.ai/docs/quickstart
 */

import { env } from "../../config/env";
import type { ProviderConfig } from "./types";

// ── Pricing per 1M tokens (USD) ───────────────────────────────────────
// Source: https://openrouter.ai/models — individual model pages.
// Last verified: 2026-04-20. Unknown models degrade to 0-cost estimation
// (so the call still succeeds but the cost line is flagged as 0.00).
//
// Notes on model selection:
//   - gemini-2.5-flash-lite: Google's multilingual coverage is excellent
//     for Turkish conversation analysis; 1M-token context and reasoning
//     support at the same price as 2.0 Flash.
//   - llama-3.3-70b-instruct: FREE on OpenRouter as of 2026-04. Makes
//     an outstanding no-cost fallback — we estimate 0 for both dirs.
//   - qwen-2.5-72b-instruct: also strong at Turkish, useful backup.
const PRICING = {
  "google/gemini-2.5-flash-lite":             { input: 0.10, output: 0.40 },
  "google/gemini-2.0-flash-001":              { input: 0.10, output: 0.40 },
  "qwen/qwen-2.5-72b-instruct":               { input: 0.12, output: 0.39 },
  "qwen/qwen-2.5-coder-32b-instruct":         { input: 0.07, output: 0.16 },
  "meta-llama/llama-3.3-70b-instruct":        { input: 0.00, output: 0.00 },
  "deepseek/deepseek-chat":                   { input: 0.28, output: 0.42 },
  "mistralai/mistral-large":                  { input: 2.00, output: 6.00 },
} as const;

// OpenRouter passes through to the underlying model's limit. Gemini 2.5
// Flash Lite supports 65,536 output tokens; Llama 3.3 70B supports up
// to 131k. We cap at 32k as a conservative "big but not insane" ceiling
// — any single Yappaflow generation fits comfortably inside 32k and the
// cost of an accidental 100k-token runaway generation would be material.
// If a specific model warrants a higher cap, introduce a per-model
// override map here rather than raising the global OpenRouter ceiling.
const OPENROUTER_MAX_OUTPUT_TOKENS = 32_000;

// For big-output generation calls. Rationale:
//   - Gemini 2.5 Flash Lite (our `defaultModel`) advertises 1M context
//     but OpenRouter sometimes routes to upstream endpoints with a 32k
//     total cap, which broke Shopify generation in prod (2026-04-20).
//   - Qwen 2.5 Coder 32B was the original pick — it advertises 128k,
//     but that's only with the YaRN context-extension technique enabled.
//     Many OpenRouter upstreams serve Qwen at its *native* 32k window,
//     so we kept getting the same "context length is 32768" 400 error
//     even after swapping away from Flash Lite (prod, 2026-04-21).
//   - Llama 3.3 70B Instruct has a **uniform** 131k context across
//     every upstream provider (it's part of the base model, not an
//     add-on), so routing is deterministic. General-purpose but handles
//     Shopify Liquid / Next.js / WordPress PHP well enough for a
//     fallback path where the ideal provider (DeepSeek) is out.
const OPENROUTER_LARGE_OUTPUT_MODEL = "meta-llama/llama-3.3-70b-instruct";

export function getOpenRouterProvider(): ProviderConfig {
  return {
    id:               "openrouter",
    name:             "OpenRouter",
    baseUrl:          env.openrouterBaseUrl,
    apiKey:           env.openrouterApiKey,
    defaultModel:     env.openrouterModel,
    largeOutputModel: OPENROUTER_LARGE_OUTPUT_MODEL,
    headers: {
      "HTTP-Referer": env.openrouterReferer,
      "X-Title":      env.openrouterAppTitle,
    },
    pricing:          PRICING,
    maxOutputTokens:  OPENROUTER_MAX_OUTPUT_TOKENS,
  };
}

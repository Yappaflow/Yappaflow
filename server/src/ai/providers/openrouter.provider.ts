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
// Last verified: 2026-04-21. Unknown models degrade to 0-cost estimation
// (so the call still succeeds but the cost line is flagged as 0.00).
//
// Notes on model selection:
//   - gemini-2.5-flash-lite: Google's multilingual coverage is excellent
//     for Turkish conversation analysis; 1M-token context and reasoning
//     support at the same price as 2.0 Flash. Used as `defaultModel`.
//   - qwen/qwen3-coder: Alibaba's 480B-A35B MoE code model. Used as
//     `largeOutputModel` — see the block below for full rationale.
//   - deepseek/deepseek-chat: V3.2 routed through OpenRouter. Kept in
//     the pricing table as a warm fallback — we still hit it if a
//     caller explicitly names it, or if Qwen upstreams are degraded.
//   - llama-3.3-70b-instruct: FREE on OpenRouter as of 2026-04. Kept in
//     the pricing table as a no-cost emergency fallback a caller could
//     pick explicitly. NOT used as largeOutputModel — it produced empty
//     file stubs for Shopify generation in prod (2026-04-21).
//   - qwen-2.5-72b-instruct: strong at Turkish; useful backup.
const PRICING = {
  "google/gemini-2.5-flash-lite":             { input: 0.10, output: 0.40 },
  "google/gemini-2.0-flash-001":              { input: 0.10, output: 0.40 },
  "qwen/qwen-2.5-72b-instruct":               { input: 0.12, output: 0.39 },
  "qwen/qwen-2.5-coder-32b-instruct":         { input: 0.07, output: 0.16 },
  "qwen/qwen3-coder":                         { input: 0.22, output: 1.00 },
  "meta-llama/llama-3.3-70b-instruct":        { input: 0.00, output: 0.00 },
  "deepseek/deepseek-chat":                   { input: 0.28, output: 0.42 },
  "mistralai/mistral-large":                  { input: 2.00, output: 6.00 },
} as const;

// OpenRouter passes through to the underlying model's limit. Gemini 2.5
// Flash Lite supports 65,536 output tokens; Llama 3.3 70B supports up
// to 131k; Qwen3-Coder 480B advertises 262k total context with a 64k
// output ceiling on most upstreams. We cap at 32k as a conservative
// "big but not insane" ceiling — any single Yappaflow generation fits
// comfortably inside 32k and the cost of an accidental 100k-token
// runaway generation would be material. If a specific model warrants
// a higher cap, introduce a per-model override map here rather than
// raising the global OpenRouter ceiling.
const OPENROUTER_MAX_OUTPUT_TOKENS = 32_000;

// For big-output generation calls. Rationale (history + current pick):
//   - Gemini 2.5 Flash Lite (our `defaultModel`) advertises 1M context
//     but OpenRouter sometimes routes to upstream endpoints with a 32k
//     total cap, which broke Shopify generation in prod (2026-04-20).
//   - Qwen 2.5 Coder 32B was tried next — advertises 128k but only with
//     YaRN enabled. Many OpenRouter upstreams serve Qwen at its *native*
//     32k window, so the "context length is 32768" 400 returned even
//     after swapping away from Flash Lite (2026-04-21).
//   - Llama 3.3 70B had the right context (uniform 131k), but produced
//     nearly-empty file stubs for a 17-file Shopify theme contract:
//     18 fenced blocks totalling 6.4 kB (avg 355 bytes/file). It
//     followed the *shape* of the instruction but punted on the content
//     inside each block — a classic long-structured-output failure for
//     general-purpose instruct models (prod, 2026-04-21).
//   - DeepSeek V3.2 routed through OpenRouter was our interim pick. It
//     fixed the short-circuited output, but the *design quality* of the
//     generated Shopify themes was consistently weak: default Dawn-
//     shaped layouts, Inter hero type, centered safe composition —
//     exactly the "free AI website" look our agency customers rejected
//     (prod, 2026-04-21, LUMA build).
//   - Qwen3-Coder 480B (A35B MoE) is the current pick (2026-04-21).
//     Purpose-built code model with 262k context, uniform ~64k output
//     on Alibaba + Cerebras upstreams, $0.22/$1.00 per 1M — only ~30%
//     more expensive per project than DeepSeek V3.2, but a dedicated
//     code model trained on front-end + full-stack code that's
//     benchmarked near Sonnet-class on Liquid/HTML/Tailwind gen. This
//     is the swap we reserve for the generation phase specifically;
//     analysis + planning still route through their cheap models.
const OPENROUTER_LARGE_OUTPUT_MODEL = "qwen/qwen3-coder";

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

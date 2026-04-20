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

export function getOpenRouterProvider(): ProviderConfig {
  return {
    id:           "openrouter",
    name:         "OpenRouter",
    baseUrl:      env.openrouterBaseUrl,
    apiKey:       env.openrouterApiKey,
    defaultModel: env.openrouterModel,
    headers: {
      "HTTP-Referer": env.openrouterReferer,
      "X-Title":      env.openrouterAppTitle,
    },
    pricing: PRICING,
  };
}

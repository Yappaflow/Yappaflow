/**
 * DeepSeek Provider (primary)
 *
 * DeepSeek is our main code-generation vendor. Their API is a drop-in
 * OpenAI chat-completions clone — same request/response shapes, same
 * streaming protocol. We point the OpenAI SDK at their base URL and go.
 *
 * Docs: https://api-docs.deepseek.com/
 * Pricing: https://api-docs.deepseek.com/quick_start/pricing
 */

import { env } from "../../config/env";
import type { ProviderConfig } from "./types";

// ── Pricing per 1M tokens (USD) ───────────────────────────────────────
// Source: https://api-docs.deepseek.com/quick_start/pricing
// Last verified: 2026-04-20. Current lineup is DeepSeek-V3.2 only, served
// under two route names: `deepseek-chat` (non-thinking) and
// `deepseek-reasoner` (thinking). Dedicated `deepseek-coder` is no
// longer a separate model — the route was retired when V2.5 unified
// chat + code. We bill at cache-miss rates; DeepSeek also offers a 10×
// cheaper cache-hit rate but we can't predict hit vs miss here.
const PRICING = {
  "deepseek-chat":     { input: 0.28, output: 0.42 },
  "deepseek-reasoner": { input: 0.28, output: 0.42 },
  // Back-compat alias: some callers may still pass "deepseek-coder".
  // DeepSeek transparently routes it to the same V3.2 weights as chat,
  // so we keep the same pricing row for cost estimation.
  "deepseek-coder":    { input: 0.28, output: 0.42 },
} as const;

// DeepSeek V3.2's hard API-level ceiling on `max_tokens`. Requests above
// this are rejected with HTTP 400 "Invalid max_tokens value, the valid
// range of max_tokens is [1, 8192]". Verified against the live API
// 2026-04-20. Do NOT raise this without re-checking DeepSeek's docs.
const DEEPSEEK_MAX_OUTPUT_TOKENS = 8192;

export function getDeepSeekProvider(): ProviderConfig {
  return {
    id:              "deepseek",
    name:            "DeepSeek",
    baseUrl:         env.deepseekBaseUrl,
    apiKey:          env.deepseekApiKey,
    defaultModel:    env.deepseekModel,
    pricing:         PRICING,
    maxOutputTokens: DEEPSEEK_MAX_OUTPUT_TOKENS,
  };
}

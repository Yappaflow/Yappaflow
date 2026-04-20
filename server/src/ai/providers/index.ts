/**
 * Provider Registry
 *
 * Central place to resolve the active provider + fallback chain.
 * Call sites only deal with `ProviderId`s; this module hands back
 * fully-formed `ProviderConfig` objects ready for the OpenAI SDK.
 */

import { env } from "../../config/env";
import { getDeepSeekProvider } from "./deepseek.provider";
import { getOpenRouterProvider } from "./openrouter.provider";
import type { ProviderConfig, ProviderId } from "./types";

export type { ChatMessage, ChatCompletionOptions, ProviderId, ProviderUsage, ProviderConfig } from "./types";

// ── Lookup ────────────────────────────────────────────────────────────

export function getProvider(id: ProviderId): ProviderConfig {
  switch (id) {
    case "deepseek":   return getDeepSeekProvider();
    case "openrouter": return getOpenRouterProvider();
  }
}

/**
 * Ordered list of providers to try for a given call.
 *
 *   1. Caller-supplied chain wins outright (for targeted testing).
 *   2. Otherwise: [primary] plus fallback if it's different + has a key.
 *   3. Providers with empty API keys are filtered out — no point trying
 *      a provider we can't authenticate against.
 *
 * If `minOutputTokens` is supplied, providers that can accommodate it are
 * moved to the front of the chain, and providers that CANNOT are demoted
 * to the back (still retained as last-resort fallback, but no longer
 * preferred). This prevents the "silent truncation" failure mode where
 * DeepSeek's 8k cap produces a half-written Shopify theme that fails
 * Liquid validation downstream — a client asking for 32k output should
 * go to OpenRouter first, not be clamped to 8k and then rejected.
 */
export function resolveProviderChain(
  explicit?: ProviderId[],
  minOutputTokens?: number,
): ProviderConfig[] {
  const providers = explicit && explicit.length > 0
    ? explicit.map(getProvider)
    : buildDefaultChain();

  const keyed = providers.filter((p) => p.apiKey.length > 0);

  if (!minOutputTokens || minOutputTokens <= 0) return keyed;

  // Stable partition: providers that fit the requested output size go first,
  // preserving their original relative order. The rest follow. This keeps
  // the user-expressed provider preference but bubbles up whoever can
  // actually deliver the asked-for output size.
  const fits:    ProviderConfig[] = [];
  const tooSmall: ProviderConfig[] = [];
  for (const p of keyed) {
    if (p.maxOutputTokens >= minOutputTokens) fits.push(p);
    else                                      tooSmall.push(p);
  }
  return [...fits, ...tooSmall];
}

function buildDefaultChain(): ProviderConfig[] {
  const chain: ProviderId[] = [env.aiProvider];
  if (
    env.aiFallbackProvider !== "none" &&
    env.aiFallbackProvider !== env.aiProvider
  ) {
    chain.push(env.aiFallbackProvider);
  }
  return chain.map(getProvider);
}

/** True if at least one provider in the configured chain has credentials. */
export function hasAnyCredentials(): boolean {
  return resolveProviderChain().length > 0;
}

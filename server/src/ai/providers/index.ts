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
 */
export function resolveProviderChain(explicit?: ProviderId[]): ProviderConfig[] {
  if (explicit && explicit.length > 0) {
    return explicit.map(getProvider).filter((p) => p.apiKey.length > 0);
  }

  const chain: ProviderId[] = [env.aiProvider];
  if (
    env.aiFallbackProvider !== "none" &&
    env.aiFallbackProvider !== env.aiProvider
  ) {
    chain.push(env.aiFallbackProvider);
  }

  return chain.map(getProvider).filter((p) => p.apiKey.length > 0);
}

/** True if at least one provider in the configured chain has credentials. */
export function hasAnyCredentials(): boolean {
  return resolveProviderChain().length > 0;
}

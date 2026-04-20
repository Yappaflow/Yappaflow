/**
 * Phase-Model Resolver
 *
 * Yappaflow's AI pipeline has three phases with very different needs.
 * This module resolves "which provider + model should phase X use?" so
 * the rest of the stack can just pass `{ phase: "analyzing" }` and stop
 * caring about the specifics.
 *
 * Phase → purpose:
 *   analyzing  — parse Turkish WhatsApp/IG agency chats into structured
 *                business-identity JSON. Language quality dominates.
 *                Default: Gemini 2.5 Flash Lite on OpenRouter (strong
 *                Turkish, cheap, 1M context).
 *   planning   — turn the JSON blueprint into an architecture plan.
 *                Structured reasoning, language-light. Default:
 *                DeepSeek V3.2 chat.
 *   generating — emit Next.js / Shopify / WP / Webflow / ikas code.
 *                Pure code-gen. Default: DeepSeek V3.2 chat.
 *
 * The resolver degrades gracefully:
 *   1. If the phase's configured provider has an API key → use it.
 *   2. Otherwise → fall back to whatever the global provider chain
 *      returns (which already filters out providers without keys).
 * This means running with only a DEEPSEEK_API_KEY still works end to
 * end — analysis just runs on DeepSeek with slightly weaker Turkish.
 */

import { env } from "../config/env";
import { resolveProviderChain, type ProviderId } from "./providers";

// Phase names — intentionally aligned with AIPhase in ai/types.ts so
// callers can pass their existing phase string through.
export type AIPhaseName = "analyzing" | "planning" | "generating";

export interface PhaseModelChoice {
  /** Ordered provider chain to try. First entry is primary for this phase. */
  providerChain: ProviderId[];
  /** Explicit model override for the first entry in the chain. */
  model:         string;
}

// ── Lookup per-phase env config ──────────────────────────────────────

interface PhaseEnvBlock {
  provider: "deepseek" | "openrouter" | "";
  model:    string;
}

function phaseEnv(phase: AIPhaseName): PhaseEnvBlock {
  switch (phase) {
    case "analyzing":  return { provider: env.aiAnalysisProvider,   model: env.aiAnalysisModel };
    case "planning":   return { provider: env.aiPlanningProvider,   model: env.aiPlanningModel };
    case "generating": return { provider: env.aiGenerationProvider, model: env.aiGenerationModel };
  }
}

// ── Provider-has-key check ───────────────────────────────────────────

function hasKey(id: ProviderId): boolean {
  switch (id) {
    case "deepseek":   return env.deepseekApiKey.length   > 0;
    case "openrouter": return env.openrouterApiKey.length > 0;
  }
}

// ── Resolver ─────────────────────────────────────────────────────────

export function resolveForPhase(phase: AIPhaseName): PhaseModelChoice {
  const { provider: preferred, model: preferredModel } = phaseEnv(phase);
  const globalChain = resolveProviderChain().map((p) => p.id);

  // Case 1: phase has an explicit provider and we hold a key for it.
  if (preferred && hasKey(preferred as ProviderId)) {
    const chain: ProviderId[] = [preferred as ProviderId];
    // Append any other providers from the global chain as a safety net.
    for (const id of globalChain) {
      if (id !== preferred && !chain.includes(id)) chain.push(id);
    }
    return { providerChain: chain, model: preferredModel };
  }

  // Case 2: no preferred provider, or its key is missing. Fall back to
  // the global chain + that provider's default model.
  //
  // IMPORTANT: we cannot reuse `preferredModel` here — model IDs are
  // provider-scoped. Handing DeepSeek a Gemini model string like
  // "google/gemini-2.5-flash-lite" would fail with a 400. Always pair
  // the fallback provider with ITS OWN default model.
  //
  // The first provider in `globalChain` is guaranteed to have a key
  // (that's what resolveProviderChain filters on) — unless we're in
  // mock mode, in which case the chain is empty and the openai-client
  // layer short-circuits before we're called.
  const fallbackProvider = globalChain[0] ?? "deepseek";
  const fallbackModel =
    fallbackProvider === "deepseek"   ? env.deepseekModel   :
    fallbackProvider === "openrouter" ? env.openrouterModel :
    env.deepseekModel;

  return {
    providerChain: globalChain.length > 0 ? globalChain : ["deepseek"],
    model:         fallbackModel,
  };
}

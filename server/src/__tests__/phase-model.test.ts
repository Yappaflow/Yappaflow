/**
 * Tests for the per-phase model resolver.
 *
 * These exercise the three env scenarios we expect in production:
 *   1. Both DeepSeek + OpenRouter keys set          → primary/fallback chain
 *   2. Only DeepSeek key set                         → everything falls to DeepSeek
 *   3. Only OpenRouter key set                       → everything falls to OpenRouter
 *
 * We mock the `env` module directly because the real module reads
 * process.env at import time via dotenv, which makes runtime mutation
 * unreliable once the module is cached.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// Helper: load a fresh copy of the resolver with a stubbed env module.
async function loadResolver(envOverrides: Partial<Record<string, any>>) {
  vi.resetModules();
  vi.doMock("../config/env", () => ({
    env: {
      // Sensible defaults matching our real env.ts shape.
      aiProvider:           "deepseek",
      aiFallbackProvider:   "openrouter",
      aiAnalysisProvider:   "openrouter",
      aiAnalysisModel:      "google/gemini-2.5-flash-lite",
      aiPlanningProvider:   "deepseek",
      aiPlanningModel:      "deepseek-chat",
      aiGenerationProvider: "deepseek",
      aiGenerationModel:    "deepseek-chat",
      deepseekApiKey:       "",
      deepseekBaseUrl:      "https://api.deepseek.com/v1",
      deepseekModel:        "deepseek-chat",
      openrouterApiKey:     "",
      openrouterBaseUrl:    "https://openrouter.ai/api/v1",
      openrouterModel:      "google/gemini-2.5-flash-lite",
      openrouterReferer:    "https://yappaflow.app",
      openrouterAppTitle:   "Yappaflow",
      ...envOverrides,
    },
  }));
  return await import("../ai/phase-model");
}

describe("resolveForPhase", () => {
  beforeEach(() => vi.resetModules());

  it("routes analysis to OpenRouter (Gemini) when both keys are set", async () => {
    const { resolveForPhase } = await loadResolver({
      deepseekApiKey:   "sk-ds",
      openrouterApiKey: "sk-or",
    });

    const r = resolveForPhase("analyzing");
    expect(r.providerChain[0]).toBe("openrouter");
    expect(r.providerChain).toContain("deepseek");   // safety-net fallback
    expect(r.model).toBe("google/gemini-2.5-flash-lite");
  });

  it("routes planning to DeepSeek when both keys are set", async () => {
    const { resolveForPhase } = await loadResolver({
      deepseekApiKey:   "sk-ds",
      openrouterApiKey: "sk-or",
    });

    const r = resolveForPhase("planning");
    expect(r.providerChain[0]).toBe("deepseek");
    expect(r.model).toBe("deepseek-chat");
  });

  it("routes generation to DeepSeek when both keys are set", async () => {
    const { resolveForPhase } = await loadResolver({
      deepseekApiKey:   "sk-ds",
      openrouterApiKey: "sk-or",
    });

    const r = resolveForPhase("generating");
    expect(r.providerChain[0]).toBe("deepseek");
    expect(r.model).toBe("deepseek-chat");
  });

  it("falls back to DeepSeek for every phase when OpenRouter key is absent", async () => {
    const { resolveForPhase } = await loadResolver({
      deepseekApiKey:   "sk-ds",
      openrouterApiKey: "",
    });

    for (const phase of ["analyzing", "planning", "generating"] as const) {
      const r = resolveForPhase(phase);
      expect(r.providerChain[0]).toBe("deepseek");
      expect(r.providerChain).not.toContain("openrouter");
    }
  });

  // Regression: analysis phase configures a Gemini model, but if
  // OpenRouter has no key we must swap to DeepSeek's model — NOT
  // forward the Gemini model ID to DeepSeek (which would 400).
  it("swaps model-ID to the fallback provider's default when phase provider is unreachable", async () => {
    const { resolveForPhase } = await loadResolver({
      deepseekApiKey:   "sk-ds",
      openrouterApiKey: "",
    });

    const r = resolveForPhase("analyzing");
    expect(r.providerChain[0]).toBe("deepseek");
    expect(r.model).toBe("deepseek-chat");
    expect(r.model).not.toContain("gemini");
  });

  it("routes everything to OpenRouter when DeepSeek key is absent", async () => {
    const { resolveForPhase } = await loadResolver({
      deepseekApiKey:   "",
      openrouterApiKey: "sk-or",
    });

    for (const phase of ["analyzing", "planning", "generating"] as const) {
      const r = resolveForPhase(phase);
      expect(r.providerChain[0]).toBe("openrouter");
      expect(r.providerChain).not.toContain("deepseek");
    }
  });
});

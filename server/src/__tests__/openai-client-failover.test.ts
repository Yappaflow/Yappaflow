/**
 * Tests for the OpenAI-compatible client's failover behavior.
 *
 * Motivation: production hit `DeepSeek API error: 402 Insufficient
 * Balance` and threw without failing over to OpenRouter. These tests
 * lock in the expected behavior so the regression can't return:
 *
 *   - 402 on DeepSeek → `insufficient_balance` code, NOT retried on the
 *     same provider, DOES fail over to OpenRouter.
 *   - "Insufficient Balance" in the message (any status) → same.
 *   - 402 on every provider in the chain → final error still surfaces
 *     `insufficient_balance` so the UI can show an actionable message.
 *   - 500 → retried on the same provider, then fails over.
 *   - 401 → NOT retried, fails over immediately.
 *
 * We mock the `openai` package at the module level so we can return
 * scripted status codes per call without any network IO.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// Script drives the mocked OpenAI.create() — each call consumes one entry.
type Script = Array<{ throw?: { status?: number; message: string; code?: string }; ok?: string }>;

let script: Script = [];
const createSpy = vi.fn();

// Mock the openai SDK BEFORE importing the client module.
vi.mock("openai", () => {
  class MockOpenAI {
    chat = {
      completions: {
        create: (...args: any[]) => {
          createSpy(...args);
          const step = script.shift();
          if (!step) throw new Error("Script exhausted");
          if (step.throw) {
            const err: any = new Error(step.throw.message);
            if (step.throw.status !== undefined) err.status = step.throw.status;
            if (step.throw.code !== undefined) err.code = step.throw.code;
            throw err;
          }
          return Promise.resolve({
            choices: [{ message: { content: step.ok ?? "" } }],
            usage:   { prompt_tokens: 10, completion_tokens: 20 },
          });
        },
      },
    };
  }
  return { default: MockOpenAI };
});

// Helper: load a fresh client with both provider keys set so the chain
// has two hops (DeepSeek first, OpenRouter second).
async function loadClient(envOverrides: Partial<Record<string, any>> = {}) {
  vi.resetModules();
  script = [];
  createSpy.mockClear();
  vi.doMock("../config/env", () => ({
    env: {
      aiProvider:           "deepseek",
      aiFallbackProvider:   "openrouter",
      aiAnalysisProvider:   "openrouter",
      aiAnalysisModel:      "google/gemini-2.5-flash-lite",
      aiPlanningProvider:   "deepseek",
      aiPlanningModel:      "deepseek-chat",
      aiGenerationProvider: "deepseek",
      aiGenerationModel:    "deepseek-chat",
      aiMaxTokens:          4096,
      aiTemperature:        0.7,
      aiMockMode:           false,
      deepseekApiKey:       "sk-deepseek-test",
      deepseekBaseUrl:      "https://api.deepseek.com/v1",
      deepseekModel:        "deepseek-chat",
      openrouterApiKey:     "sk-openrouter-test",
      openrouterBaseUrl:    "https://openrouter.ai/api/v1",
      openrouterModel:      "google/gemini-2.5-flash-lite",
      openrouterReferer:    "https://yappaflow.app",
      openrouterAppTitle:   "Yappaflow",
      ...envOverrides,
    },
  }));
  const mod = await import("../ai/openai-client");
  mod.resetClientCache();
  return mod;
}

describe("createChatCompletion — provider failover on 402", () => {
  beforeEach(() => {
    vi.resetModules();
    script = [];
    createSpy.mockClear();
  });

  it("fails over from DeepSeek → OpenRouter when DeepSeek returns 402", async () => {
    const { createChatCompletion } = await loadClient();

    // DeepSeek 402 on first attempt, OpenRouter succeeds.
    script = [
      { throw: { status: 402, message: "402 Insufficient Balance" } },
      { ok: "hello from openrouter" },
    ];

    const result = await createChatCompletion("sys", [{ role: "user", content: "hi" }]);
    expect(result.text).toBe("hello from openrouter");
    // Exactly two SDK calls — no wasted internal retries on DeepSeek.
    expect(createSpy).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry the same provider 3× on insufficient balance", async () => {
    const { createChatCompletion, YappaflowAIError } = await loadClient({
      // Only DeepSeek configured → no failover target.
      openrouterApiKey: "",
    });

    script = [
      { throw: { status: 402, message: "402 Insufficient Balance" } },
    ];

    await expect(
      createChatCompletion("sys", [{ role: "user", content: "hi" }])
    ).rejects.toBeInstanceOf(YappaflowAIError);

    // Single call — the classifier short-circuits the internal retry loop.
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it("detects 'Insufficient Balance' in the message body even without a 402 status", async () => {
    // Some proxies rewrap the status; make sure we still catch the phrase.
    const { createChatCompletion } = await loadClient();

    script = [
      { throw: { status: 400, message: "Insufficient Balance" } },
      { ok: "ok from openrouter" },
    ];

    const result = await createChatCompletion("sys", [{ role: "user", content: "hi" }]);
    expect(result.text).toBe("ok from openrouter");
    expect(createSpy).toHaveBeenCalledTimes(2);
  });

  it("surfaces insufficient_balance code when the entire chain is broke", async () => {
    const { createChatCompletion, YappaflowAIError } = await loadClient();

    // Both providers are out of balance.
    script = [
      { throw: { status: 402, message: "Insufficient Balance" } },
      { throw: { status: 402, message: "insufficient_quota" } },
    ];

    try {
      await createChatCompletion("sys", [{ role: "user", content: "hi" }]);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(YappaflowAIError);
      const yErr = err as InstanceType<typeof YappaflowAIError>;
      expect(yErr.code).toBe("insufficient_balance");
      // The surfaced message names both providers' billing pages so the
      // user can act without digging into stack traces.
      expect(yErr.message.toLowerCase()).toContain("top up");
    }
  });

  it("treats 401 like insufficient_balance: no retry, immediate failover", async () => {
    const { createChatCompletion } = await loadClient();

    script = [
      { throw: { status: 401, message: "Invalid API key" } },
      { ok: "ok from openrouter" },
    ];

    const result = await createChatCompletion("sys", [{ role: "user", content: "hi" }]);
    expect(result.text).toBe("ok from openrouter");
    expect(createSpy).toHaveBeenCalledTimes(2);
  });

  it("retries 500 internally on the same provider before failing over", async () => {
    const { createChatCompletion } = await loadClient();

    // DeepSeek flaps once on 500, recovers on retry #2 — no failover.
    script = [
      { throw: { status: 500, message: "internal error" } },
      { ok: "recovered on retry" },
    ];

    const result = await createChatCompletion("sys", [{ role: "user", content: "hi" }]);
    expect(result.text).toBe("recovered on retry");
    // Both calls were on DeepSeek (same provider, retried internally).
    expect(createSpy).toHaveBeenCalledTimes(2);
  });
});

/**
 * Services like the Shopify/WordPress generators request up to 32k
 * output tokens, but DeepSeek V3.2's hard API ceiling is 8192 — passing
 * anything higher gets a 400 "Invalid max_tokens value". The client is
 * supposed to silently clamp to the provider's maxOutputTokens so the
 * call succeeds (possibly truncated) instead of failing at the edge.
 */
describe("createChatCompletion — per-provider max_tokens clamping", () => {
  beforeEach(() => {
    vi.resetModules();
    script = [];
    createSpy.mockClear();
  });

  it("clamps 32000 → 8192 when calling DeepSeek", async () => {
    const { createChatCompletion } = await loadClient({
      // Only DeepSeek configured so we know which provider the call hits.
      openrouterApiKey: "",
    });
    script = [{ ok: "ok" }];

    await createChatCompletion("sys", [{ role: "user", content: "hi" }], {
      maxTokens: 32_000,
    });

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy.mock.calls[0][0].max_tokens).toBe(8192);
  });

  it("leaves requested max_tokens untouched when already below the ceiling", async () => {
    const { createChatCompletion } = await loadClient({ openrouterApiKey: "" });
    script = [{ ok: "ok" }];

    await createChatCompletion("sys", [{ role: "user", content: "hi" }], {
      maxTokens: 4000,
    });

    expect(createSpy.mock.calls[0][0].max_tokens).toBe(4000);
  });

  it("clamps for OpenRouter only when the request exceeds OpenRouter's own ceiling", async () => {
    // Force the call to OpenRouter by leaving DeepSeek without a key.
    const { createChatCompletion } = await loadClient({
      deepseekApiKey: "",
    });

    // 20k is well under OpenRouter's 32k ceiling — should pass through.
    script = [{ ok: "under-cap" }];
    await createChatCompletion("sys", [{ role: "user", content: "hi" }], {
      maxTokens: 20_000,
    });
    expect(createSpy.mock.calls[0][0].max_tokens).toBe(20_000);

    // 100k exceeds even OpenRouter's conservative 32k ceiling — clamp.
    createSpy.mockClear();
    script = [{ ok: "over-cap" }];
    await createChatCompletion("sys", [{ role: "user", content: "hi" }], {
      maxTokens: 100_000,
    });
    expect(createSpy.mock.calls[0][0].max_tokens).toBe(32_000);
  });
});

/**
 * Real bug this locks in: the Shopify theme generator asks for 32k
 * output. With DeepSeek primary (8k cap), the original chain would hit
 * DeepSeek first, silently clamp 32k → 8k, and return a truncated Liquid
 * file that blew up validation with `LiquidBundleValidationError at col
 * 4523`. The capacity-aware partition in `resolveProviderChain` is
 * supposed to demote any provider whose ceiling is below the requested
 * size, so the caller's first hop is a provider that can actually
 * deliver.
 *
 * These tests verify the partition kicks in when (and only when) the
 * caller signals a large output — small requests should still follow the
 * configured primary (DeepSeek) to keep the cheap path cheap.
 */
describe("createChatCompletion — capacity-aware provider routing", () => {
  beforeEach(() => {
    vi.resetModules();
    script = [];
    createSpy.mockClear();
  });

  it("routes a 32k request to OpenRouter first, skipping DeepSeek's 8k cap", async () => {
    const { createChatCompletion } = await loadClient();
    script = [{ ok: "full-size from openrouter" }];

    const result = await createChatCompletion(
      "sys",
      [{ role: "user", content: "hi" }],
      { maxTokens: 32_000 },
    );

    expect(result.text).toBe("full-size from openrouter");
    // Exactly one SDK call — DeepSeek was bypassed, not tried-and-failed.
    expect(createSpy).toHaveBeenCalledTimes(1);
    // The call landed on OpenRouter's model, not DeepSeek's.
    expect(createSpy.mock.calls[0][0].model).toBe("google/gemini-2.5-flash-lite");
    // And the max_tokens survived intact (no clamp needed — OpenRouter fits).
    expect(createSpy.mock.calls[0][0].max_tokens).toBe(32_000);
  });

  it("still uses DeepSeek first for small requests that fit both providers", async () => {
    const { createChatCompletion } = await loadClient();
    script = [{ ok: "cheap path" }];

    await createChatCompletion(
      "sys",
      [{ role: "user", content: "hi" }],
      { maxTokens: 4000 },
    );

    // A 4k request fits DeepSeek's 8k ceiling — don't bypass the cheap
    // provider just because OpenRouter also has a key.
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy.mock.calls[0][0].model).toBe("deepseek-chat");
  });

  it("falls back to a too-small provider only if no larger one is available", async () => {
    // No OpenRouter key → DeepSeek is the only option even for 32k.
    // We should still try it (truncation beats total failure) rather
    // than refusing to call at all.
    const { createChatCompletion } = await loadClient({
      openrouterApiKey: "",
    });
    script = [{ ok: "clamped but succeeded" }];

    await createChatCompletion(
      "sys",
      [{ role: "user", content: "hi" }],
      { maxTokens: 32_000 },
    );

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy.mock.calls[0][0].model).toBe("deepseek-chat");
    // max_tokens clamped to DeepSeek's 8192 hard ceiling.
    expect(createSpy.mock.calls[0][0].max_tokens).toBe(8192);
  });
});

/**
 * Real bug this locks in: capacity-aware routing sent a 32k Shopify
 * request to OpenRouter, but the caller (phase resolver) had already
 * chosen `model: "deepseek-chat"` — a DeepSeek-native name. OpenRouter
 * fuzzy-matched it across its catalog and 400'd with:
 *
 *   "Model ID 'deepseek-chat' is ambiguous — it matches multiple models:
 *    deepseek/deepseek-chat, deepseek/deepseek-chat-v2.5."
 *
 * The client must detect that the requested model doesn't match the
 * provider it's about to hit and swap to that provider's default rather
 * than send an invalid ID. Same risk in reverse — if a caller asks for
 * `google/gemini-2.5-flash-lite` and the chain lands on DeepSeek,
 * DeepSeek would 400 with "model not found".
 */
describe("createChatCompletion — per-provider model normalization", () => {
  beforeEach(() => {
    vi.resetModules();
    script = [];
    createSpy.mockClear();
  });

  it("swaps DeepSeek-native name for OpenRouter's default when chain pivots to OpenRouter", async () => {
    // 32k request → capacity-aware routing picks OpenRouter first.
    // Caller asks for 'deepseek-chat' (DeepSeek bare name).
    // OpenRouter should receive its own default model instead.
    const { createChatCompletion } = await loadClient();
    script = [{ ok: "ok on openrouter" }];

    await createChatCompletion(
      "sys",
      [{ role: "user", content: "hi" }],
      { model: "deepseek-chat", maxTokens: 32_000 },
    );

    expect(createSpy).toHaveBeenCalledTimes(1);
    // NOT the caller-supplied 'deepseek-chat' — swapped to OpenRouter's default.
    expect(createSpy.mock.calls[0][0].model).toBe("google/gemini-2.5-flash-lite");
  });

  it("swaps OpenRouter-namespaced name for DeepSeek's default when call lands on DeepSeek", async () => {
    // Only DeepSeek has a key, so the call must land on DeepSeek even if
    // the caller passes an OpenRouter-namespaced model.
    const { createChatCompletion } = await loadClient({
      openrouterApiKey: "",
    });
    script = [{ ok: "ok on deepseek" }];

    await createChatCompletion(
      "sys",
      [{ role: "user", content: "hi" }],
      { model: "google/gemini-2.5-flash-lite" },
    );

    expect(createSpy).toHaveBeenCalledTimes(1);
    // Swapped to DeepSeek's default because the namespaced ID would 400.
    expect(createSpy.mock.calls[0][0].model).toBe("deepseek-chat");
  });

  it("passes caller-supplied model through when it matches the provider's namespace convention", async () => {
    // Caller asks for a valid OpenRouter model and we land on OpenRouter
    // (DeepSeek has no key) — model should pass through untouched.
    const { createChatCompletion } = await loadClient({
      deepseekApiKey: "",
    });
    script = [{ ok: "ok" }];

    await createChatCompletion(
      "sys",
      [{ role: "user", content: "hi" }],
      { model: "qwen/qwen-2.5-coder-32b-instruct" },
    );

    expect(createSpy.mock.calls[0][0].model).toBe("qwen/qwen-2.5-coder-32b-instruct");
  });

  it("failover from DeepSeek 402 → OpenRouter swaps the model too", async () => {
    // The original regression: DeepSeek 402s, chain fails over to
    // OpenRouter, but the caller-supplied DeepSeek model was being
    // carried across → 400 ambiguous. Verify both calls use the right
    // per-provider model.
    const { createChatCompletion } = await loadClient();
    script = [
      { throw: { status: 402, message: "Insufficient Balance" } },
      { ok: "recovered on openrouter" },
    ];

    const result = await createChatCompletion(
      "sys",
      [{ role: "user", content: "hi" }],
      { model: "deepseek-chat" },
    );

    expect(result.text).toBe("recovered on openrouter");
    expect(createSpy).toHaveBeenCalledTimes(2);
    // First attempt: DeepSeek with the DeepSeek-native name.
    expect(createSpy.mock.calls[0][0].model).toBe("deepseek-chat");
    // Second attempt: OpenRouter, model swapped to its own default.
    expect(createSpy.mock.calls[1][0].model).toBe("google/gemini-2.5-flash-lite");
  });
});

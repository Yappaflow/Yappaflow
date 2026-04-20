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
    // Large output → routed to OpenRouter's large-context model
    // (not the small-analysis default which has a 32k endpoint cap).
    // Llama 3.3 70B carries a uniform 131k context across all OpenRouter
    // upstreams, which is why we pick it over Qwen Coder (whose 128k
    // advertised context needs YaRN, not enabled on every upstream).
    expect(createSpy.mock.calls[0][0].model).toBe("meta-llama/llama-3.3-70b-instruct");
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

  it("swaps DeepSeek-native name for OpenRouter's large-context model on big requests", async () => {
    // 32k request → capacity-aware routing picks OpenRouter first.
    // Caller asks for 'deepseek-chat' (DeepSeek bare name).
    // On large outputs OpenRouter must swap to its large-context model
    // (Llama 3.3 70B, uniform 131k context), not the small analysis
    // default — the analysis default's upstream endpoint caps at 32k
    // total context and breaks on big generations.
    const { createChatCompletion } = await loadClient();
    script = [{ ok: "ok on openrouter" }];

    await createChatCompletion(
      "sys",
      [{ role: "user", content: "hi" }],
      { model: "deepseek-chat", maxTokens: 32_000 },
    );

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy.mock.calls[0][0].model).toBe("meta-llama/llama-3.3-70b-instruct");
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
    // per-provider model. Use small maxTokens so the swap lands on the
    // small-analysis default (not the large-context model).
    const { createChatCompletion } = await loadClient();
    script = [
      { throw: { status: 402, message: "Insufficient Balance" } },
      { ok: "recovered on openrouter" },
    ];

    const result = await createChatCompletion(
      "sys",
      [{ role: "user", content: "hi" }],
      { model: "deepseek-chat", maxTokens: 4000 },
    );

    expect(result.text).toBe("recovered on openrouter");
    expect(createSpy).toHaveBeenCalledTimes(2);
    // First attempt: DeepSeek with the DeepSeek-native name.
    expect(createSpy.mock.calls[0][0].model).toBe("deepseek-chat");
    // Second attempt: OpenRouter, small maxTokens → analysis default.
    expect(createSpy.mock.calls[1][0].model).toBe("google/gemini-2.5-flash-lite");
  });
});

/**
 * Lock in the large-output routing rule. Production hit:
 *
 *   "This endpoint's maximum context length is 32768 tokens. However,
 *    you requested about 59537 tokens (27537 of text input, 32000 in
 *    the output)."
 *
 * The call went to Gemini Flash Lite on OpenRouter. Flash Lite
 * advertises 1M context but OpenRouter routes to upstream endpoints
 * that may cap at 32k total. A Shopify theme generation (~27k input,
 * ~32k output) can't fit. The fix: when the caller asks for a
 * generation-size output, route to a model whose OpenRouter endpoints
 * carry a uniform 131k context across every upstream (Llama 3.3 70B —
 * the 131k is part of the base model, not a per-endpoint add-on).
 */
describe("createChatCompletion — large-output routing on OpenRouter", () => {
  beforeEach(() => {
    vi.resetModules();
    script = [];
    createSpy.mockClear();
  });

  it("analysis-size call (4k) uses the small default on OpenRouter", async () => {
    const { createChatCompletion } = await loadClient({ deepseekApiKey: "" });
    script = [{ ok: "ok" }];

    await createChatCompletion(
      "sys",
      [{ role: "user", content: "hi" }],
      { maxTokens: 4000 },
    );

    expect(createSpy.mock.calls[0][0].model).toBe("google/gemini-2.5-flash-lite");
  });

  it("generation-size call (16k+) uses the large-context model on OpenRouter", async () => {
    const { createChatCompletion } = await loadClient({ deepseekApiKey: "" });
    script = [{ ok: "ok" }];

    await createChatCompletion(
      "sys",
      [{ role: "user", content: "hi" }],
      { maxTokens: 16_000 },
    );

    expect(createSpy.mock.calls[0][0].model).toBe("meta-llama/llama-3.3-70b-instruct");
  });

  it("caller-supplied OpenRouter model survives even on a big request", async () => {
    // If the caller explicitly picks a non-default OpenRouter model
    // (namespaced), we respect it rather than silently swapping — they
    // may have reasons we don't know (cost, latency, specific model
    // quirks). Qwen 72B here stands in for "any non-default choice"; the
    // provider's own largeOutputModel (Llama 3.3 70B) would be vacuous
    // to test since the upgrade branch would pick it anyway.
    const { createChatCompletion } = await loadClient({ deepseekApiKey: "" });
    script = [{ ok: "ok" }];

    await createChatCompletion(
      "sys",
      [{ role: "user", content: "hi" }],
      {
        model: "qwen/qwen-2.5-72b-instruct",
        maxTokens: 32_000,
      },
    );

    expect(createSpy.mock.calls[0][0].model).toBe("qwen/qwen-2.5-72b-instruct");
  });

  it("upgrades explicit OpenRouter default model to large-context model on big requests", async () => {
    // Production case we hit: env set AI_GENERATION_PROVIDER=openrouter
    // so the phase resolver returned
    //   { providerChain: ["openrouter"], model: "google/gemini-2.5-flash-lite" }
    // directly. The namespace was correct, so the namespace-mismatch
    // branch didn't fire, and we sent the huge request to Flash Lite —
    // whose OpenRouter upstream endpoint caps combined context at 32k,
    // 400ing on "maximum context length is 32768 tokens".
    //
    // The upgrade branch must catch this: if the caller lands on the
    // provider's SMALL default with a generation-size output, promote.
    const { createChatCompletion } = await loadClient({ deepseekApiKey: "" });
    script = [{ ok: "upgraded" }];

    await createChatCompletion(
      "sys",
      [{ role: "user", content: "hi" }],
      {
        model:     "google/gemini-2.5-flash-lite",
        maxTokens: 32_000,
      },
    );

    expect(createSpy).toHaveBeenCalledTimes(1);
    // Upgraded away from the default even though caller named it.
    expect(createSpy.mock.calls[0][0].model).toBe("meta-llama/llama-3.3-70b-instruct");
  });

  it("DeepSeek-native model on a big request → swapped to the large-context model on OpenRouter", async () => {
    // This is the exact prod scenario. Shopify generator asks for
    // model="deepseek-chat" and maxTokens=32000. Capacity-aware
    // routing picks OpenRouter. The bare "deepseek-chat" name is
    // invalid on OpenRouter AND the request is generation-sized, so we
    // should land on the large-context model (Llama 3.3 70B) — not the
    // ambiguous-name-error path.
    const { createChatCompletion } = await loadClient();
    script = [{ ok: "theme bundle" }];

    const result = await createChatCompletion(
      "sys",
      [{ role: "user", content: "hi" }],
      { model: "deepseek-chat", maxTokens: 32_000 },
    );

    expect(result.text).toBe("theme bundle");
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy.mock.calls[0][0].model).toBe("meta-llama/llama-3.3-70b-instruct");
    expect(createSpy.mock.calls[0][0].max_tokens).toBe(32_000);
  });
});

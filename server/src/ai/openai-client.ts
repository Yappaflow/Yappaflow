/**
 * OpenAI-Compatible Client (DeepSeek primary, OpenRouter fallback)
 *
 * This is the new entry point for every AI call in Yappaflow. Both
 * DeepSeek and OpenRouter speak the OpenAI chat-completions protocol,
 * so we use the official `openai` npm package and swap `baseURL` +
 * `apiKey` per provider.
 *
 * Responsibilities:
 *   - Streaming + non-streaming chat completions
 *   - Per-provider retry with exponential backoff on transient errors
 *   - Auto-failover from primary → fallback provider on hard errors
 *   - Cost estimation per model
 *   - Mock mode (no credentials required) that reuses the existing
 *     mock-data bank so the rest of the stack stays unchanged
 *
 * Design notes:
 *   - We deliberately type the `openai` client as `any` on the SDK
 *     surface to insulate us from minor shape changes across major
 *     versions; the hot fields we read (`choices`, `usage`, `delta`)
 *     have been stable for years.
 *   - YappaflowAIError semantics are preserved so existing error
 *     handling in services/routes continues to work.
 */

import OpenAI from "openai";
import { env } from "../config/env";
import { log } from "../utils/logger";
import {
  resolveProviderChain,
  type ChatCompletionOptions,
  type ChatMessage,
  type ProviderConfig,
  type ProviderUsage,
} from "./providers";
import type { AIUsageMetrics } from "./types";
import {
  MOCK_ANALYSIS,
  MOCK_PLAN,
  MOCK_GENERATED_CODE,
  MOCK_IDENTITY,
  MOCK_STATIC_SITE,
  simulateStreaming,
} from "./mock-data";
import {
  MOCK_SHOPIFY_BUNDLE,
  MOCK_WEBFLOW_BUNDLE,
  MOCK_WORDPRESS_BUNDLE,
  MOCK_IKAS_BUNDLE,
} from "./mock-bundles";

// ── Error class (kept compatible with existing callers) ──────────────

export class YappaflowAIError extends Error {
  constructor(
    message: string,
    public code:
      | "missing_api_key"
      | "rate_limit"
      | "auth_error"
      | "insufficient_balance"
      | "api_error"
      | "parse_error",
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "YappaflowAIError";
  }
}

// ── Mock mode check ───────────────────────────────────────────────────

export function isMockMode(): boolean {
  return env.aiMockMode;
}

// ── OpenAI client cache (one per provider, re-used) ──────────────────

const clientCache = new Map<string, OpenAI>();

function getClient(provider: ProviderConfig): OpenAI {
  const cached = clientCache.get(provider.id);
  if (cached) return cached;

  const client = new OpenAI({
    apiKey:         provider.apiKey,
    baseURL:        provider.baseUrl,
    defaultHeaders: provider.headers,
  });
  clientCache.set(provider.id, client);
  return client;
}

/** Test hook — callers rebuild the OpenAI instance after env mutation. */
export function resetClientCache(): void {
  clientCache.clear();
  clampWarnCache.clear();
  modelSwapWarnCache.clear();
}

// ── Cost estimation ───────────────────────────────────────────────────

export function estimateCost(
  inputTokens:  number,
  outputTokens: number,
  model:        string,
  provider:     ProviderConfig
): number {
  const rates = provider.pricing[model];
  if (!rates) return 0;
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

// ── Normalise usage into the legacy metrics shape ────────────────────

function toLegacyUsage(u: ProviderUsage): AIUsageMetrics {
  return {
    inputTokens:  u.inputTokens,
    outputTokens: u.outputTokens,
    totalCost:    u.totalCost,
    model:        u.model,
    latencyMs:    u.latencyMs,
  };
}

// ── Non-streaming chat completion ────────────────────────────────────

export async function createChatCompletion(
  systemPrompt: string,
  messages:     ChatMessage[],
  options?:     ChatCompletionOptions
): Promise<{ text: string; usage: AIUsageMetrics; rawUsage: ProviderUsage }> {
  if (isMockMode()) {
    const mock = pickMockResponse(systemPrompt);
    return { text: mock.text, usage: toLegacyUsage(mock.usage), rawUsage: mock.usage };
  }

  // Capacity-aware routing: if the caller asks for more output tokens
  // than a provider can physically deliver, we'd rather start on a
  // provider that fits. Otherwise we risk a silently-truncated response
  // (e.g. DeepSeek caps at 8k; a 32k Shopify theme request comes back as
  // a half-written Liquid file that fails validation downstream).
  const chain = resolveProviderChain(options?.providerChain, options?.maxTokens);
  if (chain.length === 0) {
    throw new YappaflowAIError(
      "No AI provider is configured. Set DEEPSEEK_API_KEY or OPENROUTER_API_KEY in your .env file.",
      "missing_api_key"
    );
  }

  let lastError: Error | null = null;

  for (const provider of chain) {
    try {
      const result = await callOnce(provider, systemPrompt, messages, options);
      return result;
    } catch (err) {
      lastError = err as Error;
      if (err instanceof YappaflowAIError && err.code === "auth_error") {
        // Bad key is specific to this provider — try next one.
        log(`[AI] ${provider.name} auth failed, trying next provider`);
        continue;
      }
      if (err instanceof YappaflowAIError && err.code === "insufficient_balance") {
        // Empty wallet is provider-specific — the next provider has its own.
        log(`[AI] ${provider.name} out of balance, failing over to next provider`);
        continue;
      }
      if (err instanceof YappaflowAIError && err.retryable) {
        log(`[AI] ${provider.name} retryable failure, failing over`);
        continue;
      }
      // Non-retryable error — rethrow immediately.
      throw err;
    }
  }

  throw buildTerminalError(lastError, chain.length);
}

// ── One attempt against one provider, with internal retries ──────────

async function callOnce(
  provider:     ProviderConfig,
  systemPrompt: string,
  messages:     ChatMessage[],
  options?:     ChatCompletionOptions
): Promise<{ text: string; usage: AIUsageMetrics; rawUsage: ProviderUsage }> {
  const model       = resolveModel(provider, options?.model);
  const maxTokens   = clampMaxTokens(provider, options?.maxTokens ?? env.aiMaxTokens);
  const temperature = options?.temperature ?? env.aiTemperature;

  const client = getClient(provider);
  const startTime = Date.now();

  let lastErr: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      });

      const choice = response.choices?.[0];
      const text   = choice?.message?.content ?? "";
      const inputTokens  = response.usage?.prompt_tokens     ?? 0;
      const outputTokens = response.usage?.completion_tokens ?? 0;

      const rawUsage: ProviderUsage = {
        inputTokens,
        outputTokens,
        totalCost: estimateCost(inputTokens, outputTokens, model, provider),
        model,
        provider:  provider.id,
        latencyMs: Date.now() - startTime,
      };

      log(`[AI] ${provider.name}/${model} · in=${inputTokens} out=${outputTokens} · $${rawUsage.totalCost.toFixed(4)} · ${rawUsage.latencyMs}ms`);

      return { text, usage: toLegacyUsage(rawUsage), rawUsage };
    } catch (err) {
      lastErr = err;
      const classified = classifyError(err, provider);
      // Don't burn retries on errors where retrying the same provider
      // cannot possibly help (bad key, empty wallet).
      if (classified.code === "auth_error" || classified.code === "insufficient_balance") throw classified;
      if (attempt < 2 && classified.retryable) {
        await sleep(backoff(attempt));
        continue;
      }
      throw classified;
    }
  }

  throw new YappaflowAIError(
    `${provider.name} failed after 3 attempts: ${(lastErr as Error)?.message || "unknown"}`,
    "api_error",
    true
  );
}

// ── Streaming chat completion ────────────────────────────────────────

export async function createStreamingChatCompletion(
  systemPrompt: string,
  messages:     ChatMessage[],
  onChunk:      (text: string) => void,
  options?:     ChatCompletionOptions
): Promise<{ text: string; usage: AIUsageMetrics; rawUsage: ProviderUsage }> {
  if (isMockMode()) {
    const mock = pickMockResponse(systemPrompt);
    log("[AI MOCK] streaming mock response");
    await simulateStreaming(mock.text, onChunk);
    return { text: mock.text, usage: toLegacyUsage(mock.usage), rawUsage: mock.usage };
  }

  // Same capacity-aware routing as the non-streaming path — prefer a
  // provider that can actually fit the requested output size before
  // falling back to smaller-capacity providers.
  const chain = resolveProviderChain(options?.providerChain, options?.maxTokens);
  if (chain.length === 0) {
    throw new YappaflowAIError(
      "No AI provider is configured. Set DEEPSEEK_API_KEY or OPENROUTER_API_KEY in your .env file.",
      "missing_api_key"
    );
  }

  let lastError: Error | null = null;

  for (const provider of chain) {
    try {
      return await streamOnce(provider, systemPrompt, messages, onChunk, options);
    } catch (err) {
      lastError = err as Error;
      if (err instanceof YappaflowAIError && err.code === "auth_error") {
        log(`[AI] ${provider.name} auth failed on stream, trying next provider`);
        continue;
      }
      if (err instanceof YappaflowAIError && err.code === "insufficient_balance") {
        log(`[AI] ${provider.name} out of balance on stream, failing over to next provider`);
        continue;
      }
      if (err instanceof YappaflowAIError && err.retryable) {
        log(`[AI] ${provider.name} retryable stream failure, failing over`);
        continue;
      }
      throw err;
    }
  }

  throw buildTerminalError(lastError, chain.length);
}

async function streamOnce(
  provider:     ProviderConfig,
  systemPrompt: string,
  messages:     ChatMessage[],
  onChunk:      (text: string) => void,
  options?:     ChatCompletionOptions
): Promise<{ text: string; usage: AIUsageMetrics; rawUsage: ProviderUsage }> {
  const model       = resolveModel(provider, options?.model);
  const maxTokens   = clampMaxTokens(provider, options?.maxTokens ?? env.aiMaxTokens);
  const temperature = options?.temperature ?? env.aiTemperature;

  const client = getClient(provider);
  const startTime = Date.now();

  try {
    const stream = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      temperature,
      stream: true,
      // Ask OpenAI-compatible providers to include usage in the final
      // chunk. DeepSeek + OpenRouter both honour this.
      stream_options: { include_usage: true },
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    let fullText = "";
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of stream as any) {
      const delta = chunk?.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta.length > 0) {
        fullText += delta;
        onChunk(delta);
      }
      if (chunk?.usage) {
        inputTokens  = chunk.usage.prompt_tokens     ?? inputTokens;
        outputTokens = chunk.usage.completion_tokens ?? outputTokens;
      }
    }

    // Fallback token estimation if the provider didn't return usage
    // (rare — some OpenRouter-proxied models strip usage metadata).
    if (inputTokens === 0 && outputTokens === 0) {
      const approxInput = Math.ceil((systemPrompt.length + messages.reduce((acc, m) => acc + m.content.length, 0)) / 4);
      const approxOutput = Math.ceil(fullText.length / 4);
      inputTokens  = approxInput;
      outputTokens = approxOutput;
    }

    const rawUsage: ProviderUsage = {
      inputTokens,
      outputTokens,
      totalCost: estimateCost(inputTokens, outputTokens, model, provider),
      model,
      provider:  provider.id,
      latencyMs: Date.now() - startTime,
    };

    log(`[AI] ${provider.name}/${model} stream · in=${inputTokens} out=${outputTokens} · $${rawUsage.totalCost.toFixed(4)} · ${rawUsage.latencyMs}ms`);

    return { text: fullText, usage: toLegacyUsage(rawUsage), rawUsage };
  } catch (err) {
    throw classifyError(err, provider);
  }
}

// ── Error classifier (shared by streaming + non-streaming) ───────────

/**
 * Detect "out of money" signals. DeepSeek raises HTTP 402 with the
 * literal message "Insufficient Balance". OpenRouter raises 402 too, or
 * surfaces `insufficient_quota` / "out of credits" in the body. Either
 * way, we want to:
 *   - NOT retry the same provider (the balance won't refill mid-loop),
 *   - BUT fail over to the next provider in the chain — the two
 *     providers have separate wallets, so a dead DeepSeek balance is
 *     not a dead OpenRouter balance.
 * This is why insufficient_balance gets its own error code rather than
 * being lumped into generic api_error.
 */
function isInsufficientBalance(status: number, message: string): boolean {
  if (status === 402) return true;
  const lower = message.toLowerCase();
  return (
    lower.includes("insufficient balance") ||
    lower.includes("insufficient_balance") ||
    lower.includes("insufficient quota") ||
    lower.includes("insufficient_quota") ||
    lower.includes("insufficient credits") ||
    lower.includes("out of credits") ||
    lower.includes("quota exceeded") ||
    lower.includes("payment required")
  );
}

function classifyError(err: unknown, provider: ProviderConfig): YappaflowAIError {
  // The `openai` SDK exposes status on APIError instances — duck-type
  // so we don't depend on importing OpenAI.APIError (shape varies by
  // version).
  const anyErr = err as any;
  const status = typeof anyErr?.status === "number" ? anyErr.status : 0;
  const message = anyErr?.message || "Unknown error";

  if (status === 401 || status === 403) {
    return new YappaflowAIError(
      `${provider.name} authentication failed. Check the API key in your .env file.`,
      "auth_error",
      false
    );
  }
  if (isInsufficientBalance(status, message)) {
    return new YappaflowAIError(
      `${provider.name} billing issue: ${message}. Top up at ${provider.id === "deepseek" ? "platform.deepseek.com/top_up" : "openrouter.ai/credits"}, or set the other provider's API key so the chain can fail over.`,
      "insufficient_balance",
      false
    );
  }
  if (status === 429) {
    return new YappaflowAIError(
      `${provider.name} rate limit exceeded. Will retry / fail over.`,
      "rate_limit",
      true
    );
  }
  if (status >= 500 || status === 408 || anyErr?.code === "ECONNRESET" || anyErr?.code === "ETIMEDOUT") {
    return new YappaflowAIError(
      `${provider.name} transient API error (${status || anyErr?.code || "network"}): ${message}`,
      "api_error",
      true
    );
  }
  return new YappaflowAIError(
    `${provider.name} API error: ${message}`,
    "api_error",
    false
  );
}

// ── Per-provider max_tokens clamping ─────────────────────────────────

/**
 * Track which (provider, requested) combinations we have already warned
 * about so the log isn't spammed when a service calls the API in a
 * tight loop. Cleared by `resetClientCache()` for test isolation.
 */
const clampWarnCache = new Set<string>();

function clampMaxTokens(provider: ProviderConfig, requested: number): number {
  const ceiling = provider.maxOutputTokens;
  if (requested <= ceiling) return requested;
  const key = `${provider.id}:${requested}`;
  if (!clampWarnCache.has(key)) {
    clampWarnCache.add(key);
    log(`[AI] ${provider.name} max_tokens clamped from ${requested} → ${ceiling} (provider hard limit). If you need larger outputs, route this call to OpenRouter or split the generation.`);
  }
  return ceiling;
}

// ── Per-provider model normalization ─────────────────────────────────

/**
 * Model IDs are provider-scoped. DeepSeek accepts bare names
 * (`deepseek-chat`, `deepseek-reasoner`); OpenRouter requires
 * namespaced IDs (`vendor/model`, e.g. `deepseek/deepseek-chat`,
 * `google/gemini-2.5-flash-lite`).
 *
 * The phase resolver hands the chain a model picked for the PRIMARY
 * provider. When the chain pivots — either via capacity-aware routing
 * or mid-flight failover — that model string can end up being sent to
 * a provider it wasn't meant for:
 *   - OpenRouter receiving bare `deepseek-chat` → 400 "ambiguous, matches
 *     deepseek/deepseek-chat AND deepseek/deepseek-chat-v2.5".
 *   - DeepSeek receiving `google/gemini-2.5-flash-lite` → 400 "model not
 *     found".
 *
 * Rather than track a cross-provider name-translation table, we detect
 * the mismatch by shape (slash → namespaced → OpenRouter-native) and
 * fall back to the current provider's own default model. This is the
 * correct semantic: "we tried to use the preferred model but it wasn't
 * available here, so use whatever this provider offers natively."
 */
const modelSwapWarnCache = new Set<string>();

function resolveModel(provider: ProviderConfig, requested: string | undefined): string {
  if (!requested) return provider.defaultModel;

  const hasNamespace = requested.includes("/");
  const belongsHere  =
    (provider.id === "deepseek"   && !hasNamespace) ||
    (provider.id === "openrouter" &&  hasNamespace);

  if (belongsHere) return requested;

  const key = `${provider.id}:${requested}`;
  if (!modelSwapWarnCache.has(key)) {
    modelSwapWarnCache.add(key);
    log(`[AI] ${provider.name} doesn't accept model "${requested}" (wrong provider namespace); falling back to ${provider.defaultModel}.`);
  }
  return provider.defaultModel;
}

// ── Terminal error builder (shared by both loops) ────────────────────

/**
 * When every provider in the chain has failed, preserve the most useful
 * error the caller/user can act on. Special-case insufficient_balance
 * because the generic "All providers failed" message hides the real
 * cause (empty wallet) behind our own wrapper.
 */
function buildTerminalError(lastError: Error | null, chainLength: number): YappaflowAIError {
  if (lastError instanceof YappaflowAIError) {
    // When there was only one provider in the chain, the original
    // YappaflowAIError is already the most informative surface — return
    // it verbatim (its message already tells the user how to fix it).
    if (chainLength <= 1) return lastError;

    // Every provider in a multi-provider chain ran out of balance.
    if (lastError.code === "insufficient_balance") {
      return new YappaflowAIError(
        `All AI providers are out of balance. Top up DeepSeek (platform.deepseek.com/top_up) or OpenRouter (openrouter.ai/credits). Last error: ${lastError.message}`,
        "insufficient_balance",
        false
      );
    }
    return lastError;
  }
  return new YappaflowAIError(
    `All AI providers failed. Last error: ${lastError?.message || "unknown"}`,
    "api_error",
    true
  );
}

// ── Backoff + sleep helpers ──────────────────────────────────────────

function backoff(attempt: number): number {
  return Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Mock response selector (mirrors legacy client exactly) ───────────

function pickMockResponse(systemPrompt: string): { text: string; usage: ProviderUsage } {
  const lower = systemPrompt.toLowerCase();
  let text: string;

  if (lower.includes("task: extract business identity")) {
    text = JSON.stringify(MOCK_IDENTITY, null, 2);
    log("[AI MOCK] business identity");
  } else if (lower.includes("task: generate shopify theme bundle")) {
    text = MOCK_SHOPIFY_BUNDLE;
    log("[AI MOCK] shopify bundle");
  } else if (lower.includes("task: generate webflow bundle")) {
    text = MOCK_WEBFLOW_BUNDLE;
    log("[AI MOCK] webflow bundle");
  } else if (lower.includes("task: generate wordpress theme")) {
    text = MOCK_WORDPRESS_BUNDLE;
    log("[AI MOCK] wordpress bundle");
  } else if (lower.includes("task: generate ikas storefront theme bundle")) {
    text = MOCK_IKAS_BUNDLE;
    log("[AI MOCK] ikas bundle");
  } else if (lower.includes("task: generate static site")) {
    text = MOCK_STATIC_SITE;
    log("[AI MOCK] static site");
  } else if (lower.includes("task: generate production code")) {
    text = MOCK_GENERATED_CODE;
    log("[AI MOCK] generated code");
  } else if (lower.includes("task: plan project architecture")) {
    text = JSON.stringify(MOCK_PLAN, null, 2);
    log("[AI MOCK] architecture plan");
  } else if (lower.includes("task: analyze client conversation")) {
    text = JSON.stringify(MOCK_ANALYSIS, null, 2);
    log("[AI MOCK] analysis");
  } else {
    text = JSON.stringify(MOCK_ANALYSIS, null, 2);
    log("[AI MOCK] defaulting to analysis. Preview: " + lower.slice(0, 100));
  }

  return {
    text,
    usage: {
      inputTokens:  1500,
      outputTokens: 2000,
      totalCost:    0,
      model:        "mock-mode",
      provider:     "deepseek",
      latencyMs:    500,
    },
  };
}

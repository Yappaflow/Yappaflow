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

  const chain = resolveProviderChain(options?.providerChain);
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
      if (err instanceof YappaflowAIError && err.retryable) {
        log(`[AI] ${provider.name} retryable failure, failing over`);
        continue;
      }
      // Non-retryable error — rethrow immediately.
      throw err;
    }
  }

  throw lastError instanceof YappaflowAIError
    ? lastError
    : new YappaflowAIError(
        `All AI providers failed. Last error: ${lastError?.message || "unknown"}`,
        "api_error",
        true
      );
}

// ── One attempt against one provider, with internal retries ──────────

async function callOnce(
  provider:     ProviderConfig,
  systemPrompt: string,
  messages:     ChatMessage[],
  options?:     ChatCompletionOptions
): Promise<{ text: string; usage: AIUsageMetrics; rawUsage: ProviderUsage }> {
  const model       = options?.model       ?? provider.defaultModel;
  const maxTokens   = options?.maxTokens   ?? env.aiMaxTokens;
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
      if (classified.code === "auth_error") throw classified; // don't retry a bad key
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

  const chain = resolveProviderChain(options?.providerChain);
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
      if (err instanceof YappaflowAIError && err.retryable) {
        log(`[AI] ${provider.name} retryable stream failure, failing over`);
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof YappaflowAIError
    ? lastError
    : new YappaflowAIError(
        `All AI providers failed (streaming). Last error: ${lastError?.message || "unknown"}`,
        "api_error",
        true
      );
}

async function streamOnce(
  provider:     ProviderConfig,
  systemPrompt: string,
  messages:     ChatMessage[],
  onChunk:      (text: string) => void,
  options?:     ChatCompletionOptions
): Promise<{ text: string; usage: AIUsageMetrics; rawUsage: ProviderUsage }> {
  const model       = options?.model       ?? provider.defaultModel;
  const maxTokens   = options?.maxTokens   ?? env.aiMaxTokens;
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

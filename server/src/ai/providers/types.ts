/**
 * AI Provider Types
 *
 * Shared types for our OpenAI-SDK-compatible provider layer.
 * Both DeepSeek and OpenRouter implement the OpenAI chat-completions
 * interface, so we can target both through the same `openai` npm package
 * by swapping `baseURL` + `apiKey`.
 */

// ── Provider identity ─────────────────────────────────────────────────

export type ProviderId = "deepseek" | "openrouter";

// ── Chat message (OpenAI-compatible) ──────────────────────────────────

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role:    ChatRole;
  content: string;
  /** Optional name for multi-persona tool-call scenarios — unused today. */
  name?:   string;
}

// ── Pricing per-million-tokens (USD) ──────────────────────────────────

export interface ModelPricing {
  /** USD per 1M input tokens. */
  input:  number;
  /** USD per 1M output tokens. */
  output: number;
}

// ── Provider configuration ────────────────────────────────────────────

export interface ProviderConfig {
  id:          ProviderId;
  /** Display name for logs + dashboards. */
  name:        string;
  /** Base URL we hand to the OpenAI SDK. */
  baseUrl:     string;
  /** API key, read from env at construction time. */
  apiKey:      string;
  /** Default model if caller does not override. */
  defaultModel: string;
  /**
   * Optional large-context model for big-output generation calls.
   *
   * Why this exists: OpenRouter routes requests to upstream provider
   * endpoints, and some of those endpoints cap TOTAL context (input +
   * output) below what the advertised model natively supports. Gemini
   * 2.5 Flash Lite natively has a 1M-token context, but the specific
   * upstream endpoint OpenRouter chose for us enforced a 32k total cap,
   * breaking a 27k-input + 32k-output Shopify generation with HTTP 400
   * "maximum context length is 32768 tokens" (prod, 2026-04-20).
   *
   * `defaultModel` is still used for small calls (analysis, planning).
   * When the caller's requested output is big enough that we're clearly
   * in generation territory, `resolveModel` swaps to this large-context
   * model instead. On OpenRouter that's Llama 3.3 70B Instruct — its
   * 131k context is part of the base model, so every upstream endpoint
   * serves it uniformly (Qwen Coder's advertised 128k needs YaRN, which
   * not all OpenRouter upstreams enable, so we don't use it here).
   *
   * DeepSeek doesn't need one — it has a single unified V3.2 route with
   * 128k input context and the output cap is enforced separately by
   * `maxOutputTokens`.
   */
  largeOutputModel?: string;
  /** Optional custom headers (OpenRouter uses these for leaderboard branding). */
  headers?:    Record<string, string>;
  /** Pricing map keyed by exact model id. Unknown models return 0 cost. */
  pricing:     Record<string, ModelPricing>;
  /**
   * Hard ceiling for `max_tokens` enforced by the provider's API.
   *
   * DeepSeek rejects requests with 400 "Invalid max_tokens value, the
   * valid range of max_tokens is [1, 8192]" — their V3.2 route caps
   * output at 8192 regardless of model. OpenRouter passes through to the
   * underlying model (Gemini 2.5 Flash Lite supports 65k+ output).
   *
   * The client clamps the caller-requested maxTokens to this ceiling
   * inside callOnce/streamOnce so consumer services can keep asking for
   * their IDEAL output size without hard-coding vendor limits. Services
   * that actually need >8k output must failover to OpenRouter or split
   * the generation across multiple calls.
   */
  maxOutputTokens: number;
}

// ── Call options ──────────────────────────────────────────────────────

export interface ChatCompletionOptions {
  model?:       string;
  maxTokens?:   number;
  temperature?: number;
  /** Provider IDs to try in order. Defaults to env-configured primary + fallback. */
  providerChain?: ProviderId[];
}

// ── Usage metrics (decoupled from Anthropic's shape) ─────────────────

export interface ProviderUsage {
  inputTokens:  number;
  outputTokens: number;
  totalCost:    number;   // estimated USD
  model:        string;
  provider:     ProviderId;
  latencyMs:    number;
}

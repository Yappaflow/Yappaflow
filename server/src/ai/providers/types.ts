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
  /** Optional custom headers (OpenRouter uses these for leaderboard branding). */
  headers?:    Record<string, string>;
  /** Pricing map keyed by exact model id. Unknown models return 0 cost. */
  pricing:     Record<string, ModelPricing>;
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

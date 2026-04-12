import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";
import type { AIUsageMetrics } from "./types";
import { MOCK_ANALYSIS, MOCK_PLAN, MOCK_GENERATED_CODE, simulateStreaming } from "./mock-data";
import { log } from "../utils/logger";

// ── Mock mode check ───────────────────────────────────────────────────

export function isMockMode(): boolean {
  return env.aiMockMode;
}

// ── Lazy singleton ────────────────────────────────────────────────────

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!env.anthropicApiKey) {
    throw new YappaflowAIError(
      "ANTHROPIC_API_KEY is not set. Add it to your .env file.\n" +
      "Get one at: https://console.anthropic.com/settings/keys",
      "missing_api_key"
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey: env.anthropicApiKey });
  }
  return client;
}

// ── Error class ───────────────────────────────────────────────────────

export class YappaflowAIError extends Error {
  constructor(
    message: string,
    public code: "missing_api_key" | "rate_limit" | "auth_error" | "api_error" | "parse_error",
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "YappaflowAIError";
  }
}

// ── Non-streaming message ─────────────────────────────────────────────

export async function createMessage(
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
  options?: { model?: string; maxTokens?: number }
): Promise<{ text: string; usage: AIUsageMetrics }> {
  // Mock mode — return sample data without API call
  if (isMockMode()) {
    return getMockResponse(systemPrompt);
  }

  const model = options?.model || env.anthropicModel;
  const maxTokens = options?.maxTokens || env.anthropicMaxTokens;
  const startTime = Date.now();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await getAnthropicClient().messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      return {
        text,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalCost: estimateCost(response.usage.input_tokens, response.usage.output_tokens, model),
          model,
          latencyMs: Date.now() - startTime,
        },
      };
    } catch (err) {
      lastError = err as Error;

      if (err instanceof Anthropic.AuthenticationError) {
        throw new YappaflowAIError(
          "Invalid Anthropic API key. Check your ANTHROPIC_API_KEY in .env",
          "auth_error"
        );
      }

      if (err instanceof Anthropic.RateLimitError) {
        if (attempt < 2) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          await sleep(delay);
          continue;
        }
        throw new YappaflowAIError(
          "Claude API rate limit exceeded. Please try again shortly.",
          "rate_limit",
          true
        );
      }

      if (attempt < 2) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await sleep(delay);
        continue;
      }
    }
  }

  throw new YappaflowAIError(
    `Claude API error after 3 attempts: ${lastError?.message || "Unknown error"}`,
    "api_error",
    true
  );
}

// ── Streaming message ─────────────────────────────────────────────────

export async function createStreamingMessage(
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
  onChunk: (text: string) => void,
  options?: { model?: string; maxTokens?: number }
): Promise<{ text: string; usage: AIUsageMetrics }> {
  // Mock mode — stream sample data with simulated delays
  if (isMockMode()) {
    const mockResp = getMockResponse(systemPrompt);
    log("[AI MOCK] Streaming mock response...");
    await simulateStreaming(mockResp.text, onChunk);
    return mockResp;
  }

  const model = options?.model || env.anthropicModel;
  const maxTokens = options?.maxTokens || env.anthropicMaxTokens;
  const startTime = Date.now();

  try {
    const stream = getAnthropicClient().messages.stream({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    });

    let fullText = "";

    stream.on("text", (text) => {
      fullText += text;
      onChunk(text);
    });

    const finalMessage = await stream.finalMessage();

    return {
      text: fullText,
      usage: {
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
        totalCost: estimateCost(finalMessage.usage.input_tokens, finalMessage.usage.output_tokens, model),
        model,
        latencyMs: Date.now() - startTime,
      },
    };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new YappaflowAIError(
        "Invalid Anthropic API key. Check your ANTHROPIC_API_KEY in .env",
        "auth_error"
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new YappaflowAIError(
        "Claude API rate limit exceeded. Please try again shortly.",
        "rate_limit",
        true
      );
    }
    throw new YappaflowAIError(
      `Claude API streaming error: ${(err as Error).message}`,
      "api_error",
      true
    );
  }
}

// ── Cost estimation ───────────────────────────────────────────────────

export function estimateCost(inputTokens: number, outputTokens: number, model: string): number {
  // Pricing per million tokens (approximate)
  const pricing: Record<string, { input: number; output: number }> = {
    "claude-sonnet-4-20250514":    { input: 3,    output: 15 },
    "claude-opus-4-20250514":      { input: 15,   output: 75 },
    "claude-haiku-4-5-20251001":   { input: 0.80, output: 4 },
  };

  const rates = pricing[model] || pricing["claude-sonnet-4-20250514"];
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

// ── Mock response selector ────────────────────────────────────────────

function getMockResponse(systemPrompt: string): { text: string; usage: AIUsageMetrics } {
  const lower = systemPrompt.toLowerCase();
  let text: string;

  // Check most specific phase markers FIRST (order matters — master prompt contains overlapping keywords)
  if (lower.includes("task: generate production code")) {
    text = MOCK_GENERATED_CODE;
    log("[AI MOCK] Returning mock generated code");
  } else if (lower.includes("task: plan project architecture")) {
    text = JSON.stringify(MOCK_PLAN, null, 2);
    log("[AI MOCK] Returning mock architecture plan");
  } else if (lower.includes("task: analyze client conversation")) {
    text = JSON.stringify(MOCK_ANALYSIS, null, 2);
    log("[AI MOCK] Returning mock conversation analysis");
  } else {
    text = JSON.stringify(MOCK_ANALYSIS, null, 2);
    log("[AI MOCK] No phase marker matched, defaulting to analysis. Prompt preview: " + lower.slice(0, 100));
  }

  return {
    text,
    usage: {
      inputTokens: 1500,
      outputTokens: 2000,
      totalCost: 0,
      model: "mock-mode",
      latencyMs: 500,
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

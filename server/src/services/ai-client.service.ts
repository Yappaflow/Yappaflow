/**
 * AI Client Service
 *
 * Business-logic wrapper around the OpenAI-compatible AI client
 * (DeepSeek primary, OpenRouter fallback). All other AI-consuming
 * services go through this one.
 *
 * This module used to target Anthropic directly. We pivoted to
 * pay-per-token APIs via the `openai` SDK to hit zero-fixed-cost
 * code generation. The public API here is unchanged so callers
 * (code-generator, project-planner, CMS generators, etc.) keep
 * working without edits.
 */

import {
  createChatCompletion,
  createStreamingChatCompletion,
} from "../ai/openai-client";
import { buildSystemPrompt, type BuildSystemPromptOptions } from "../ai/build-system-prompt";
import type { ChatCompletionOptions, ChatMessage } from "../ai/providers";
import { resolveForPhase, type AIPhaseName } from "../ai/phase-model";
import type { AIUsageMetrics } from "../ai/types";
import { AISession } from "../models/AISession.model";

export type { ChatMessage } from "../ai/providers";

// ── Call options (superset of base + prompt-assembly knobs) ──────────

export interface AIClientCallOptions {
  /** Pipeline phase — drives per-phase provider/model selection.
   *  Omit for one-off calls that don't belong to a pipeline stage. */
  phase?:       AIPhaseName;
  model?:       string;
  maxTokens?:   number;
  temperature?: number;
  /** Skip design-system injection (for identity extraction, analysis, etc.). */
  includeDesignSystem?: boolean;
  /** Extra context blocks appended to the system prompt. */
  extraSections?: string[];
}

function toPromptOptions(o?: AIClientCallOptions): BuildSystemPromptOptions {
  return {
    includeDesignSystem: o?.includeDesignSystem ?? true,
    extraSections:       o?.extraSections,
  };
}

/**
 * Translate AIClientCallOptions into the base client's ChatCompletionOptions.
 * If a phase is supplied and the caller hasn't overridden model/provider,
 * resolve the per-phase default via `resolveForPhase`.
 */
function toClientOptions(o?: AIClientCallOptions): ChatCompletionOptions {
  const out: ChatCompletionOptions = {
    model:       o?.model,
    maxTokens:   o?.maxTokens,
    temperature: o?.temperature,
  };

  if (o?.phase) {
    const choice = resolveForPhase(o.phase);
    out.providerChain = choice.providerChain;
    // Explicit model in options wins over phase default.
    out.model = out.model ?? choice.model;
  }

  return out;
}

// ── Streaming call with chunk callback ────────────────────────────────

export async function analyzeWithStreaming(
  systemPrompt: string,
  userContent:  string,
  onChunk:      (text: string) => void,
  options?:     AIClientCallOptions
): Promise<{ text: string; usage: AIUsageMetrics }> {
  const assembled = buildSystemPrompt(systemPrompt, toPromptOptions(options));
  const messages: ChatMessage[] = [{ role: "user", content: userContent }];

  const result = await createStreamingChatCompletion(assembled, messages, onChunk, toClientOptions(options));
  return { text: result.text, usage: result.usage };
}

// ── Non-streaming single-shot call ────────────────────────────────────

export async function analyzeOnce(
  systemPrompt: string,
  userContent:  string,
  options?:     AIClientCallOptions
): Promise<{ text: string; usage: AIUsageMetrics }> {
  const assembled = buildSystemPrompt(systemPrompt, toPromptOptions(options));
  const messages: ChatMessage[] = [{ role: "user", content: userContent }];

  const result = await createChatCompletion(assembled, messages, toClientOptions(options));
  return { text: result.text, usage: result.usage };
}

// ── Multi-turn conversation ───────────────────────────────────────────

export async function analyzeConversation(
  systemPrompt: string,
  messages:     ChatMessage[],
  onChunk:      (text: string) => void,
  options?:     AIClientCallOptions
): Promise<{ text: string; usage: AIUsageMetrics }> {
  const assembled = buildSystemPrompt(systemPrompt, toPromptOptions(options));
  const result = await createStreamingChatCompletion(assembled, messages, onChunk, toClientOptions(options));
  return { text: result.text, usage: result.usage };
}

// ── Track usage on an AI session ──────────────────────────────────────

export async function trackUsage(sessionId: string, usage: AIUsageMetrics): Promise<void> {
  await AISession.findByIdAndUpdate(sessionId, {
    $inc: {
      "usage.inputTokens":  usage.inputTokens,
      "usage.outputTokens": usage.outputTokens,
      "usage.totalCost":    usage.totalCost,
    },
    $set: {
      "usage.model": usage.model,
    },
  });
}

// ── Extract JSON from an AI response ──────────────────────────────────

export function extractJSON<T>(text: string): T {
  // Try direct parse first
  try {
    return JSON.parse(text) as T;
  } catch {
    // noop
  }

  // Strip markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]) as T;
    } catch {
      // noop
    }
  }

  // Find first { or [ and last } or ]
  const firstBrace   = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  const start = firstBrace === -1 ? firstBracket
    : firstBracket === -1 ? firstBrace
    : Math.min(firstBrace, firstBracket);

  if (start === -1) {
    throw new Error("No JSON object found in AI response");
  }

  const isArray = text[start] === "[";
  const closer  = isArray ? "]" : "}";
  const lastClose = text.lastIndexOf(closer);

  if (lastClose === -1) {
    throw new Error("Malformed JSON in AI response");
  }

  const jsonStr = text.slice(start, lastClose + 1);

  try {
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    throw new Error(`Failed to parse JSON from AI response: ${(err as Error).message}`);
  }
}

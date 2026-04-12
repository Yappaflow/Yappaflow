/**
 * AI Client Service
 *
 * Business-logic wrapper around the raw Claude API client.
 * All other AI services go through this one.
 */

import { createMessage, createStreamingMessage } from "../ai/client";
import type { AIUsageMetrics } from "../ai/types";
import { AISession } from "../models/AISession.model";
import type Anthropic from "@anthropic-ai/sdk";

// ── Streaming call with chunk callback ────────────────────────────────

export async function analyzeWithStreaming(
  systemPrompt: string,
  userContent: string,
  onChunk: (text: string) => void,
  options?: { model?: string; maxTokens?: number }
): Promise<{ text: string; usage: AIUsageMetrics }> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userContent },
  ];

  return createStreamingMessage(systemPrompt, messages, onChunk, options);
}

// ── Non-streaming single-shot call ────────────────────────────────────

export async function analyzeOnce(
  systemPrompt: string,
  userContent: string,
  options?: { model?: string; maxTokens?: number }
): Promise<{ text: string; usage: AIUsageMetrics }> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userContent },
  ];

  return createMessage(systemPrompt, messages, options);
}

// ── Multi-turn conversation ───────────────────────────────────────────

export async function analyzeConversation(
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
  onChunk: (text: string) => void,
  options?: { model?: string; maxTokens?: number }
): Promise<{ text: string; usage: AIUsageMetrics }> {
  return createStreamingMessage(systemPrompt, messages, onChunk, options);
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

// ── Extract JSON from Claude response ─────────────────────────────────

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
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  const start = firstBrace === -1 ? firstBracket
    : firstBracket === -1 ? firstBrace
    : Math.min(firstBrace, firstBracket);

  if (start === -1) {
    throw new Error("No JSON object found in Claude response");
  }

  const isArray = text[start] === "[";
  const closer = isArray ? "]" : "}";
  const lastClose = text.lastIndexOf(closer);

  if (lastClose === -1) {
    throw new Error("Malformed JSON in Claude response");
  }

  const jsonStr = text.slice(start, lastClose + 1);

  try {
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    throw new Error(`Failed to parse JSON from Claude response: ${(err as Error).message}`);
  }
}

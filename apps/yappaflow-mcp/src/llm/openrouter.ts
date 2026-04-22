/**
 * OpenRouter client — OpenAI-SDK-compatible (per yappaflow ai-vendor strategy).
 *
 * Reason for the indirection: the three-stage model split (analysis/planning/generation)
 * is owned here so each tool just asks for the stage; switching DeepSeek ↔ OpenRouter ↔
 * direct Anthropic is one flag change (LLM_PROVIDER) later.
 */

import OpenAI from "openai";
import type { Config } from "../config.js";

export type Stage = "analysis" | "planning" | "generation";

export class OpenRouterClient {
  private client: OpenAI | null;
  private cfg: Config["openrouter"];
  readonly offline: boolean;

  constructor(cfg: Config["openrouter"], offline: boolean) {
    this.cfg = cfg;
    this.offline = offline || !cfg.apiKey;
    this.client = this.offline
      ? null
      : new OpenAI({
          apiKey: cfg.apiKey ?? "",
          baseURL: cfg.baseUrl,
          defaultHeaders: {
            "HTTP-Referer": "https://yappaflow.com",
            "X-Title": "Yappaflow MCP",
          },
        });
  }

  modelFor(stage: Stage): string {
    switch (stage) {
      case "analysis":
        return this.cfg.analysisModel;
      case "planning":
        return this.cfg.planningModel;
      case "generation":
        return this.cfg.generationModel;
    }
  }

  async complete(params: {
    stage: Stage;
    system?: string;
    user: string | Array<{ role: "system" | "user" | "assistant"; content: string }>;
    responseFormat?: "text" | "json";
    maxTokens?: number;
    temperature?: number;
  }): Promise<string> {
    if (!this.client) {
      throw new OfflineError(
        `OpenRouter client is offline (stage=${params.stage}). Set OPENROUTER_API_KEY to enable.`,
      );
    }
    const messages = Array.isArray(params.user)
      ? params.user
      : [
          ...(params.system ? [{ role: "system" as const, content: params.system }] : []),
          { role: "user" as const, content: params.user },
        ];
    const res = await this.client.chat.completions.create({
      model: this.modelFor(params.stage),
      messages,
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.2,
      ...(params.responseFormat === "json"
        ? { response_format: { type: "json_object" as const } }
        : {}),
    });
    return res.choices[0]?.message?.content ?? "";
  }

  /** Simple streamable variant — returns a stream of deltas. */
  async *stream(params: {
    stage: Stage;
    system?: string;
    user: string;
    maxTokens?: number;
    temperature?: number;
  }): AsyncGenerator<string> {
    if (!this.client) {
      throw new OfflineError(
        `OpenRouter client is offline (stage=${params.stage}). Set OPENROUTER_API_KEY to enable.`,
      );
    }
    const stream = await this.client.chat.completions.create({
      model: this.modelFor(params.stage),
      messages: [
        ...(params.system ? [{ role: "system" as const, content: params.system }] : []),
        { role: "user" as const, content: params.user },
      ],
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.2,
      stream: true,
    });
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) yield token;
    }
  }
}

export class OfflineError extends Error {
  readonly offline = true as const;
}

/** Best-effort JSON parse that tolerates fenced ```json blocks and leading prose. */
export function parseJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first < 0 || last < 0) {
    throw new Error("no JSON object found in model output");
  }
  return JSON.parse(cleaned.slice(first, last + 1)) as T;
}

/**
 * @deprecated — legacy Anthropic client.
 *
 * Yappaflow pivoted its code-generation engine to pay-per-token APIs
 * (DeepSeek primary, OpenRouter fallback) via the OpenAI SDK to
 * eliminate fixed monthly GPU costs. Use `./openai-client` instead.
 *
 * This file is kept as a re-export shim so any straggling import of
 * `YappaflowAIError` / `isMockMode` from the old path continues to
 * compile. New code must import directly from `./openai-client`.
 */

export { YappaflowAIError, isMockMode } from "./openai-client";

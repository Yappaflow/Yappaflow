/**
 * Prompt Loader & Combiner
 *
 * Composes system prompts by combining the master identity prompt
 * with phase-specific instructions and dynamic context.
 */

import type { AIPhase, PlatformTarget, ConversationAnalysisResult } from "../types";
import { getMasterPrompt } from "./master.prompt";
import { getConversationAnalysisPrompt } from "./conversation-analysis.prompt";
import { getArchitecturePlanningPrompt } from "./architecture-planning.prompt";
import { getCodeGenerationPrompt } from "./code-generation.prompt";

export { getMasterPrompt } from "./master.prompt";
export { getConversationAnalysisPrompt } from "./conversation-analysis.prompt";
export { getArchitecturePlanningPrompt } from "./architecture-planning.prompt";
export { getCodeGenerationPrompt } from "./code-generation.prompt";
export { getGenerateWebflowPrompt } from "./generate-webflow.prompt";
export { getGenerateWordPressPrompt } from "./generate-wordpress.prompt";
export { getGenerateIkasPrompt } from "./generate-ikas.prompt";
export { getGenerateYappaflowSitePrompt } from "./generate-yappaflow.prompt";

// ── Context for dynamic prompt composition ────────────────────────────

interface PromptContext {
  clientName?:   string;
  platform?:     PlatformTarget;
  requirements?: ConversationAnalysisResult;
  plan?:         string;  // JSON string of the architecture plan
}

// ── Main composer ─────────────────────────────────────────────────────

export function composeSystemPrompt(phase: AIPhase, context: PromptContext = {}): string {
  const master = getMasterPrompt();
  const phasePrompt = getPhasePrompt(phase, context);
  const contextBlock = buildContextBlock(context);

  const parts = [master];
  if (contextBlock) parts.push(contextBlock);
  if (phasePrompt) parts.push(phasePrompt);

  return parts.join("\n\n---\n\n");
}

// ── Phase-specific prompt selection ───────────────────────────────────

function getPhasePrompt(phase: AIPhase, context: PromptContext): string | null {
  switch (phase) {
    case "analyzing":
      return getConversationAnalysisPrompt();

    case "planning":
      return getArchitecturePlanningPrompt(context.platform || "custom");

    case "generating":
      return getCodeGenerationPrompt(context.platform || "custom");

    case "reviewing":
    case "ready":
    case "failed":
      return null;
  }
}

// ── Dynamic context injection ─────────────────────────────────────────

function buildContextBlock(context: PromptContext): string | null {
  const parts: string[] = [];

  if (context.clientName) {
    parts.push(`**Client:** ${context.clientName}`);
  }

  if (context.platform) {
    parts.push(`**Target Platform:** ${context.platform}`);
  }

  if (context.requirements) {
    parts.push(`**Extracted Requirements:**\n\`\`\`json\n${JSON.stringify(context.requirements, null, 2)}\n\`\`\``);
  }

  if (context.plan) {
    parts.push(`**Architecture Plan:**\n\`\`\`json\n${context.plan}\n\`\`\``);
  }

  if (parts.length === 0) return null;

  return `## Project Context\n\n${parts.join("\n\n")}`;
}

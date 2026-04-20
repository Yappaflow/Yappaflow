/**
 * buildSystemPrompt()
 *
 * Clean utility to assemble the `system` message for any AI call.
 * Takes the caller's base prompt (phase-specific instructions, task
 * markers, etc.) and prepends our design-system bible so every single
 * code-gen call operates under the same quality bar.
 *
 * The design-system block is loaded once per process (see
 * `design-system.ts`) — this function is effectively free on the hot
 * path.
 */

import { loadDesignSystem } from "./design-system";

export interface BuildSystemPromptOptions {
  /** Set to false to skip the design-system injection (e.g. for tasks
   *  that don't emit UI — identity extraction, conversation analysis). */
  includeDesignSystem?: boolean;
  /** Extra ad-hoc context blocks appended at the end, in order. */
  extraSections?:       string[];
}

export function buildSystemPrompt(
  basePrompt: string,
  options: BuildSystemPromptOptions = {}
): string {
  const { includeDesignSystem = true, extraSections = [] } = options;

  const parts: string[] = [basePrompt.trim()];

  if (includeDesignSystem) {
    const design = loadDesignSystem();
    if (design.markdown) {
      parts.push(design.markdown);
    }
  }

  for (const section of extraSections) {
    const trimmed = section.trim();
    if (trimmed) parts.push(trimmed);
  }

  return parts.join("\n\n---\n\n");
}

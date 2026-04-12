/**
 * Project Planner Service
 *
 * Takes extracted requirements and generates a platform-specific
 * architecture plan via Claude.
 */

import { AISession } from "../models/AISession.model";
import { ProjectRequirement } from "../models/ProjectRequirement.model";
import { emitToUser } from "./sse.service";
import { analyzeWithStreaming, trackUsage, extractJSON } from "./ai-client.service";
import { composeSystemPrompt } from "../ai/prompts";
import type { ArchitecturePlan, PlatformTarget } from "../ai/types";

export async function planProject(requirementId: string, agencyId: string) {
  // 1. Load requirement
  const requirement = await ProjectRequirement.findById(requirementId).lean();
  if (!requirement) throw new Error("ProjectRequirement not found");

  const platform = (requirement as any).platformPreference as PlatformTarget;

  // 2. Find or create session
  let session = await AISession.findOne({
    requirementId,
    agencyId,
    status: "active",
  });

  if (!session) {
    session = await AISession.create({
      agencyId,
      signalId: (requirement as any).signalId,
      requirementId,
      phase: "planning",
      status: "active",
    });
  } else {
    await AISession.findByIdAndUpdate(session._id, { phase: "planning" });
  }

  const sessionId = session._id.toString();

  emitToUser(agencyId, "ai:phase-change", {
    sessionId,
    phase: "planning",
    timestamp: new Date().toISOString(),
  });

  try {
    // 3. Build system prompt with requirements context
    const systemPrompt = composeSystemPrompt("planning", {
      platform,
      requirements: requirement as any,
    });

    // 4. Stream planning
    const { text, usage } = await analyzeWithStreaming(
      systemPrompt,
      `Generate the complete architecture plan for this project.\n\nPlatform: ${platform}\nProject Type: ${(requirement as any).projectType}\nPages: ${(requirement as any).contentRequirements?.pages?.join(", ") || "TBD"}\nFeatures: ${(requirement as any).contentRequirements?.features?.join(", ") || "TBD"}`,
      (chunk) => {
        emitToUser(agencyId, "ai:analysis-chunk", { sessionId, chunk });
      },
      { maxTokens: 4096 }
    );

    await trackUsage(sessionId, usage);

    // 5. Parse architecture plan
    const plan = extractJSON<ArchitecturePlan>(text);

    // 6. Store plan in session metadata
    await AISession.findByIdAndUpdate(sessionId, {
      phase: "ready",
      metadata: { architecturePlan: plan, rawPlanResponse: text },
    });

    emitToUser(agencyId, "ai:complete", { sessionId, phase: "planning" });

    return {
      session: await AISession.findById(sessionId),
      plan,
    };
  } catch (err) {
    await AISession.findByIdAndUpdate(sessionId, {
      phase: "failed",
      status: "failed",
      error: (err as Error).message,
    });

    emitToUser(agencyId, "ai:error", { sessionId, error: (err as Error).message });
    throw err;
  }
}

/**
 * AI Orchestrator Service
 *
 * Coordinates the full AI pipeline: analyze → plan → generate.
 * Manages session lifecycle and Signal/Project status updates.
 */

import { AISession } from "../models/AISession.model";
import { Signal } from "../models/Signal.model";
import { Project } from "../models/Project.model";
import { ProjectRequirement } from "../models/ProjectRequirement.model";
import { GeneratedArtifact } from "../models/GeneratedArtifact.model";
import { emitToUser } from "./sse.service";
import { analyzeConversation } from "./conversation-analyzer.service";
import { planProject } from "./project-planner.service";
import { generateCode } from "./code-generator.service";
import { log } from "../utils/logger";

// ── Full pipeline ─────────────────────────────────────────────────────

export async function runFullPipeline(signalId: string, agencyId: string) {
  log(`[AI] Starting full pipeline for signal ${signalId}`);

  // Update signal status
  await Signal.findByIdAndUpdate(signalId, { status: "in_progress" });

  try {
    // Phase 1: Analyze conversation
    log("[AI] Phase 1: Analyzing conversation...");
    const { session: analysisSession, requirement } = await analyzeConversation(signalId, agencyId);

    if (!requirement || !analysisSession) {
      throw new Error("Conversation analysis failed to produce requirements");
    }

    const requirementId = requirement._id.toString();
    const sessionId = analysisSession._id.toString();

    // Phase 2: Plan architecture
    log("[AI] Phase 2: Planning architecture...");
    const { session: planSession } = await planProject(requirementId, agencyId);

    if (!planSession) {
      throw new Error("Architecture planning failed");
    }

    // Use the planning session for code generation
    const planSessionId = planSession._id.toString();

    // Phase 3: Generate code
    log("[AI] Phase 3: Generating code...");
    const { session: genSession, artifacts } = await generateCode(planSessionId, agencyId);

    if (!genSession) {
      throw new Error("Code generation failed");
    }

    // Phase 4: Finalize
    log("[AI] Phase 4: Finalizing...");

    // Update session to ready
    await AISession.findByIdAndUpdate(planSessionId, {
      phase: "ready",
      status: "completed",
    });

    // Auto-create project if one doesn't exist for this signal
    let project = await Project.findOne({ signalId });
    if (!project) {
      const req = await ProjectRequirement.findById(requirementId).lean();
      project = await Project.create({
        agencyId,
        name: `${(req as any)?.projectType || "Web"} Project`,
        clientName: (await Signal.findById(signalId).lean() as any)?.senderName || "Client",
        platform: (req as any)?.platformPreference || "custom",
        phase: "building",
        progress: 25,
        signalId,
      });

      // Link project to session and artifacts
      await AISession.findByIdAndUpdate(planSessionId, { projectId: project._id });
      await GeneratedArtifact.updateMany(
        { sessionId: planSessionId },
        { projectId: project._id }
      );
    }

    // Update signal status
    await Signal.findByIdAndUpdate(signalId, { status: "converted" });

    emitToUser(agencyId, "ai:complete", {
      sessionId: planSessionId,
      phase: "ready",
    });

    log(`[AI] Pipeline complete. Session: ${planSessionId}, Artifacts: ${artifacts?.length || 0}`);

    return {
      session: await AISession.findById(planSessionId),
      requirement: await ProjectRequirement.findById(requirementId),
      artifacts,
      project,
    };
  } catch (err) {
    log(`[AI] Pipeline failed: ${(err as Error).message}`);

    // Revert signal status on failure
    await Signal.findByIdAndUpdate(signalId, { status: "new" });

    throw err;
  }
}

// ── Retry a specific phase ────────────────────────────────────────────

export async function retryPhase(
  sessionId: string,
  phase: "analyzing" | "planning" | "generating",
  agencyId: string
) {
  const session = await AISession.findById(sessionId).lean();
  if (!session) throw new Error("AISession not found");
  if ((session as any).agencyId.toString() !== agencyId) throw new Error("Unauthorized");

  switch (phase) {
    case "analyzing": {
      const signalId = (session as any).signalId?.toString();
      if (!signalId) throw new Error("No signal linked to this session");
      return analyzeConversation(signalId, agencyId);
    }
    case "planning": {
      const requirementId = (session as any).requirementId?.toString();
      if (!requirementId) throw new Error("No requirement linked to this session");
      return planProject(requirementId, agencyId);
    }
    case "generating": {
      return generateCode(sessionId, agencyId);
    }
  }
}

// ── Get session status with linked data ───────────────────────────────

export async function getSessionStatus(sessionId: string, agencyId: string) {
  const session = await AISession.findById(sessionId).lean();
  if (!session) throw new Error("AISession not found");
  if ((session as any).agencyId.toString() !== agencyId) throw new Error("Unauthorized");

  const requirement = (session as any).requirementId
    ? await ProjectRequirement.findById((session as any).requirementId).lean()
    : null;

  const artifacts = await GeneratedArtifact.find({ sessionId }).lean();

  return { session, requirement, artifacts };
}

// ── Cancel a session ──────────────────────────────────────────────────

export async function cancelSession(sessionId: string, agencyId: string) {
  const session = await AISession.findById(sessionId);
  if (!session) throw new Error("AISession not found");
  if (session.agencyId.toString() !== agencyId) throw new Error("Unauthorized");

  session.status = "cancelled";
  await session.save();

  return session;
}

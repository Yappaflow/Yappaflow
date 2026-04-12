import { GraphQLError } from "graphql";
import type { AuthContext } from "../../middleware/auth";
import { AISession } from "../../models/AISession.model";
import { ProjectRequirement } from "../../models/ProjectRequirement.model";
import { GeneratedArtifact } from "../../models/GeneratedArtifact.model";
import {
  analyzeConversation,
} from "../../services/conversation-analyzer.service";
import { planProject } from "../../services/project-planner.service";
import { generateCode } from "../../services/code-generator.service";
import {
  runFullPipeline,
  retryPhase,
  cancelSession,
} from "../../services/ai-orchestrator.service";

// ── Helpers ───────────────────────────────────────────────────────────

function guard(ctx: AuthContext): string {
  if (!ctx.userId) throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHORIZED" } });
  return ctx.userId;
}

function serializeSession(doc: any) {
  if (!doc) return null;
  return {
    id:            doc._id.toString(),
    signalId:      doc.signalId?.toString() ?? null,
    projectId:     doc.projectId?.toString() ?? null,
    requirementId: doc.requirementId?.toString() ?? null,
    phase:         doc.phase,
    status:        doc.status,
    usage: {
      inputTokens:  doc.usage?.inputTokens ?? 0,
      outputTokens: doc.usage?.outputTokens ?? 0,
      totalCost:    doc.usage?.totalCost ?? 0,
      model:        doc.usage?.model ?? "",
    },
    error:     doc.error ?? null,
    createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt,
    updatedAt: doc.updatedAt?.toISOString?.() ?? doc.updatedAt,
  };
}

function serializeRequirement(doc: any) {
  if (!doc) return null;
  return {
    id:                  doc._id.toString(),
    signalId:            doc.signalId?.toString() ?? null,
    projectType:         doc.projectType,
    platformPreference:  doc.platformPreference,
    confidence:          doc.confidence,
    designSystem:        doc.designSystem ?? null,
    designRequirements:  doc.designRequirements ?? null,
    contentRequirements: doc.contentRequirements ?? null,
    businessContext:     doc.businessContext ?? null,
    brandEssence:        doc.brandEssence ?? null,
    visualTension:       doc.visualTension ?? null,
    signatureMoment:     doc.signatureMoment ?? null,
    createdAt:           doc.createdAt?.toISOString?.() ?? doc.createdAt,
  };
}

function serializeArtifact(doc: any) {
  if (!doc) return null;
  return {
    id:        doc._id.toString(),
    sessionId: doc.sessionId.toString(),
    filePath:  doc.filePath,
    content:   doc.content,
    language:  doc.language,
    purpose:   doc.purpose,
    platform:  doc.platform,
    version:   doc.version,
    createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt,
  };
}

// ── Resolver ──────────────────────────────────────────────────────────

export const aiResolvers = {
  Query: {
    aiSession: async (_: unknown, { id }: { id: string }, ctx: AuthContext) => {
      const userId = guard(ctx);
      const doc = await AISession.findOne({ _id: id, agencyId: userId });
      if (!doc) throw new GraphQLError("AISession not found", { extensions: { code: "NOT_FOUND" } });
      return serializeSession(doc);
    },

    aiSessions: async (
      _: unknown,
      { signalId, projectId }: { signalId?: string; projectId?: string },
      ctx: AuthContext
    ) => {
      const userId = guard(ctx);
      const filter: Record<string, unknown> = { agencyId: userId };
      if (signalId) filter.signalId = signalId;
      if (projectId) filter.projectId = projectId;
      const docs = await AISession.find(filter).sort({ createdAt: -1 }).limit(20);
      return docs.map(serializeSession);
    },

    projectRequirements: async (
      _: unknown,
      { projectId, signalId }: { projectId?: string; signalId?: string },
      ctx: AuthContext
    ) => {
      const userId = guard(ctx);
      const filter: Record<string, unknown> = { agencyId: userId };
      if (projectId) filter.projectId = projectId;
      if (signalId) filter.signalId = signalId;
      const docs = await ProjectRequirement.find(filter).sort({ createdAt: -1 });
      return docs.map(serializeRequirement);
    },

    projectRequirement: async (_: unknown, { id }: { id: string }, ctx: AuthContext) => {
      const userId = guard(ctx);
      const doc = await ProjectRequirement.findOne({ _id: id, agencyId: userId });
      if (!doc) throw new GraphQLError("ProjectRequirement not found", { extensions: { code: "NOT_FOUND" } });
      return serializeRequirement(doc);
    },

    generatedArtifacts: async (_: unknown, { sessionId }: { sessionId: string }, ctx: AuthContext) => {
      const userId = guard(ctx);
      // Verify session belongs to user
      const session = await AISession.findOne({ _id: sessionId, agencyId: userId });
      if (!session) throw new GraphQLError("AISession not found", { extensions: { code: "NOT_FOUND" } });
      const docs = await GeneratedArtifact.find({ sessionId }).sort({ filePath: 1 });
      return docs.map(serializeArtifact);
    },
  },

  Mutation: {
    analyzeConversation: async (_: unknown, { signalId }: { signalId: string }, ctx: AuthContext) => {
      const userId = guard(ctx);
      const { session } = await analyzeConversation(signalId, userId);
      return serializeSession(session);
    },

    planProject: async (_: unknown, { requirementId }: { requirementId: string }, ctx: AuthContext) => {
      const userId = guard(ctx);
      const { session } = await planProject(requirementId, userId);
      return serializeSession(session);
    },

    generateCode: async (_: unknown, { sessionId }: { sessionId: string }, ctx: AuthContext) => {
      const userId = guard(ctx);
      const { session } = await generateCode(sessionId, userId);
      return serializeSession(session);
    },

    runAIPipeline: async (_: unknown, { signalId }: { signalId: string }, ctx: AuthContext) => {
      const userId = guard(ctx);

      // Create initial session and return it immediately
      const session = await AISession.create({
        agencyId: userId,
        signalId,
        phase: "analyzing",
        status: "active",
      });

      // Run pipeline asynchronously (don't await)
      runFullPipeline(signalId, userId).catch((err) => {
        console.error("[AI Pipeline Error]", err.message);
      });

      return serializeSession(session);
    },

    retryAIPhase: async (
      _: unknown,
      { sessionId, phase }: { sessionId: string; phase: "analyzing" | "planning" | "generating" },
      ctx: AuthContext
    ) => {
      const userId = guard(ctx);
      const result = await retryPhase(sessionId, phase, userId);
      return serializeSession((result as any)?.session);
    },

    cancelAISession: async (_: unknown, { sessionId }: { sessionId: string }, ctx: AuthContext) => {
      const userId = guard(ctx);
      const session = await cancelSession(sessionId, userId);
      return serializeSession(session);
    },
  },
};

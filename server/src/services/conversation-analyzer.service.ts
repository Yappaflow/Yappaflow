/**
 * Conversation Analyzer Service
 *
 * Processes a Signal's chat messages through Claude to extract
 * structured project requirements and a design system.
 */

import { ChatMessage } from "../models/ChatMessage.model";
import { Signal } from "../models/Signal.model";
import { AISession } from "../models/AISession.model";
import { ProjectRequirement } from "../models/ProjectRequirement.model";
import { emitToUser } from "./sse.service";
import { analyzeWithStreaming, trackUsage, extractJSON } from "./ai-client.service";
import { composeSystemPrompt } from "../ai/prompts";
import type { ConversationAnalysisResult } from "../ai/types";
import { log } from "../utils/logger";

// ── Main entry point ──────────────────────────────────────────────────

export async function analyzeConversation(signalId: string, agencyId: string) {
  // 1. Fetch all messages for this signal
  const messages = await ChatMessage.find({ signalId })
    .sort({ timestamp: 1 })
    .lean();

  if (messages.length === 0) {
    throw new Error("No messages found for this signal");
  }

  // 2. Fetch signal metadata
  const signal = await Signal.findById(signalId).lean();
  if (!signal) throw new Error("Signal not found");

  // 3. Format conversation as transcript
  const transcript = formatTranscript(messages);

  // 4. Create AI session
  const session = await AISession.create({
    agencyId,
    signalId,
    phase: "analyzing",
    status: "active",
  });

  const sessionId = session._id.toString();

  // Emit phase change
  emitToUser(agencyId, "ai:phase-change", {
    sessionId,
    phase: "analyzing",
    timestamp: new Date().toISOString(),
  });

  try {
    // 5. Build system prompt
    const systemPrompt = composeSystemPrompt("analyzing");

    // 6. Stream analysis
    const { text, usage } = await analyzeWithStreaming(
      systemPrompt,
      `## Conversation Thread\n\n**Client:** ${(signal as any).senderName} (via ${(signal as any).platform})\n\n${transcript}`,
      (chunk) => {
        emitToUser(agencyId, "ai:analysis-chunk", { sessionId, chunk });
      },
      {
        phase: "analyzing",          // routes to Turkish-strong model (see phase-model.ts)
        maxTokens: 4096,
        includeDesignSystem: false,  // analysis is pure NLU — design bible adds noise
      }
    );

    // 7. Track usage
    await trackUsage(sessionId, usage);

    // 8. Parse JSON response
    let analysis: ConversationAnalysisResult;
    try {
      analysis = extractJSON<ConversationAnalysisResult>(text);
    } catch (parseErr) {
      log(`JSON parse failed, storing raw analysis. Error: ${(parseErr as Error).message}`);

      // Store raw and mark as needing review
      const requirement = await ProjectRequirement.create({
        agencyId,
        signalId,
        sessionId,
        projectType: "unknown",
        platformPreference: "custom",
        confidence: 0.2,
        rawAnalysis: text,
      });

      await AISession.findByIdAndUpdate(sessionId, {
        phase: "failed",
        status: "failed",
        requirementId: requirement._id,
        error: "Failed to parse analysis JSON. Raw response stored.",
      });

      emitToUser(agencyId, "ai:error", {
        sessionId,
        error: "Analysis completed but JSON parsing failed. Raw response saved.",
      });

      return { session: await AISession.findById(sessionId), requirement };
    }

    // 9. Create ProjectRequirement from parsed analysis
    const requirement = await ProjectRequirement.create({
      agencyId,
      signalId,
      sessionId,
      projectType:        analysis.projectType,
      platformPreference: analysis.platformPreference,
      confidence:         analysis.confidence,
      designSystem:       analysis.designSystem,
      designRequirements: analysis.designRequirements,
      contentRequirements: analysis.contentRequirements,
      businessContext:    analysis.businessContext,
      brandEssence:       analysis.brandEssence,
      visualTension:      analysis.visualTension,
      signatureMoment:    analysis.signatureMoment,
      rawAnalysis:        text,
    });

    // 10. Update session
    await AISession.findByIdAndUpdate(sessionId, {
      phase: "ready",
      status: "completed",
      requirementId: requirement._id,
    });

    emitToUser(agencyId, "ai:complete", { sessionId, phase: "analyzing" });

    return {
      session: await AISession.findById(sessionId),
      requirement,
    };
  } catch (err) {
    // Handle AI errors
    await AISession.findByIdAndUpdate(sessionId, {
      phase: "failed",
      status: "failed",
      error: (err as Error).message,
    });

    emitToUser(agencyId, "ai:error", {
      sessionId,
      error: (err as Error).message,
    });

    throw err;
  }
}

// ── Format messages as readable transcript ────────────────────────────

function formatTranscript(messages: any[]): string {
  return messages
    .map((msg) => {
      const direction = msg.direction === "inbound" ? "CLIENT" : "AGENCY";
      const time = new Date(msg.timestamp).toLocaleString("en-US", {
        dateStyle: "short",
        timeStyle: "short",
      });
      return `[${time}] ${direction} (${msg.senderName}): ${msg.text}`;
    })
    .join("\n");
}

/**
 * Code Generator Service
 *
 * Takes an architecture plan and generates complete, runnable code files.
 * Streams output via SSE for the "matrix terminal" dashboard UI.
 */

import { AISession } from "../models/AISession.model";
import { ProjectRequirement } from "../models/ProjectRequirement.model";
import { GeneratedArtifact } from "../models/GeneratedArtifact.model";
import { emitToUser } from "./sse.service";
import { analyzeWithStreaming, trackUsage } from "./ai-client.service";
import { log } from "../utils/logger";
import { composeSystemPrompt } from "../ai/prompts";
import type { ArchitecturePlan, CodeArtifact, PlatformTarget } from "../ai/types";

export async function generateCode(sessionId: string, agencyId: string) {
  // 1. Load session with metadata (contains architecture plan)
  const session = await AISession.findById(sessionId).lean();
  if (!session) throw new Error("AISession not found");

  const plan = (session as any).metadata?.architecturePlan as ArchitecturePlan | undefined;
  if (!plan) throw new Error("No architecture plan found in session. Run planProject first.");

  const requirement = await ProjectRequirement.findById((session as any).requirementId).lean();
  if (!requirement) throw new Error("ProjectRequirement not found");

  const platform = plan.platform as PlatformTarget;

  // 2. Update phase
  await AISession.findByIdAndUpdate(sessionId, { phase: "generating" });

  emitToUser(agencyId, "ai:phase-change", {
    sessionId,
    phase: "generating",
    timestamp: new Date().toISOString(),
  });

  try {
    // 3. Build system prompt with full context
    const systemPrompt = composeSystemPrompt("generating", {
      platform,
      requirements: requirement as any,
      plan: JSON.stringify(plan, null, 2),
    });

    // 4. Stream code generation
    const { text, usage } = await analyzeWithStreaming(
      systemPrompt,
      `Generate all files listed in the architecture plan. Each file must be complete and production-ready.\n\nFiles to generate:\n${plan.fileTree.map((f) => `- ${f}`).join("\n")}`,
      (chunk) => {
        emitToUser(agencyId, "ai:code-chunk", { sessionId, chunk });
      },
      {
        phase: "generating",         // Next.js / theme code → DeepSeek V3.2
        maxTokens: 8192,
      }
    );

    await trackUsage(sessionId, usage);

    // 5. Parse generated files from response
    log(`[AI Code Gen] Response length: ${text.length} chars`);
    const artifacts = parseCodeArtifacts(text, platform);
    log(`[AI Code Gen] Parsed ${artifacts.length} artifacts: ${artifacts.map(a => a.filePath).join(", ") || "(none)"}`);
    if (artifacts.length === 0) {
      log(`[AI Code Gen] Parse failed. First 200 chars of response: ${text.slice(0, 200)}`);
    }

    // 6. Store artifacts in database
    const savedArtifacts = await Promise.all(
      artifacts.map((artifact) =>
        GeneratedArtifact.create({
          agencyId,
          sessionId,
          requirementId: (session as any).requirementId,
          projectId: (session as any).projectId,
          filePath: artifact.filePath,
          content: artifact.content,
          language: artifact.language,
          purpose: artifact.purpose,
          platform,
        })
      )
    );

    // 7. Update session
    await AISession.findByIdAndUpdate(sessionId, {
      phase: "reviewing",
    });

    emitToUser(agencyId, "ai:complete", { sessionId, phase: "generating" });

    return {
      session: await AISession.findById(sessionId),
      artifacts: savedArtifacts,
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

// ── Parse fenced code blocks with filepath headers ────────────────────

function parseCodeArtifacts(text: string, platform: string): CodeArtifact[] {
  const artifacts: CodeArtifact[] = [];

  // Match ```filepath:path/to/file.ext\n<content>\n```
  const regex = /```filepath:([\w.\/\-]+)\s*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const filePath = match[1].trim();
    const content = match[2].trim();

    artifacts.push({
      filePath,
      content,
      language: detectLanguage(filePath),
      purpose: detectPurpose(filePath, platform),
    });
  }

  // Fallback: try standard fenced blocks with filename comment on first line
  if (artifacts.length === 0) {
    const fallbackRegex = /```(\w+)?\s*\n\/[\/\*]\s*([\w.\/\-]+)\s*\*?\/?[\s]*\n([\s\S]*?)```/g;

    while ((match = fallbackRegex.exec(text)) !== null) {
      const filePath = match[2].trim();
      const content = match[3].trim();

      artifacts.push({
        filePath,
        content,
        language: match[1] || detectLanguage(filePath),
        purpose: detectPurpose(filePath, platform),
      });
    }
  }

  return artifacts;
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    liquid: "liquid",
    php: "php",
    tsx: "typescript",
    ts: "typescript",
    jsx: "javascript",
    js: "javascript",
    css: "css",
    scss: "scss",
    json: "json",
    html: "html",
    md: "markdown",
  };
  return map[ext] || ext;
}

function detectPurpose(filePath: string, platform: string): string {
  const lower = filePath.toLowerCase();

  if (lower.includes("hero")) return "hero-section";
  if (lower.includes("header") || lower.includes("nav")) return "navigation";
  if (lower.includes("footer")) return "footer";
  if (lower.includes("layout")) return "layout";
  if (lower.includes("config") || lower.includes("settings") || lower.includes("tailwind")) return "configuration";
  if (lower.includes("globals") || lower.includes("theme.css") || lower.includes("style.css")) return "stylesheet";
  if (lower.includes("functions.php")) return "theme-functions";
  if (lower.includes("animation")) return "animation-utils";
  if (lower.includes("font")) return "typography";

  if (platform === "shopify" && lower.includes("section")) return "theme-section";
  if (platform === "shopify" && lower.includes("snippet")) return "theme-snippet";
  if (platform === "wordpress" && lower.includes("template")) return "template";

  return "component";
}

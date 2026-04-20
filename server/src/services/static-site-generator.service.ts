import { Project, IProjectIdentity } from "../models/Project.model";
import { GeneratedArtifact } from "../models/GeneratedArtifact.model";
import { AISession } from "../models/AISession.model";
import { analyzeOnce, trackUsage } from "./ai-client.service";
import {
  getGenerateStaticSitePrompt,
  type ProductForPrompt,
} from "../ai/prompts/generate-static-site.prompt";
import { log, logError } from "../utils/logger";

interface ParsedFile {
  filePath: string;
  content:  string;
  language: string;
}

const BASE_EXPECTED_FILES     = 5; // index / about / contact / style / script
const ECOMMERCE_MAX_TOKENS    = 12_288;
const NON_ECOMMERCE_MAX_TOKENS = 8_192;

const LANG_BY_EXT: Record<string, string> = {
  ".html": "html",
  ".css":  "css",
  ".js":   "javascript",
  ".svg":  "svg",
  ".json": "json",
};

function languageForPath(p: string): string {
  const idx = p.lastIndexOf(".");
  if (idx === -1) return "text";
  return LANG_BY_EXT[p.slice(idx).toLowerCase()] ?? "text";
}

/**
 * Parse the model's output into individual files. Each file is emitted as:
 *
 *   ```filepath:<relative/path>
 *   <contents>
 *   ```
 */
export function parseArtifacts(raw: string): ParsedFile[] {
  const out: ParsedFile[] = [];
  const re = /```filepath:([^\n]+)\n([\s\S]*?)\n```/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw)) !== null) {
    const filePath = match[1].trim();
    const content  = match[2];
    if (!filePath) continue;
    if (filePath.includes("..") || filePath.startsWith("/")) continue; // path traversal guard
    out.push({ filePath, content, language: languageForPath(filePath) });
  }
  return out;
}

function productsForPrompt(identity: IProjectIdentity): ProductForPrompt[] {
  if (!identity.products?.length) return [];
  return identity.products.map((p) => ({
    name:        p.name,
    price:       p.price,
    currency:    p.currency,
    description: p.description,
    images:      p.images,
    variantKind: p.variantKind,
    variants:    p.variants?.map((v) => ({ label: v.label, price: v.price })),
  }));
}

export async function generateStaticSite(
  projectId: string,
  agencyId: string
): Promise<{ filesCreated: number }> {
  const project = await Project.findOne({ _id: projectId, agencyId });
  if (!project) throw new Error("Project not found");
  if (!project.identity) throw new Error("Project has no identity — run extraction first");

  const identity = project.identity as IProjectIdentity;
  const products = productsForPrompt(identity);
  const hasProducts = products.length > 0;

  await Project.findByIdAndUpdate(projectId, {
    buildJobStatus:  "running",
    buildFilesDone:  0,
    buildFilesTotal: BASE_EXPECTED_FILES,
    buildError:      null,
  });

  // Create an AISession so we can persist GeneratedArtifacts against it.
  const session = await AISession.create({
    agencyId,
    projectId,
    phase:  "generating",
    status: "active",
  });
  const sessionId = session._id;

  const systemPrompt = getGenerateStaticSitePrompt({ products });

  const identityForPrompt = {
    businessName:      identity.businessName,
    tagline:           identity.tagline,
    industry:          identity.industry,
    tone:              identity.tone,
    city:              identity.city,
    domainSuggestions: identity.domainSuggestions,
  };

  const userContent =
    "## Business Identity\n\n" +
    "```json\n" +
    JSON.stringify(identityForPrompt, null, 2) +
    "\n```\n\n" +
    (hasProducts
      ? "## Product Catalog (render in `#shop` section)\n\n" +
        "```json\n" +
        JSON.stringify(products, null, 2) +
        "\n```\n\n"
      : "") +
    "Generate the five files now. No prose outside the fenced blocks.";

  log(
    `🏗  Generating static site for project ${projectId} ` +
    `(${identity.businessName}${hasProducts ? `, ${products.length} products` : ""})`
  );

  let raw: string;
  try {
    const { text, usage } = await analyzeOnce(systemPrompt, userContent, {
      maxTokens: hasProducts ? ECOMMERCE_MAX_TOKENS : NON_ECOMMERCE_MAX_TOKENS,
    });
    raw = text;
    await trackUsage(sessionId.toString(), usage);
  } catch (err) {
    logError("Static site generation AI call failed", err);
    await Project.findByIdAndUpdate(projectId, {
      buildJobStatus: "failed",
      buildError:     (err as Error).message,
    });
    await AISession.findByIdAndUpdate(sessionId, { phase: "failed", status: "failed", error: (err as Error).message });
    throw err;
  }

  const files = parseArtifacts(raw);
  if (files.length === 0) {
    const msg = "Model output contained no filepath-fenced blocks";
    await Project.findByIdAndUpdate(projectId, {
      buildJobStatus: "failed",
      buildError:     msg,
    });
    await AISession.findByIdAndUpdate(sessionId, { phase: "failed", status: "failed", error: msg });
    throw new Error(msg);
  }

  // Replace any previous artifacts for this project (idempotent re-build).
  await GeneratedArtifact.deleteMany({ agencyId, projectId });

  for (const f of files) {
    await GeneratedArtifact.create({
      agencyId,
      sessionId,
      projectId,
      filePath: f.filePath,
      content:  f.content,
      language: f.language,
      platform: "custom",
      purpose:  "static-site",
      version:  1,
    });
    await Project.findByIdAndUpdate(projectId, { $inc: { buildFilesDone: 1 } });
  }

  await Project.findByIdAndUpdate(projectId, {
    buildJobStatus:  "done",
    buildFilesTotal: files.length,
    progress:        80,
  });
  await AISession.findByIdAndUpdate(sessionId, { phase: "ready", status: "completed" });

  log(`   → Generated ${files.length} files for project ${projectId}`);
  return { filesCreated: files.length };
}

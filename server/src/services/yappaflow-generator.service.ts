/**
 * Yappaflow-platform site generator.
 *
 * Counterpart to `static-site-generator.service.ts`, but for the React /
 * Next.js track powered by the `yappaflow-ui` component library.
 *
 * Flow:
 *   1. Compose the system prompt (`generate-yappaflow.prompt.ts`).
 *   2. Call `analyzeOnce` under the "generating" phase (DeepSeek V3.2).
 *   3. Parse the returned filepath-fenced blocks (re-using the tolerant
 *      parser exported by the static-site generator).
 *   4. Persist every file as a `GeneratedArtifact` with platform="yappaflow".
 *
 * The actual `next build` / ZIP step lives in
 * `yappaflow-build.service.ts` — this service stops once the React source
 * files are persisted. Splitting the AI step from the filesystem/build
 * step keeps the tests and retry story cleaner.
 */

import { Project, IProjectIdentity } from "../models/Project.model";
import { GeneratedArtifact } from "../models/GeneratedArtifact.model";
import { AISession } from "../models/AISession.model";
import { analyzeOnce, trackUsage } from "./ai-client.service";
import {
  getGenerateYappaflowSitePrompt,
  type YfProductForPrompt,
} from "../ai/prompts/generate-yappaflow.prompt";
import { parseArtifacts } from "./static-site-generator.service";
import { log, logError } from "../utils/logger";

// The Yappaflow track emits TSX — more chars per file than the terse HTML
// track — so the budget is bigger. Still bounded so we don't grind on a
// single 45-minute generation.
const BASE_MAX_TOKENS      = 14_336;
const ECOMMERCE_MAX_TOKENS = 18_432;

// How many files we expect by default. Used only for the progress bar;
// the actual count is updated once the model output is parsed.
const BASE_EXPECTED_FILES       = 6; // layout + 3 pages + globals.css + SiteShell
const ECOMMERCE_EXPECTED_FILES  = 9; // + shop page + CartDrawer + cart helper

const LANG_BY_EXT: Record<string, string> = {
  ".tsx":  "tsx",
  ".ts":   "typescript",
  ".jsx":  "jsx",
  ".js":   "javascript",
  ".css":  "css",
  ".json": "json",
  ".md":   "markdown",
  ".svg":  "svg",
};

function languageForPath(p: string): string {
  const idx = p.lastIndexOf(".");
  if (idx === -1) return "text";
  return LANG_BY_EXT[p.slice(idx).toLowerCase()] ?? "text";
}

function productsForPrompt(identity: IProjectIdentity): YfProductForPrompt[] {
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

/**
 * The model's output is a source-tree under `app/` + `components/`. We
 * validate that at least the mandatory App Router entrypoints are present
 * — if the model truncated before emitting layout.tsx or page.tsx, the
 * subsequent `next build` would fail anyway, and we'd rather surface that
 * here with a clear error than pay for an npm-install before discovery.
 */
function validateMandatoryFiles(files: { filePath: string }[]): string | null {
  const paths = new Set(files.map((f) => f.filePath));
  const required = ["app/layout.tsx", "app/page.tsx", "components/SiteShell.tsx"];
  const missing = required.filter((p) => !paths.has(p));
  if (missing.length > 0) {
    return `Generator output is missing required files: ${missing.join(", ")}`;
  }
  return null;
}

export async function generateYappaflowSite(
  projectId: string,
  agencyId: string
): Promise<{ filesCreated: number; sessionId: string }> {
  const project = await Project.findOne({ _id: projectId, agencyId });
  if (!project) throw new Error("Project not found");
  if (!project.identity) throw new Error("Project has no identity — run extraction first");

  const identity     = project.identity as IProjectIdentity;
  const products     = productsForPrompt(identity);
  const hasProducts  = products.length > 0;
  const expectedFiles = hasProducts ? ECOMMERCE_EXPECTED_FILES : BASE_EXPECTED_FILES;

  await Project.findByIdAndUpdate(projectId, {
    buildJobStatus:  "running",
    buildPhase:      "generating",
    buildFilesDone:  0,
    buildFilesTotal: expectedFiles,
    buildError:      null,
    buildStartedAt:  new Date(),
  });

  const session = await AISession.create({
    agencyId,
    projectId,
    phase:  "generating",
    status: "active",
  });
  const sessionId = session._id;

  const systemPrompt = getGenerateYappaflowSitePrompt({ products });

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
      ? "## Product Catalog (render in /shop route)\n\n" +
        "```json\n" +
        JSON.stringify(products, null, 2) +
        "\n```\n\n"
      : "") +
    "Emit the Next.js + yappaflow-ui project files now. " +
    "No prose outside the fenced `filepath:` blocks.";

  log(
    `🏗  Generating yappaflow-ui site for project ${projectId} ` +
    `(${identity.businessName}${hasProducts ? `, ${products.length} products` : ""})`
  );

  let raw: string;
  try {
    const { text, usage } = await analyzeOnce(systemPrompt, userContent, {
      phase:     "generating",
      maxTokens: hasProducts ? ECOMMERCE_MAX_TOKENS : BASE_MAX_TOKENS,
    });
    raw = text;
    await trackUsage(sessionId.toString(), usage);
  } catch (err) {
    logError("Yappaflow site generation AI call failed", err);
    await Project.findByIdAndUpdate(projectId, {
      buildJobStatus: "failed",
      buildPhase:     "failed",
      buildError:     (err as Error).message,
    });
    await AISession.findByIdAndUpdate(sessionId, {
      phase:  "failed",
      status: "failed",
      error:  (err as Error).message,
    });
    throw err;
  }

  const files = parseArtifacts(raw);
  if (files.length === 0) {
    const msg = "Model output contained no filepath-fenced blocks";
    await Project.findByIdAndUpdate(projectId, {
      buildJobStatus: "failed",
      buildPhase:     "failed",
      buildError:     msg,
    });
    await AISession.findByIdAndUpdate(sessionId, { phase: "failed", status: "failed", error: msg });
    throw new Error(msg);
  }

  const missing = validateMandatoryFiles(files);
  if (missing) {
    await Project.findByIdAndUpdate(projectId, {
      buildJobStatus: "failed",
      buildPhase:     "failed",
      buildError:     missing,
    });
    await AISession.findByIdAndUpdate(sessionId, { phase: "failed", status: "failed", error: missing });
    throw new Error(missing);
  }

  // Ban paths the model must not emit (scaffold is provided by the server).
  const BANNED = new Set([
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "next.config.js",
    "next.config.mjs",
    "tsconfig.json",
    "next-env.d.ts",
    ".gitignore",
    "postcss.config.js",
    "postcss.config.cjs",
    "postcss.config.mjs",
    "tailwind.config.ts",
    "tailwind.config.js",
  ]);
  const filtered = files.filter((f) => {
    if (BANNED.has(f.filePath)) {
      log(`   ↳ dropping model-supplied ${f.filePath} (server scaffolds it)`);
      return false;
    }
    return true;
  });

  await Project.findByIdAndUpdate(projectId, { buildPhase: "packaging" });

  // Replace any previous artifacts for this project — idempotent re-build.
  await GeneratedArtifact.deleteMany({ agencyId, projectId });

  for (const f of filtered) {
    await GeneratedArtifact.create({
      agencyId,
      sessionId,
      projectId,
      filePath: f.filePath,
      content:  f.content,
      language: languageForPath(f.filePath),
      platform: "yappaflow",
      purpose:  "react-source",
      version:  1,
    });
    await Project.findByIdAndUpdate(projectId, { $inc: { buildFilesDone: 1 } });
  }

  await Project.findByIdAndUpdate(projectId, {
    buildFilesTotal: filtered.length,
    // NOTE: we DON'T mark buildJobStatus="done" here — the build step runs
    // next. The route handler (or orchestrator) flips it when `next build`
    // succeeds and the export artifacts are written.
    progress: 60,
  });

  log(`   → Generated ${filtered.length} React source files for project ${projectId}`);
  return { filesCreated: filtered.length, sessionId: sessionId.toString() };
}

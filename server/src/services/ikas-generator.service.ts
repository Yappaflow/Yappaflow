/**
 * ikas bundle generator.
 *
 * Produces an uploadable ikas storefront theme (Handlebars-flavored templates
 * + assets + locales) PLUS a deterministic `products.json` the admin-API
 * pusher uses to create products on the merchant's store.
 *
 *   1. AI authors the theme files (theme.json, layout/theme.html,
 *      templates/*, partials/*, assets/*, locales/*). We prefix every
 *      theme file path with `theme/` so `ikas-admin.service.ts` finds
 *      them via its `a.filePath.startsWith("theme/")` filter.
 *
 *   2. We append a deterministic `products.json` (NOT from the AI) built
 *      from `Project.identity.products` so the push step can round-trip
 *      catalogue data into ikas via the Admin GraphQL API with no edits.
 *
 *   3. A README.txt summarizes the bundle for the agency so the ZIP
 *      download is self-explanatory.
 *
 * Shape mirrors `webflow-generator.service.ts` and `shopify-generator.service.ts`
 * — same two-attempt retry, same fenced `filepath:` parsing, same
 *   Project.buildJobStatus / buildFilesDone / buildFilesTotal bookkeeping.
 */

import { Project, IProjectIdentity, IProduct } from "../models/Project.model";
import { GeneratedArtifact } from "../models/GeneratedArtifact.model";
import { AISession } from "../models/AISession.model";
import { analyzeOnce, trackUsage } from "./ai-client.service";
import {
  getGenerateIkasPrompt,
  type IkasProductForPrompt,
} from "../ai/prompts/generate-ikas.prompt";
import { parseArtifacts } from "./static-site-generator.service";
import { log, logError } from "../utils/logger";

const LANG_BY_EXT: Record<string, string> = {
  ".html":  "html",
  ".css":   "css",
  ".js":    "javascript",
  ".json":  "json",
  ".md":    "markdown",
  ".svg":   "svg",
};

function languageForPath(p: string): string {
  const idx = p.lastIndexOf(".");
  if (idx === -1) return "text";
  return LANG_BY_EXT[p.slice(idx).toLowerCase()] ?? "text";
}

/** Lower-case, dash-separated, ASCII-only slug — matches ikas productCode rules. */
function toSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "product";
}

/**
 * Build the deterministic `products.json` that travels with the theme bundle.
 * It's a denormalized, storefront-friendly view of the catalog so the
 * Handlebars templates can iterate over it directly if the merchant opens the
 * ZIP and inspects the theme before pushing — and so the admin pusher has a
 * single source of truth for prices, variants, and images.
 *
 * NOTE: the ACTUAL push to ikas uses `Project.identity.products` directly
 * (see `ikas-admin.service.ts → pushIkasBundle`). This JSON file is mainly a
 * preview/debug artifact and the storefront fallback catalog when ikas is
 * still empty — it doesn't drive the Admin API call itself.
 */
export function buildIkasProductsJson(
  identity: IProjectIdentity,
  products: IProduct[]
): string {
  const defaultCurrency =
    (identity as unknown as { currency?: string }).currency ?? "TRY";

  const rows = products.map((p) => {
    const slug     = toSlug(p.name);
    const variants = p.variants?.length ? p.variants : [{ label: "Default" }];
    const currency = (p.currency ?? defaultCurrency).toUpperCase();
    return {
      productCode: slug,
      name:        p.name,
      description: p.description ?? "",
      brand:       identity.businessName,
      categories:  identity.industry ? [identity.industry] : [],
      images:      p.images ?? [],
      priceMinor:  Math.round(p.price * 100),
      currency,
      variantKind: p.variantKind ?? "title",
      variants: variants.map((v) => ({
        sku:        v.sku ?? `${slug}-${toSlug(v.label)}`,
        label:      v.label,
        priceMinor: Math.round((v.price ?? p.price) * 100),
        currency,
      })),
    };
  });

  return JSON.stringify({ products: rows }, null, 2) + "\n";
}

function productsForPrompt(identity: IProjectIdentity): IkasProductForPrompt[] {
  if (!identity.products?.length) return [];
  return identity.products.map((p) => ({
    slug:        toSlug(p.name),
    name:        p.name,
    price:       p.price,
    currency:    p.currency,
    description: p.description,
    variantKind: p.variantKind,
    variants:    p.variants?.map((v) => ({ label: v.label, price: v.price })),
  }));
}

// ikas theme bundle is 16 files when products exist, 16 when they don't
// (the prompt renders an empty-state collection page either way).
const IKAS_MAX_TOKENS       = 28_000;
const BASE_EXPECTED_FILES   = 16; // theme.json + layout + 7 templates + 5 partials + 2 assets + 2 locales

/**
 * Generate the ikas bundle for a project.
 *
 * Side effects:
 *   • Creates a fresh AISession and GeneratedArtifact rows.
 *   • Wipes any prior artifacts for this project (idempotent re-build).
 *   • Updates `Project.buildJobStatus`, `buildFilesDone`, `buildFilesTotal`.
 */
export async function generateIkasBundle(
  projectId: string,
  agencyId:  string
): Promise<{ filesCreated: number }> {
  const project = await Project.findOne({ _id: projectId, agencyId });
  if (!project) throw new Error("Project not found");
  if (!project.identity) throw new Error("Project has no identity — run extraction first");

  const identity = project.identity as IProjectIdentity;
  const promptProducts = productsForPrompt(identity);

  const expectedFiles =
    BASE_EXPECTED_FILES +
    1 +                                    // README.txt
    (identity.products?.length ? 1 : 0);   // products.json (generated, not AI)

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

  const systemPrompt = getGenerateIkasPrompt({ products: promptProducts });
  const userContent =
    "## Business Identity\n\n" +
    "```json\n" +
    JSON.stringify(
      {
        businessName: identity.businessName,
        tagline:      identity.tagline,
        industry:     identity.industry,
        tone:         identity.tone,
        city:         identity.city,
      },
      null,
      2
    ) +
    "\n```\n\n" +
    (promptProducts.length
      ? "## Catalog summary (full products.json is generated separately)\n\n" +
        "```json\n" +
        JSON.stringify(promptProducts, null, 2) +
        "\n```\n\n"
      : "") +
    "Generate every theme file in the required layout, in order. " +
    "No prose outside the fenced blocks.";

  log(
    `🛍  Generating ikas bundle for project ${projectId} ` +
    `(${identity.businessName}${promptProducts.length ? `, ${promptProducts.length} products` : ""})`
  );

  // Two attempts — same reasoning as webflow-generator: a single stumble
  // (missed closing fence, stray prose) shouldn't sink the whole build.
  let raw = "";
  let bundleFiles: ReturnType<typeof parseArtifacts> = [];

  for (let attempt = 1; attempt <= 2; attempt++) {
    const attemptUserContent = attempt === 1
      ? userContent
      : userContent +
        "\n\nREMINDER: emit EVERY file as a separate fenced block of the form " +
        "```filepath:<path>\\n<content>\\n```  — no prose outside the fences, " +
        "and make sure the FINAL file's closing fence is present before you stop.";

    try {
      const { text, usage } = await analyzeOnce(systemPrompt, attemptUserContent, {
        phase: "generating",
        maxTokens: IKAS_MAX_TOKENS,
      });
      raw = text;
      await trackUsage(sessionId.toString(), usage);
    } catch (err) {
      logError(`ikas bundle generation AI call failed (attempt ${attempt})`, err);
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

    bundleFiles = parseArtifacts(raw);
    if (bundleFiles.length > 0) break;

    log(
      `⚠️  ikas gen attempt ${attempt}: parseArtifacts found 0 blocks in ${raw.length} chars. ` +
      `Output head: ${JSON.stringify(raw.slice(0, 400))} … ` +
      `tail: ${JSON.stringify(raw.slice(-400))}`
    );
  }

  if (bundleFiles.length === 0) {
    const msg = "ikas model output contained no filepath-fenced blocks";
    await Project.findByIdAndUpdate(projectId, {
      buildJobStatus: "failed",
      buildPhase:     "failed",
      buildError:     msg,
    });
    await AISession.findByIdAndUpdate(sessionId, {
      phase:  "failed",
      status: "failed",
      error:  msg,
    });
    throw new Error(msg);
  }

  await Project.findByIdAndUpdate(projectId, { buildPhase: "packaging" });

  // Wipe previous artifacts for this project so we don't mix two platform
  // outputs in the download ZIP.
  await GeneratedArtifact.deleteMany({ agencyId, projectId });

  // Prefix every AI-authored theme file path with `theme/` so the admin-API
  // pusher finds them (it filters on `a.filePath.startsWith("theme/")` before
  // uploading to the draft theme version).
  const allFiles: Array<{
    filePath: string;
    content:  string;
    language: string;
    purpose:  string;
  }> = bundleFiles.map((f) => ({
    filePath: `theme/${f.filePath}`,
    content:  f.content,
    language: languageForPath(f.filePath),
    purpose:  classifyPurpose(f.filePath),
  }));

  // README.txt — surfaces next steps at the top of the ZIP.
  allFiles.unshift({
    filePath: "README.txt",
    content:
      `Yappaflow → ikas one-click bundle\n` +
      `==================================\n\n` +
      `1) Connect your ikas store (easiest path)\n` +
      `   • In Yappaflow, open Deploy → "Connect ikas" and sign in.\n` +
      `   • Hit "Push to ikas" — we upload a DRAFT theme version + create\n` +
      `     your products via the Admin GraphQL API. Nothing goes live\n` +
      `     automatically: you review + publish from the ikas admin.\n\n` +
      `2) Manual theme import (no OAuth)\n` +
      `   • Open the \`theme/\` folder and upload the files under\n` +
      `     ikas admin → "Online Store" → "Themes" → "Upload new theme".\n\n` +
      (identity.products?.length
        ? `3) E-commerce\n` +
          `   • products.json lists every product we detected from your conversation.\n` +
          `   • The "Push to ikas" button reads it and creates products with variants\n` +
          `     via the Admin API. Or add them manually from the ikas admin.\n\n`
        : `3) Products\n` +
          `   • No catalog provided — the storefront renders an empty state.\n` +
          `     Add products from the ikas admin, then re-run "Push to ikas".\n\n`) +
      `Tip: prefer we do this automatically? Connect your ikas store in\n` +
      `Yappaflow — we'll push the theme and catalog straight to your\n` +
      `<storeName>.myikas.com store.\n\n` +
      `Generated by Yappaflow on ${new Date().toISOString()}.\n`,
    language: "text",
    purpose:  "ikas-readme",
  });

  if (identity.products?.length) {
    const productsJson = buildIkasProductsJson(identity, identity.products);
    allFiles.push({
      filePath: "products.json",
      content:  productsJson,
      language: "json",
      purpose:  "ikas-products-json",
    });
  }

  for (const f of allFiles) {
    await GeneratedArtifact.create({
      agencyId,
      sessionId,
      projectId,
      filePath: f.filePath,
      content:  f.content,
      language: f.language,
      platform: "ikas",
      purpose:  f.purpose,
      version:  1,
    });
    await Project.findByIdAndUpdate(projectId, { $inc: { buildFilesDone: 1 } });
  }

  await Project.findByIdAndUpdate(projectId, {
    buildJobStatus:  "done",
    buildPhase:      "done",
    buildFilesTotal: allFiles.length,
    progress:        80,
  });
  await AISession.findByIdAndUpdate(sessionId, {
    phase:  "ready",
    status: "completed",
  });

  log(`   → Generated ${allFiles.length} ikas files for project ${projectId}`);
  return { filesCreated: allFiles.length };
}

/**
 * Derive a `purpose` tag for the GeneratedArtifact row. The value is
 * surfaced in the dashboard's file list and downloaded ZIP toc.
 *
 * `filePath` here is the path the AI emitted (no `theme/` prefix yet).
 */
function classifyPurpose(filePath: string): string {
  if (filePath === "theme.json")                     return "ikas-theme-manifest";
  if (filePath.startsWith("layout/"))                return "ikas-theme-layout";
  if (filePath.startsWith("templates/"))             return "ikas-theme-template";
  if (filePath.startsWith("partials/"))              return "ikas-theme-partial";
  if (filePath.startsWith("assets/") && filePath.endsWith(".css")) return "ikas-theme-css";
  if (filePath.startsWith("assets/") && filePath.endsWith(".js"))  return "ikas-theme-js";
  if (filePath.startsWith("assets/"))                return "ikas-theme-asset";
  if (filePath.startsWith("locales/"))               return "ikas-theme-locale";
  return "ikas-theme";
}

/**
 * Webflow bundle generator.
 *
 * Produces three artifacts that the agency can drop into a Webflow site
 * with zero manual editing:
 *
 *   1. A pre-Webflow HTML/CSS/JS reference site under `site/` (standalone —
 *      opens as an HTML file) that the agency can either rebuild in the
 *      Designer by eye, or zip up and import via Webflow's "Import HTML"
 *      for a first pass.
 *
 *   2. Two snippets under `webflow/` that drop into Webflow's Custom Code
 *      Head / Body fields (Site settings → Custom code). These give the
 *      Designer-built site our light/dark toggle, analytics stub, and the
 *      product-grid hydrator.
 *
 *   3. A deterministic `products.json` matching the Webflow Data API v2
 *      product schema (plus a copy under `site/products.json` that the
 *      HTML reference site fetches). The AI is NOT in the loop for this
 *      — we build it from `Project.identity.products` directly so the
 *      downstream pusher (`webflow-admin.service.ts`) can round-trip it
 *      into Webflow Ecommerce with no edits.
 *
 * Both artifacts are persisted as `GeneratedArtifact` rows on the Project,
 * so the existing `/deploy/.../download` endpoint streams them in one ZIP.
 *
 * Shape-wise this is a near-clone of `shopify-generator.service.ts`.
 */

import { Project, IProjectIdentity, IProduct } from "../models/Project.model";
import { GeneratedArtifact } from "../models/GeneratedArtifact.model";
import { AISession } from "../models/AISession.model";
import { analyzeOnce, trackUsage } from "./ai-client.service";
import {
  getGenerateWebflowPrompt,
  type WebflowProductForPrompt,
} from "../ai/prompts/generate-webflow.prompt";
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

/** Lower-case, dash-separated, ASCII-only slug — Webflow slug rule. */
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
 * Build the deterministic `products.json` the Webflow pusher consumes and
 * the static reference site fetches on page load. Shape mirrors the Data API
 * v2 product + SKU payload so the pusher can spread it into the POST body
 * without transformation.
 *
 * Reference: https://developers.webflow.com/data/reference/ecommerce/products/create-product
 */
export function buildWebflowProductsJson(
  identity: IProjectIdentity,
  products: IProduct[]
): string {
  const currency = (identity as unknown as { currency?: string }).currency ?? "USD";

  const rows = products.map((p) => {
    const slug     = toSlug(p.name);
    const variants = p.variants?.length ? p.variants : [{ label: "Default" }];
    return {
      product: {
        fieldData: {
          name:        p.name,
          slug,
          description: p.description ?? "",
          shippable:   true,
          "tax-category": "standard-taxable",
        },
      },
      skus: variants.map((v) => {
        const price = v.price ?? p.price;
        return {
          fieldData: {
            name:  v.label,
            slug:  `${slug}-${toSlug(v.label)}`,
            price: { value: Math.round(price * 100), unit: (p.currency ?? currency).toUpperCase() },
            "main-image": p.images?.[0]
              ? { url: p.images[0], alt: p.name }
              : undefined,
          },
        };
      }),
      // Denormalized fields the static reference site's JS uses directly.
      display: {
        name:        p.name,
        slug,
        image:       p.images?.[0] ?? null,
        priceMinor:  Math.round(p.price * 100),
        currency:    (p.currency ?? currency).toUpperCase(),
        description: p.description ?? "",
        variants:    variants.map((v) => ({
          label: v.label,
          priceMinor: Math.round((v.price ?? p.price) * 100),
        })),
      },
    };
  });

  return JSON.stringify({ products: rows }, null, 2) + "\n";
}

function productsForPrompt(identity: IProjectIdentity): WebflowProductForPrompt[] {
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

// 8–9 files, similar size to the custom-static output, well under 32k tokens.
const WEBFLOW_MAX_TOKENS  = 24_000;
const BASE_EXPECTED_FILES = 8; // see prompt's required layout — +1 for product-page when hasProducts

/**
 * Generate the Webflow bundle for a project.
 *
 * Side effects:
 *   • Creates a fresh AISession and GeneratedArtifact rows.
 *   • Wipes any prior artifacts for this project (idempotent re-build).
 *   • Updates `Project.buildJobStatus`, `buildFilesDone`, `buildFilesTotal`.
 */
export async function generateWebflowBundle(
  projectId: string,
  agencyId: string
): Promise<{ filesCreated: number }> {
  const project = await Project.findOne({ _id: projectId, agencyId });
  if (!project) throw new Error("Project not found");
  if (!project.identity) throw new Error("Project has no identity — run extraction first");

  const identity = project.identity as IProjectIdentity;
  const promptProducts = productsForPrompt(identity);

  const expectedFiles =
    BASE_EXPECTED_FILES +
    (promptProducts.length ? 1 : 0) +   // webflow/product-page.html
    (promptProducts.length ? 1 : 0);    // products.json (generated, not AI)

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

  const systemPrompt = getGenerateWebflowPrompt({ products: promptProducts });
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
    "Generate every file in the required layout, in order. No prose outside the fenced blocks.";

  log(
    `🌐 Generating Webflow bundle for project ${projectId} ` +
    `(${identity.businessName}${promptProducts.length ? `, ${promptProducts.length} products` : ""})`
  );

  // Two attempts — same reasoning as shopify-generator: a single stumble
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
        maxTokens: WEBFLOW_MAX_TOKENS,
      });
      raw = text;
      await trackUsage(sessionId.toString(), usage);
    } catch (err) {
      logError(`Webflow bundle generation AI call failed (attempt ${attempt})`, err);
      await Project.findByIdAndUpdate(projectId, {
        buildJobStatus: "failed",
        buildPhase:     "failed",
        buildError:     (err as Error).message,
      });
      await AISession.findByIdAndUpdate(sessionId, { phase: "failed", status: "failed", error: (err as Error).message });
      throw err;
    }

    bundleFiles = parseArtifacts(raw);
    if (bundleFiles.length > 0) break;

    log(
      `⚠️  Webflow gen attempt ${attempt}: parseArtifacts found 0 blocks in ${raw.length} chars. ` +
      `Output head: ${JSON.stringify(raw.slice(0, 400))} … ` +
      `tail: ${JSON.stringify(raw.slice(-400))}`
    );
  }

  if (bundleFiles.length === 0) {
    const msg = "Webflow model output contained no filepath-fenced blocks";
    await Project.findByIdAndUpdate(projectId, {
      buildJobStatus: "failed",
      buildPhase:     "failed",
      buildError:     msg,
    });
    await AISession.findByIdAndUpdate(sessionId, { phase: "failed", status: "failed", error: msg });
    throw new Error(msg);
  }

  await Project.findByIdAndUpdate(projectId, { buildPhase: "packaging" });

  // Wipe previous artifacts for this project so we don't mix two platform
  // outputs in the download ZIP.
  await GeneratedArtifact.deleteMany({ agencyId, projectId });

  const allFiles: Array<{
    filePath: string;
    content:  string;
    language: string;
    purpose:  string;
  }> = bundleFiles.map((f) => ({
    filePath: f.filePath,
    content:  f.content,
    language: languageForPath(f.filePath),
    purpose:  classifyPurpose(f.filePath),
  }));

  // Prepend a one-click README.txt so the agency sees clear next steps at the
  // top of the ZIP (in addition to the AI-authored README.md the prompt emits).
  allFiles.unshift({
    filePath: "README.txt",
    content:
      `Yappaflow → Webflow one-click bundle\n` +
      `====================================\n\n` +
      `1) Designer import (easiest path)\n` +
      `   • Webflow → Site settings → "Backups" → Import, OR\n` +
      `   • Drag the files in \`site/\` into Webflow's Designer via File → Import.\n\n` +
      `2) Custom code (drop into Site settings → Custom code)\n` +
      `   • Paste \`webflow/custom-code-head.html\` into the "Head code" field.\n` +
      `   • Paste \`webflow/custom-code-body.html\` into the "Before </body> tag" field.\n\n` +
      (identity.products?.length
        ? `3) E-commerce\n` +
          `   • Connect your Webflow account in Yappaflow — we'll push\n` +
          `     products.json straight to Webflow Ecommerce.\n` +
          `   • Or: create the products manually from the catalog in products.json.\n\n`
        : `3) Products\n` +
          `   • The bundle ships with no products. Add them in Webflow → Ecommerce,\n` +
          `     or connect your Webflow account in Yappaflow to push them automatically.\n\n`) +
      `Tip: Want us to do this automatically instead? Connect your Webflow workspace\n` +
      `in Yappaflow — we'll push the CMS items + products straight into your site.\n\n` +
      `Generated by Yappaflow on ${new Date().toISOString()}.\n`,
    language: "text",
    purpose:  "webflow-readme",
  });

  if (identity.products?.length) {
    const productsJson = buildWebflowProductsJson(identity, identity.products);
    allFiles.push({
      filePath: "products.json",
      content:  productsJson,
      language: "json",
      purpose:  "webflow-products-json",
    });
    // The reference site fetches `./products.json` next to its own index, so
    // ship a second copy under `site/` too — keeps the static preview live
    // without hand-editing.
    allFiles.push({
      filePath: "site/products.json",
      content:  productsJson,
      language: "json",
      purpose:  "webflow-products-json",
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
      platform: "webflow",
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
  await AISession.findByIdAndUpdate(sessionId, { phase: "ready", status: "completed" });

  log(`   → Generated ${allFiles.length} Webflow files for project ${projectId}`);
  return { filesCreated: allFiles.length };
}

function classifyPurpose(filePath: string): string {
  if (filePath.startsWith("webflow/custom-code-head"))     return "webflow-custom-code-head";
  if (filePath.startsWith("webflow/custom-code-body"))     return "webflow-custom-code-body";
  if (filePath.startsWith("webflow/collections"))          return "webflow-collections-schema";
  if (filePath.startsWith("webflow/product-page"))         return "webflow-product-page";
  if (filePath.startsWith("webflow/cms/") && filePath.endsWith(".json")) return "webflow-cms-item";
  if (filePath.startsWith("site/"))                        return "webflow-site-reference";
  if (filePath === "README.md")                            return "webflow-readme";
  return "webflow-bundle";
}

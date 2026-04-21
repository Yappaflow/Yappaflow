/**
 * Hero Chooser Service
 *
 * The pre-build step that gives the user THREE distinct hero + first-fold
 * mockups to pick from before the long full-site generation runs. Flow:
 *
 *   1.  generateHeroVariants(projectId, agencyId)
 *       → pick ONE design direction from identity, fire 3 concurrent AI
 *         calls (one per HeroFlavor), persist { html, flavor, direction }
 *         for each on project.heroChooser.variants. Status flips
 *         generating → ready.
 *
 *   2.  pickHero(projectId, agencyId, variantId)
 *       → user clicked one. Record pickedVariantId + lockedAt. Status
 *         flips ready → picked. This is a pure persistence call; no AI.
 *
 *   3.  refineHero(projectId, agencyId, userText)
 *       → user typed tweaks into the textbox after picking. Run ONE
 *         refinement-mode AI call seeded with the picked variant's HTML +
 *         the user text; overwrite that variant's html in place. Status
 *         flips picked → refining → refined.
 *
 * Why a single shared direction across all three variants:
 *   The user is picking a COMPOSITION, not a whole new brand. Three
 *   totally different directions would make the compare-and-contrast
 *   step look arbitrary. Locking the direction means the user is
 *   choosing between typographic / full-bleed / asymmetric takes on the
 *   SAME visual system.
 *
 * Cost + latency notes:
 *   Each variant is ~6-10 KB of HTML, ~3-5k output tokens. On DeepSeek
 *   V3.2 that's ~15-30 s per call, ~$0.003 per call. Running them in
 *   Promise.all keeps wall-clock around 30 s (vs ~90 s serial) and total
 *   cost around $0.01. The refinement call is smaller (~$0.002).
 *
 *   If any of the three calls fails outright, we surface that on
 *   heroChooser.status = "failed" so the UI can offer a retry button
 *   rather than showing partial variants (2 of 3 is worse than 0 of 3
 *   for the "pick one" UX — the missing slot implies a broken design).
 */

import {
  Project,
  type IProjectIdentity,
  type IHeroChooser,
  type IHeroVariant,
} from "../models/Project.model";
import { AISession } from "../models/AISession.model";
import { analyzeOnce, trackUsage } from "./ai-client.service";
import {
  HERO_FLAVORS,
  getGenerateHeroVariantPrompt,
  type HeroFlavorSpec,
} from "../ai/prompts/generate-hero-variant.prompt";
import {
  pickDesignDirection,
  type DesignDirection,
} from "../ai/design-directions";
import { log, logError } from "../utils/logger";

/**
 * How many tokens the AI can emit for one variant. The hero HTML docs
 * we ask for are ~6-10 KB (~3k output tokens), so 6000 is generous
 * enough to cover a verbose variant while staying well under the
 * DeepSeek 8k hard ceiling.
 */
const HERO_VARIANT_MAX_TOKENS = 6000;

/**
 * The three variant slots, in left-to-right UI order. Having stable
 * slot IDs instead of deriving them from array indices means the UI
 * and persistence layer stay in sync even if someone reorders
 * HERO_FLAVORS.
 */
const VARIANT_IDS = ["variant-a", "variant-b", "variant-c"] as const;
type VariantId = typeof VARIANT_IDS[number];

export interface HeroVariantResult {
  id:        VariantId;
  flavor:    string;
  html:      string;
  direction: string;
}

/**
 * Strip any leftover markdown fencing the AI may have emitted and
 * extract the HTML document. We ask the prompt for raw HTML starting
 * with `<!doctype html>`, but every so often the model wraps its
 * output in ```html … ``` anyway — iframes can render wrapped content
 * but it looks broken (fences appear as visible text), so we defensively
 * strip them.
 *
 * If we cannot find anything that looks like an HTML document at all,
 * we return null — the caller treats that as a failed variant.
 */
function sanitizeHeroHtml(raw: string): string | null {
  if (!raw) return null;
  let html = raw.trim();

  // Strip an opening ```html or ``` fence if present.
  html = html.replace(/^```(?:html)?\s*\n/, "");
  // Strip a trailing ``` fence if present.
  html = html.replace(/\n```\s*$/, "");
  html = html.trim();

  // Accept any document that contains a <!doctype> declaration and an
  // <html> tag — case-insensitive because the model sometimes emits
  // `<!DOCTYPE html>` (spec-strict) and sometimes `<!doctype html>`
  // (our preference).
  const lower = html.toLowerCase();
  if (!lower.includes("<!doctype") && !lower.includes("<html")) return null;

  // If there is prose BEFORE the doctype (a leading explanation), trim it.
  const doctypeIdx = lower.indexOf("<!doctype");
  if (doctypeIdx > 0) html = html.slice(doctypeIdx);

  // If there is prose AFTER `</html>`, trim it.
  const closeIdx = html.toLowerCase().lastIndexOf("</html>");
  if (closeIdx !== -1) html = html.slice(0, closeIdx + "</html>".length);

  return html;
}

/**
 * Build the user-content block every variant (+ the refinement) reuses.
 * Kept verbatim across the three concurrent calls so the only thing
 * varying per call is the `variantFlavor` + `variantIndex` on the system
 * prompt — that's what makes the outputs comparable.
 */
function buildIdentityUserContent(identity: IProjectIdentity): string {
  const productLine = identity.products?.length
    ? "## Products (referenced by name only; no SKUs or prices)\n\n" +
      "```json\n" +
      JSON.stringify(
        identity.products.slice(0, 6).map((p) => ({ name: p.name })),
        null,
        2
      ) +
      "\n```\n\n"
    : "";

  return (
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
    productLine +
    "Produce ONE complete, srcdoc-ready HTML document. No prose, no markdown fences — just the HTML."
  );
}

/**
 * Generate ALL THREE hero variants for a project concurrently. Caller
 * is the /hero/variants route, which is allowed to await this — the
 * browser is OK waiting ~30 s once because this replaces what would be
 * a 3-minute full-site build where the user might have picked the
 * wrong direction.
 */
export async function generateHeroVariants(
  projectId: string,
  agencyId:  string
): Promise<HeroVariantResult[]> {
  const project = await Project.findOne({ _id: projectId, agencyId });
  if (!project) throw new Error("Project not found");
  if (!project.identity) {
    throw new Error("Project has no identity — run extraction first");
  }

  const identity = project.identity as IProjectIdentity;

  // Direction is chosen ONCE and shared across all three variants. The
  // user picks between compositions, not between brands — so every
  // variant must speak the same visual vocabulary.
  const direction = pickDesignDirection({
    tone:         identity.tone,
    industry:     identity.industry,
    businessName: identity.businessName,
    city:         identity.city,
    hasProducts:  Boolean(identity.products?.length),
  });

  log(
    `🎨 Hero-chooser: generating 3 variants for project ${projectId} ` +
    `(${identity.businessName}) · direction "${direction.label}"`
  );

  // Flip status → generating BEFORE firing the calls so the UI can show
  // a spinner. If a previous attempt left state around (stale variants
  // from a retry), clobber it — the new variants overwrite the whole
  // chooser record.
  await Project.findByIdAndUpdate(projectId, {
    heroChooser: {
      status:   "generating",
      variants: [],
    },
  });

  const session = await AISession.create({
    agencyId,
    projectId,
    phase:  "generating",
    status: "active",
  });
  const sessionId = session._id.toString();

  const userContent = buildIdentityUserContent(identity);

  // Fire the 3 calls concurrently. Promise.all short-circuits on the
  // first rejection, which is what we want — a partial 2-of-3 result
  // means the UI would show a broken third slot, worse UX than a clean
  // "something went wrong, retry?".
  const variantCalls = HERO_FLAVORS.map(async (flavor, idx) => {
    return generateOneVariant({
      direction,
      flavor,
      variantIndex:  idx,
      totalVariants: HERO_FLAVORS.length,
      userContent,
      sessionId,
    });
  });

  let variants: HeroVariantResult[];
  try {
    variants = await Promise.all(variantCalls);
  } catch (err) {
    logError("Hero-chooser: one or more variant calls failed", err);
    await Project.findByIdAndUpdate(projectId, {
      "heroChooser.status": "failed",
      "heroChooser.error":  (err as Error).message,
    });
    await AISession.findByIdAndUpdate(sessionId, {
      phase:  "failed",
      status: "failed",
      error:  (err as Error).message,
    });
    throw err;
  }

  // Persist all three + flip status → ready in one write. Embedding
  // the variants on the Project subdocument is deliberate; they're
  // ephemeral and live/die with the build.
  await Project.findByIdAndUpdate(projectId, {
    heroChooser: {
      status:      "ready",
      variants,
      generatedAt: new Date(),
    },
  });

  await AISession.findByIdAndUpdate(sessionId, {
    phase:  "ready",
    status: "completed",
  });

  log(`✅ Hero-chooser: 3 variants persisted for project ${projectId}`);
  return variants;
}

/**
 * One variant's AI call + sanitize step. Kept private so the public
 * surface stays the ordered-list abstraction.
 *
 * If sanitizeHeroHtml returns null (model produced something
 * unparseable), we throw rather than silently emitting an empty iframe —
 * the caller's Promise.all rejects and the UI can offer a retry.
 */
async function generateOneVariant(args: {
  direction:     DesignDirection;
  flavor:        HeroFlavorSpec;
  variantIndex:  number;
  totalVariants: number;
  userContent:   string;
  sessionId:     string;
}): Promise<HeroVariantResult> {
  const { direction, flavor, variantIndex, totalVariants, userContent, sessionId } = args;

  const systemPrompt = getGenerateHeroVariantPrompt({
    direction,
    flavor,
    variantIndex,
    totalVariants,
  });

  const { text, usage } = await analyzeOnce(systemPrompt, userContent, {
    phase:     "generating",
    maxTokens: HERO_VARIANT_MAX_TOKENS,
  });
  await trackUsage(sessionId, usage);

  const html = sanitizeHeroHtml(text);
  if (!html) {
    throw new Error(
      `Hero variant "${flavor.label}" produced no parseable HTML ` +
      `(got ${text.length} chars, head: ${JSON.stringify(text.slice(0, 120))})`
    );
  }

  return {
    id:        VARIANT_IDS[variantIndex],
    flavor:    flavor.label,
    html,
    direction: direction.key,
  };
}

/**
 * Persist the user's variant pick. No AI call here — this is a pure
 * state transition. `lockedAt` is a server-assigned timestamp the
 * full-build route reads to guarantee the locked hero matches the
 * variant the user actually clicked on (protects against a late
 * second /hero/variants regeneration racing against the build kickoff).
 */
export async function pickHero(
  projectId: string,
  agencyId:  string,
  variantId: string
): Promise<void> {
  const project = await Project.findOne({ _id: projectId, agencyId });
  if (!project) throw new Error("Project not found");
  // Mongoose's exported `Project` collapses to `Model<Document>` because
  // of the `mongoose.models.Project ?? model<IProject>(...)` idiom in
  // Project.model.ts, so `heroChooser` here is statically `any`. Cast
  // explicitly to `IHeroChooser` once at the start of each function.
  const chooser = project.heroChooser as IHeroChooser | undefined;
  if (!chooser || chooser.variants.length === 0) {
    throw new Error("No hero variants exist yet — generate them first");
  }

  const exists = chooser.variants.some((v: IHeroVariant) => v.id === variantId);
  if (!exists) {
    throw new Error(
      `Variant "${variantId}" not found. ` +
      `Available: ${chooser.variants.map((v: IHeroVariant) => v.id).join(", ")}`
    );
  }

  await Project.findByIdAndUpdate(projectId, {
    "heroChooser.status":          "picked",
    "heroChooser.pickedVariantId": variantId,
    "heroChooser.lockedAt":        new Date(),
  });

  log(`🔒 Hero-chooser: project ${projectId} locked on ${variantId}`);
}

/**
 * Run ONE refinement pass on the picked variant using the user's free-
 * text tweak. The prompt is deliberately surgical: preserve everything
 * the user didn't mention, change only what they asked for.
 *
 * Flow:
 *   1. Must have a prior pick (pickedVariantId set). If not, reject —
 *      the UI should have hidden the refinement textbox.
 *   2. Status → refining (UI shows a spinner on the picked slot only).
 *   3. AI call with { previousHtml, userText } → new HTML.
 *   4. Sanitize + replace the picked variant's html in place. Leave the
 *      other two variants untouched — the user might undo the pick and
 *      compare again.
 *   5. Status → refined. refinementText is persisted so the UI can show
 *      it back to the user.
 */
export async function refineHero(
  projectId: string,
  agencyId:  string,
  userText:  string
): Promise<HeroVariantResult> {
  const trimmed = userText.trim();
  if (!trimmed) {
    throw new Error("Refinement text is empty — nothing to refine");
  }
  if (trimmed.length > 2000) {
    // Not a security limit, a prompt-budget one. 2k chars of free text
    // is already a lot; anything longer tends to turn into a rewrite
    // brief, at which point re-generating the variants is the right
    // move.
    throw new Error("Refinement text too long (max 2000 characters)");
  }

  const project = await Project.findOne({ _id: projectId, agencyId });
  if (!project) throw new Error("Project not found");
  // See pickHero — the Project model's exported type loses the generic
  // so we cast once here and work against IHeroChooser directly.
  const chooser = project.heroChooser as IHeroChooser | undefined;
  if (!chooser || chooser.variants.length === 0) {
    throw new Error("No hero variants exist yet — generate them first");
  }
  if (!chooser.pickedVariantId) {
    throw new Error("No variant picked yet — pick one before refining");
  }

  const pickedId = chooser.pickedVariantId;
  const picked = chooser.variants.find((v: IHeroVariant) => v.id === pickedId);
  if (!picked) {
    throw new Error(`Picked variant "${pickedId}" not found in stored variants`);
  }
  if (!project.identity) {
    throw new Error("Project has no identity — refinement needs the identity block");
  }

  const identity = project.identity as IProjectIdentity;

  // The direction must match what the variant was generated with. We
  // persisted `direction: string` (the key) on each variant so we can
  // re-hydrate the full archetype here.
  const direction = pickDesignDirection({
    tone:         identity.tone,
    industry:     identity.industry,
    businessName: identity.businessName,
    city:         identity.city,
    hasProducts:  Boolean(identity.products?.length),
    forceKey:     picked.direction as DesignDirection["key"],
  });

  // Match the picked variant back to its HeroFlavorSpec. We stored the
  // human label, not the key, so we reverse-lookup on the label. (Labels
  // are stable across deploys; keys are the programmatic handle but the
  // persistence uses the label because it's what the UI already shows.)
  const flavor =
    HERO_FLAVORS.find((f) => f.label === picked.flavor) ??
    HERO_FLAVORS[0];

  await Project.findByIdAndUpdate(projectId, {
    "heroChooser.status":         "refining",
    "heroChooser.refinementText": trimmed,
  });

  const session = await AISession.create({
    agencyId,
    projectId,
    phase:  "generating",
    status: "active",
  });
  const sessionId = session._id.toString();

  // indexOf returns -1 when not found; clamp to 0 so the prompt still
  // gets a valid 0-2 slot number (only used to label variant A/B/C in
  // the system-prompt header — cosmetic for refinement).
  const slotIdx = VARIANT_IDS.indexOf(pickedId as VariantId);
  const safeSlotIdx = slotIdx >= 0 ? slotIdx : 0;

  const systemPrompt = getGenerateHeroVariantPrompt({
    direction,
    flavor,
    variantIndex:  safeSlotIdx,
    totalVariants: HERO_FLAVORS.length,
    refinement: {
      previousHtml: picked.html,
      userText:     trimmed,
    },
  });

  const userContent = buildIdentityUserContent(identity);

  let rawHtml: string;
  try {
    const { text, usage } = await analyzeOnce(systemPrompt, userContent, {
      phase:     "generating",
      maxTokens: HERO_VARIANT_MAX_TOKENS,
    });
    await trackUsage(sessionId, usage);
    rawHtml = text;
  } catch (err) {
    logError("Hero-chooser: refinement AI call failed", err);
    await Project.findByIdAndUpdate(projectId, {
      "heroChooser.status": "failed",
      "heroChooser.error":  (err as Error).message,
    });
    await AISession.findByIdAndUpdate(sessionId, {
      phase:  "failed",
      status: "failed",
      error:  (err as Error).message,
    });
    throw err;
  }

  const refinedHtml = sanitizeHeroHtml(rawHtml);
  if (!refinedHtml) {
    const msg = `Refinement produced no parseable HTML (got ${rawHtml.length} chars)`;
    await Project.findByIdAndUpdate(projectId, {
      "heroChooser.status": "failed",
      "heroChooser.error":  msg,
    });
    await AISession.findByIdAndUpdate(sessionId, {
      phase:  "failed",
      status: "failed",
      error:  msg,
    });
    throw new Error(msg);
  }

  // Overwrite the picked variant's HTML in place. Using $ positional
  // with `arrayFilters` would be more idiomatic, but the array is
  // always exactly 3 entries so we rebuild it explicitly — easier to
  // reason about and cheaper for a document this small. We explicitly
  // reconstruct each entry from the 4 known fields instead of spreading
  // a Mongoose subdoc (spread of a subdoc can leak internal props).
  const updatedVariants = chooser.variants.map((v: IHeroVariant) => ({
    id:        v.id,
    flavor:    v.flavor,
    html:      v.id === pickedId ? refinedHtml : v.html,
    direction: v.direction,
  }));

  await Project.findByIdAndUpdate(projectId, {
    "heroChooser.status":   "refined",
    "heroChooser.variants": updatedVariants,
    "heroChooser.lockedAt": new Date(),
  });

  await AISession.findByIdAndUpdate(sessionId, {
    phase:  "ready",
    status: "completed",
  });

  log(`✨ Hero-chooser: refined ${pickedId} for project ${projectId}`);

  return {
    id:        pickedId as VariantId,
    flavor:    picked.flavor,
    html:      refinedHtml,
    direction: picked.direction,
  };
}

/**
 * Read-back helper the route can use to serve GET /hero. Returns the
 * current hero-chooser state without side effects — useful when the
 * user reloads the page mid-flow.
 */
export async function getHeroChooserState(
  projectId: string,
  agencyId:  string
): Promise<{
  status:           string;
  variants:         HeroVariantResult[];
  pickedVariantId?: string;
  refinementText?:  string;
} | null> {
  const project = await Project.findOne({ _id: projectId, agencyId });
  if (!project) return null;
  const chooser = project.heroChooser as IHeroChooser | undefined;
  if (!chooser) return null;

  return {
    status:          chooser.status,
    variants:        chooser.variants.map((v: IHeroVariant) => ({
      id:        v.id as VariantId,
      flavor:    v.flavor,
      html:      v.html,
      direction: v.direction,
    })),
    pickedVariantId: chooser.pickedVariantId,
    refinementText:  chooser.refinementText,
  };
}

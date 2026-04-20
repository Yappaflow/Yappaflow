import { ChatMessage } from "../models/ChatMessage.model";
import { Signal } from "../models/Signal.model";
import { Project, IProjectIdentity, IProduct, IProductVariant } from "../models/Project.model";
import { analyzeOnce, extractJSON } from "./ai-client.service";
import { getExtractIdentityPrompt } from "../ai/prompts/extract-identity.prompt";
import { decryptText, isEncryptionEnabled } from "./encryption.service";
import { log, logError } from "../utils/logger";

interface ExtractedVariant {
  label?:  unknown;
  price?:  unknown;
  sku?:    unknown;
}

interface ExtractedProduct {
  name?:        unknown;
  price?:       unknown;
  currency?:    unknown;
  description?: unknown;
  images?:      unknown;
  variantKind?: unknown;
  variants?:    unknown;
  sku?:         unknown;
}

interface ExtractedIdentity {
  businessName:      string;
  tagline?:          string;
  industry?:         string;
  tone?:             string;
  city?:             string;
  domainSuggestions: string[];
  products?:         ExtractedProduct[];
}

const MAX_MESSAGES   = 200;
const MAX_CHARS_TRAN = 30_000;
const MAX_PRODUCTS   = 8;
const MAX_VARIANTS   = 12;

function formatTranscript(
  messages: Array<{
    direction:   string;
    senderName:  string;
    text:        string;
    encrypted?:  boolean;
    iv?:         string;
    timestamp:   Date;
  }>,
  userId: string
): string {
  const lines: string[] = [];
  const canDecrypt = isEncryptionEnabled();

  for (const msg of messages) {
    let text = msg.text;
    if (msg.encrypted && msg.iv && canDecrypt) {
      try {
        text = decryptText(msg.text, msg.iv, userId);
      } catch (err) {
        text = "[encrypted message]";
      }
    } else if (msg.encrypted && !canDecrypt) {
      text = "[encrypted message — key missing]";
    }

    if (!text.trim()) continue;

    const role = msg.direction === "inbound" ? "CLIENT" : "AGENCY";
    lines.push(`${role} (${msg.senderName}): ${text}`);
  }

  let transcript = lines.join("\n");
  if (transcript.length > MAX_CHARS_TRAN) {
    transcript = transcript.slice(-MAX_CHARS_TRAN);
    transcript = "… [earlier messages truncated] …\n" + transcript;
  }
  return transcript;
}

function asString(v: unknown, max = 200): string | undefined {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function asPositiveNumber(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Number(n.toFixed(2)) : undefined;
}

function sanitizeVariants(raw: unknown): IProductVariant[] {
  if (!Array.isArray(raw)) return [];
  const out: IProductVariant[] = [];
  for (const v of raw.slice(0, MAX_VARIANTS)) {
    if (!v || typeof v !== "object") continue;
    const label = asString((v as ExtractedVariant).label, 40);
    if (!label) continue;
    const price = asPositiveNumber((v as ExtractedVariant).price);
    const sku   = asString((v as ExtractedVariant).sku, 40);
    out.push({ label, ...(price !== undefined ? { price } : {}), ...(sku ? { sku } : {}) });
  }
  return out;
}

function sanitizeProducts(raw: unknown): IProduct[] {
  if (!Array.isArray(raw)) return [];
  const out: IProduct[] = [];
  for (const p of raw.slice(0, MAX_PRODUCTS)) {
    if (!p || typeof p !== "object") continue;
    const name  = asString((p as ExtractedProduct).name, 120);
    const price = asPositiveNumber((p as ExtractedProduct).price);
    if (!name || price === undefined) continue;

    const currency    = asString((p as ExtractedProduct).currency, 6)?.toUpperCase();
    const description = asString((p as ExtractedProduct).description, 400);
    const variantKind = asString((p as ExtractedProduct).variantKind, 24)?.toLowerCase();
    const sku         = asString((p as ExtractedProduct).sku, 40);

    const imagesRaw = (p as ExtractedProduct).images;
    const images = Array.isArray(imagesRaw)
      ? imagesRaw
          .map((u) => asString(u, 400))
          .filter((u): u is string => !!u && /^(https?:|data:)/i.test(u))
          .slice(0, 6)
      : [];

    const variants = sanitizeVariants((p as ExtractedProduct).variants);

    out.push({
      name,
      price,
      ...(currency    ? { currency } : {}),
      ...(description ? { description } : {}),
      ...(images.length ? { images } : {}),
      ...(variantKind ? { variantKind } : {}),
      ...(variants.length ? { variants } : {}),
      ...(sku ? { sku } : {}),
    });
  }
  return out;
}

export async function extractBusinessIdentity(
  signalId: string,
  agencyId: string
): Promise<IProjectIdentity> {
  const signal = await Signal.findOne({ _id: signalId, agencyId }).lean();
  if (!signal) throw new Error("Signal not found");

  const messages = await ChatMessage.find({ signalId, agencyId })
    .sort({ timestamp: 1 })
    .limit(MAX_MESSAGES)
    .lean();

  if (messages.length === 0) {
    throw new Error("No messages found for this signal");
  }

  const transcript = formatTranscript(messages as any[], agencyId);

  const systemPrompt = getExtractIdentityPrompt();
  const userContent =
    `## Conversation with ${(signal as any).senderName} via ${(signal as any).platform}\n\n` +
    transcript;

  log(`🪪 Extracting identity from signal ${signalId} (${messages.length} messages, ${transcript.length} chars)`);

  let raw: string;
  try {
    // Extra tokens give the model room for the products array.
    const { text } = await analyzeOnce(systemPrompt, userContent, {
      phase: "analyzing",           // Turkish chat → identity JSON, language-heavy
      maxTokens: 2048,
      includeDesignSystem: false,
    });
    raw = text;
  } catch (err) {
    logError("extractBusinessIdentity AI call failed", err);
    throw err;
  }

  let parsed: ExtractedIdentity;
  try {
    parsed = extractJSON<ExtractedIdentity>(raw);
  } catch (err) {
    logError("extractBusinessIdentity JSON parse failed", err);
    throw new Error("Could not parse identity JSON from AI response");
  }

  if (!parsed.businessName || !Array.isArray(parsed.domainSuggestions)) {
    throw new Error("Identity response missing required fields");
  }

  const products = sanitizeProducts(parsed.products);

  const identity: IProjectIdentity = {
    businessName:      parsed.businessName.trim().slice(0, 120),
    tagline:           parsed.tagline?.trim().slice(0, 200),
    industry:          parsed.industry?.trim().slice(0, 60),
    tone:              parsed.tone?.trim().slice(0, 120),
    city:              parsed.city?.trim().slice(0, 60),
    domainSuggestions: parsed.domainSuggestions
      .map((d) => d.trim().toLowerCase())
      .filter((d) => /^[a-z0-9-]+\.[a-z]{2,}$/.test(d))
      .slice(0, 5),
    ...(products.length ? { products } : {}),
    extractedAt:       new Date(),
  };

  log(
    `   → ${identity.businessName} (${identity.industry ?? "industry unknown"}) — ` +
    `${identity.domainSuggestions.length} domains, ${products.length} products`
  );

  return identity;
}

export async function findOrCreateProjectForSignal(
  signalId: string,
  agencyId: string
): Promise<string> {
  const signal = await Signal.findOne({ _id: signalId, agencyId });
  if (!signal) throw new Error("Signal not found");

  let project = await Project.findOne({
    agencyId,
    signalId,
    platform: "custom",
  });

  if (!project) {
    project = await Project.create({
      agencyId,
      signalId,
      platform:   "custom",
      phase:      "deploying",
      clientName: signal.senderName,
      name:       `${signal.senderName} — Custom Deploy`,
      progress:   10,
    });
  }

  return project._id.toString();
}

/**
 * Same flow as `findOrCreateProjectForSignal` but pinned to a given platform.
 * Used by the Shopify deploy flow.
 */
export async function findOrCreateProjectForSignalOnPlatform(
  signalId: string,
  agencyId: string,
  platform: "shopify" | "custom" | "wordpress" | "webflow" | "ikas"
): Promise<string> {
  const signal = await Signal.findOne({ _id: signalId, agencyId });
  if (!signal) throw new Error("Signal not found");

  let project = await Project.findOne({ agencyId, signalId, platform });

  if (!project) {
    project = await Project.create({
      agencyId,
      signalId,
      platform,
      phase:      "deploying",
      clientName: signal.senderName,
      name:       `${signal.senderName} — ${platform[0].toUpperCase()}${platform.slice(1)} Deploy`,
      progress:   10,
    });
  }

  return project._id.toString();
}

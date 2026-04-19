import { ChatMessage } from "../models/ChatMessage.model";
import { Signal } from "../models/Signal.model";
import { Project, IProjectIdentity } from "../models/Project.model";
import { analyzeOnce, extractJSON } from "./ai-client.service";
import { getExtractIdentityPrompt } from "../ai/prompts/extract-identity.prompt";
import { decryptText, isEncryptionEnabled } from "./encryption.service";
import { log, logError } from "../utils/logger";

interface ExtractedIdentity {
  businessName:      string;
  tagline?:          string;
  industry?:         string;
  tone?:             string;
  city?:             string;
  domainSuggestions: string[];
}

const MAX_MESSAGES   = 200;
const MAX_CHARS_TRAN = 30_000;

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
    const { text } = await analyzeOnce(systemPrompt, userContent, { maxTokens: 1024 });
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
    extractedAt:       new Date(),
  };

  log(`   → ${identity.businessName} (${identity.industry ?? "industry unknown"}) — ${identity.domainSuggestions.length} domain suggestions`);

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

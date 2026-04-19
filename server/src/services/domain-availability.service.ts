import { log } from "../utils/logger";

type AvailabilityResult =
  | { available: true }
  | { available: false; reason: "registered" }
  | { available: null; reason: "unknown" | "invalid" | "timeout" };

const DOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,24})+$/i;

// RFC-like WHOIS "not found" markers — case-insensitive substring match.
const NOT_FOUND_PATTERNS = [
  "no match for",
  "no entries found",
  "not found",
  "no data found",
  "domain not found",
  "no match!",
  "status: free",
  "status: available",
  "available for registration",
  "is available",
];

const REGISTERED_MARKERS = [
  "registrar:",
  "creation date:",
  "created:",
  "registered on:",
  "registrant:",
  "domain status: ok",
];

function normalize(s: string): string {
  return s.toLowerCase();
}

export function isValidDomain(name: string): boolean {
  const trimmed = name.trim().toLowerCase();
  if (trimmed.length < 4 || trimmed.length > 253) return false;
  return DOMAIN_RE.test(trimmed);
}

export async function checkDomainAvailability(name: string): Promise<AvailabilityResult> {
  if (!isValidDomain(name)) {
    return { available: null, reason: "invalid" };
  }

  let whoisDomain: (domain: string, options?: any) => Promise<any>;
  try {
    // Dynamic import — whoiser is ESM-only in v2+.
    const mod = (await import("whoiser")) as any;
    whoisDomain = mod.whoisDomain ?? mod.default?.whoisDomain ?? mod.default;
    if (typeof whoisDomain !== "function") {
      throw new Error("whoiser whoisDomain export not found");
    }
  } catch (err) {
    log(`whoiser import failed: ${(err as Error).message}`);
    return { available: null, reason: "unknown" };
  }

  try {
    const lookup = whoisDomain(name.trim().toLowerCase(), { timeout: 5000 });

    const result: any = await Promise.race([
      lookup,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("whois-timeout")), 5500)
      ),
    ]);

    // whoiser returns a dictionary keyed by server; stringify the whole thing and pattern-match.
    const blob = normalize(JSON.stringify(result));

    // Check explicit not-found markers first.
    for (const marker of NOT_FOUND_PATTERNS) {
      if (blob.includes(marker)) {
        return { available: true };
      }
    }

    // Check registered markers.
    for (const marker of REGISTERED_MARKERS) {
      if (blob.includes(marker)) {
        return { available: false, reason: "registered" };
      }
    }

    // Fallback — no strong signal either way.
    return { available: null, reason: "unknown" };
  } catch (err) {
    const msg = (err as Error).message || "";
    if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) {
      return { available: null, reason: "timeout" };
    }
    log(`whois lookup error for ${name}: ${msg}`);
    return { available: null, reason: "unknown" };
  }
}

import { env } from "../config/env";

/**
 * Build a deep-link to Namecheap's domain-search results page pre-filled
 * with the requested domain. If a NAMECHEAP_AFFILIATE_ID is configured,
 * append it so purchases are attributed.
 */
export function buildNamecheapUrl(domain: string): string {
  const clean = domain.trim().toLowerCase();
  const base = new URL("https://www.namecheap.com/domains/registration/results/");
  base.searchParams.set("domain", clean);
  if (env.namecheapAffiliateId) {
    base.searchParams.set("aff", env.namecheapAffiliateId);
  }
  return base.toString();
}

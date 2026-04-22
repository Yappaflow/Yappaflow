/**
 * rank_references — score candidates on two axes (concept fit × craft fit)
 * and return a Pareto-sorted list.
 *
 * Scoring:
 *   - concept_score: how well the content model and industry of the reference match the brief
 *   - craft_score:   how well typography/palette/motion character match the brief
 *
 * Backends:
 *   - VOYAGE_API_KEY present → embed brief + reference signatures, use cosine similarity
 *   - otherwise             → deterministic token-overlap. Good enough to test ordering.
 */

import type { Config } from "../config.js";
import type { Brief } from "./brief.js";
import { briefToSentence } from "./brief.js";
import type { DesignDna } from "../types.js";

export type ReferenceInput = { url: string; dna: DesignDna };

export type RankedReference = ReferenceInput & {
  conceptScore: number;
  craftScore: number;
  paretoRank: number; // 0 = on the frontier
  signature: {
    concept: string;
    craft: string;
  };
};

export async function rankReferences(params: {
  brief: Brief;
  references: ReferenceInput[];
  config: Config;
}): Promise<RankedReference[]> {
  const { brief, references, config } = params;
  const briefConcept = briefConceptSignature(brief);
  const briefCraft = briefCraftSignature(brief);

  const scored = await Promise.all(
    references.map(async (ref) => {
      const concept = conceptSignature(ref.dna);
      const craft = craftSignature(ref.dna);

      let conceptScore: number;
      let craftScore: number;
      if (config.voyage.apiKey) {
        const [c, k] = await Promise.all([
          embedSim(briefConcept, concept, config),
          embedSim(briefCraft, craft, config),
        ]).catch(() => [tokenSim(briefConcept, concept), tokenSim(briefCraft, craft)] as [number, number]);
        conceptScore = c;
        craftScore = k;
      } else {
        conceptScore = tokenSim(briefConcept, concept);
        craftScore = tokenSim(briefCraft, craft);
      }

      return {
        ...ref,
        conceptScore,
        craftScore,
        paretoRank: 0,
        signature: { concept, craft },
      } as RankedReference;
    }),
  );

  // Assign Pareto rank
  assignParetoRanks(scored);
  // Sort: rank asc, then by combined score desc
  scored.sort((a, b) => {
    if (a.paretoRank !== b.paretoRank) return a.paretoRank - b.paretoRank;
    return b.conceptScore + b.craftScore - (a.conceptScore + a.craftScore);
  });
  return scored;
}

// ----------------- signatures -----------------

function briefConceptSignature(b: Brief): string {
  return [b.industry, b.subcategory, b.audience, b.content_model.join(" "), briefToSentence(b)]
    .filter(Boolean)
    .join(" ");
}

function briefCraftSignature(b: Brief): string {
  return [b.palette_character, b.motion_ambition, b.tone, b.grid_archetype.replace(/_/g, " ")]
    .filter(Boolean)
    .join(" ");
}

function conceptSignature(dna: DesignDna): string {
  const title = dna.meta.title ?? "";
  const desc = dna.meta.description ?? "";
  const grid = dna.grid.rhythm;
  const containerCount = dna.grid.containers.length;
  return [
    title,
    desc,
    `sections=${containerCount}`,
    `maxWidth=${grid.maxWidth ?? ""}`,
    `gap=${grid.gap ?? ""}`,
    dna.stack.libraries.join(" "),
  ]
    .filter(Boolean)
    .join(" ");
}

function craftSignature(dna: DesignDna): string {
  const topStyles = dna.typography.styles.slice(0, 4).map((s) => `${s.family}@${s.size}`);
  const palette = [
    ...dna.colors.summary.backgrounds,
    ...dna.colors.summary.foregrounds,
    ...dna.colors.summary.accents,
  ];
  const topTransitions = dna.motion.transitions
    .slice(0, 3)
    .map((t) => `${t.property}/${t.duration}`);
  return [topStyles.join(" "), palette.join(" "), topTransitions.join(" "), dna.motion.scrollHints.join(" ")]
    .filter(Boolean)
    .join(" ");
}

// ----------------- similarity -----------------

function tokenSim(a: string, b: string): number {
  const toks = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9@/._\s-]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 1),
    );
  const A = toks(a);
  const B = toks(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((t) => {
    if (B.has(t)) inter += 1;
  });
  return inter / Math.sqrt(A.size * B.size);
}

async function embedSim(a: string, b: string, config: Config): Promise<number> {
  const res = await fetch(`${config.voyage.baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.voyage.apiKey}`,
    },
    body: JSON.stringify({
      model: config.voyage.model,
      input: [a, b],
      input_type: "document",
    }),
  });
  if (!res.ok) throw new Error(`voyage embed ${res.status}`);
  const body = (await res.json()) as { data: Array<{ embedding: number[] }> };
  const [va, vb] = body.data.map((d) => d.embedding);
  if (!va || !vb) throw new Error("voyage: missing embeddings");
  return cosine(va, vb);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

// ----------------- pareto -----------------

function assignParetoRanks(items: Array<{ conceptScore: number; craftScore: number; paretoRank: number }>) {
  // Simple O(n^2) fast-nondominated-sort
  const remaining = items.map((it, i) => ({ it, i, dominatedBy: 0 }));
  let rank = 0;
  while (remaining.length) {
    const frontier: typeof remaining = [];
    for (const a of remaining) {
      let dominated = 0;
      for (const b of remaining) {
        if (
          b.it.conceptScore >= a.it.conceptScore &&
          b.it.craftScore >= a.it.craftScore &&
          (b.it.conceptScore > a.it.conceptScore || b.it.craftScore > a.it.craftScore)
        ) {
          dominated += 1;
        }
      }
      if (dominated === 0) frontier.push(a);
    }
    for (const f of frontier) {
      f.it.paretoRank = rank;
      const idx = remaining.indexOf(f);
      if (idx >= 0) remaining.splice(idx, 1);
    }
    if (frontier.length === 0) {
      // defensive: shouldn't happen but avoid infinite loop
      for (const r of remaining) r.it.paretoRank = rank;
      break;
    }
    rank += 1;
  }
}

import { catalog, hasTerm, type SkillSeed } from "./preview-analysis.ts";

export type Chunk = { id: string; index: number; text: string };

export type RetrievalStep = {
  skill: string;
  query: string[];
  chunksConsidered: number;
  bestChunk?: Chunk;
  matchedTerms: string[];
  grounded: boolean;
  score: number;
};

const actionVerb = /\b(built|created|developed|deployed|analysed|analyzed|implemented|configured|investigated|automated|documented)\b/i;

/**
 * Splits résumé text into retrievable passages: one chunk per line or
 * sentence, matching the grain the UI shows as a quote.
 */
export function chunkResume(text: string): Chunk[] {
  return text
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((chunkText, index) => ({ id: `chunk-${index}`, index, text: chunkText }));
}

/**
 * A quote only counts as grounded when it is a literal substring of the
 * source text it claims to come from. An ungrounded quote must score 0.
 */
export function verifyQuote(sourceText: string, quote: string): boolean {
  const wanted = normaliseForQuote(quote);
  if (!wanted) return false;
  return normaliseForQuote(sourceText).includes(wanted);
}

/** Case, whitespace and typographic quote/dash differences do not make a quote non-literal; words still must match. */
export function normaliseForQuote(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Applies the grounding rule: an evidence score with no verified quote is 0. */
export function scoreWithGrounding(evidence: number, quote: string | undefined, sourceText: string): number {
  if (!quote || !verifyQuote(sourceText, quote)) return 0;
  return evidence;
}

export function retrieveForSkill(chunks: Chunk[], seed: Pick<SkillSeed, "name" | "terms">): RetrievalStep {
  const ranked = chunks
    .map((chunk) => ({ chunk, matched: seed.terms.filter((term) => hasTerm(chunk.text, term)) }))
    .filter((item) => item.matched.length > 0)
    .sort((a, b) => (b.matched.length + Number(actionVerb.test(b.chunk.text))) - (a.matched.length + Number(actionVerb.test(a.chunk.text))));
  const best = ranked[0];
  return {
    skill: seed.name,
    query: seed.terms,
    chunksConsidered: chunks.length,
    bestChunk: best?.chunk,
    matchedTerms: best?.matched ?? [],
    grounded: best ? verifyQuote(best.chunk.text, best.chunk.text) : false,
    score: best ? best.matched.length + Number(actionVerb.test(best.chunk.text)) : 0,
  };
}

/**
 * Runs retrieval for every catalog skill the job text or résumé chunks
 * mention, so the UI can show which passages backed each score.
 */
export function buildRetrievalSteps(chunks: Chunk[], jobText: string, skills: SkillSeed[] = catalog): RetrievalStep[] {
  return skills
    .filter((seed) => seed.terms.some((term) => hasTerm(jobText, term)) || chunks.some((chunk) => seed.terms.some((term) => hasTerm(chunk.text, term))))
    .map((seed) => retrieveForSkill(chunks, seed))
    .sort((a, b) => b.score - a.score);
}

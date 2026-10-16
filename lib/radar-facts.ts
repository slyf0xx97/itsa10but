/** The numbers behind the three quick-fact tiles next to the radar. Pure, built only from the skills the analysis already holds. */
import type { Skill } from "./analysis-types.ts";
import { quoteCount } from "./dashboard-data.ts";
import { PROOF_STEP_TOTAL, proofCount, stepsDone, stepsMissing } from "./proof-steps.ts";
import { verdictOf, type Verdict } from "./skill-levels.ts";

/** How many skills each tile lists. */
export const TILE_ROWS = 3;
/** The gap list can show one more, since each is a short pill. */
export const GAP_ROWS = 4;

/** `steps` is the proof steps passed (0 to 5), `have` what they are in words, and `fix` the first step still missing (empty when all five are done). */
export type FactRow = { name: string; demand: number; evidence: number; hasQuote: boolean; steps: number; have: string; fix: string; /** The line in the résumé that backs the skill, or "". */ resumeQuote: string; /** The line in the role text that asks for it, or "". */ roleQuote: string };
export type GapRow = FactRow & { short: number };
export type Verdicts = Record<Verdict, number>;

/** A quote cut to fit a tile: whole words, ending in an ellipsis when it was shortened. */
export function shortQuote(quote: string, max = 90): string {
  // Trailing full stops go, so a quote can sit inside quotation marks before a full stop of its own.
  const text = quote.replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

const num = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0);

export function radarFacts(skills: Skill[]): { best: FactRow[]; gaps: GapRow[]; gapCount: number; verdicts: Verdicts; total: number; quotes: number; lead: FactRow | undefined; missing: string[] } {
  const rows: FactRow[] = skills.map((skill) => {
    const evidence = num(skill.evidence);
    return { name: skill.name, demand: num(skill.demand), evidence, hasQuote: Boolean(skill.resumeQuote), steps: proofCount(skill), have: stepsDone(skill).map((step) => step.have).join(", "), fix: stepsMissing(skill)[0]?.fix ?? "", resumeQuote: skill.resumeQuote?.quote ?? "", roleQuote: skill.roleQuote?.quote ?? "" };
  });
  // Array.sort is stable, so ties keep the order the analysis gave.
  const best = rows.filter((row) => row.evidence > 0).sort((a, b) => b.evidence - a.evidence || b.demand - a.demand);
  // A gap is a skill the proof does not yet cover (verdict Add proof or Missing), so this tile and the Match tile always agree.
  const verdicts: Verdicts = { covered: 0, add: 0, missing: 0 };
  // A skill the role does not ask for (demand 0) has nothing to cover, so it counts as covered.
  const verdict = (row: FactRow): Verdict => (row.demand > 0 ? verdictOf(row.demand, row.evidence) : "covered");
  for (const row of rows) verdicts[verdict(row)] += 1;
  const gaps = rows.filter((row) => verdict(row) !== "covered").map((row) => ({ ...row, short: Math.max(0, row.demand - row.evidence) })).sort((a, b) => b.short - a.short);
  // The skill to lead with: the strongest proof among the skills the role clearly asks for, else simply the strongest.
  const lead = best.find((row) => row.demand >= 70) ?? best[0];
  const missing = rows.filter((row) => verdict(row) === "missing").sort((a, b) => b.demand - a.demand).map((row) => row.name);
  return { best: best.slice(0, TILE_ROWS), gaps: gaps.slice(0, GAP_ROWS), gapCount: gaps.length, verdicts, total: rows.length, quotes: quoteCount(skills), lead, missing };
}

export { PROOF_STEP_TOTAL };

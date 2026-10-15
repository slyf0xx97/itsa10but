/** The numbers behind the three quick-fact tiles next to the radar. Pure, built only from the skills the analysis already holds. */
import type { Skill } from "./analysis-types.ts";
import { quoteCount } from "./dashboard-data.ts";
import { proofOf } from "./skill-levels.ts";

/** How many skills each tile lists. */
export const TILE_ROWS = 3;

export type FactRow = { name: string; demand: number; evidence: number; hasQuote: boolean };
export type GapRow = FactRow & { short: number };
export type Levels = { strong: number; some: number; weak: number };

const num = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0);

export function radarFacts(skills: Skill[]): { best: FactRow[]; gaps: GapRow[]; gapCount: number; levels: Levels; total: number; quotes: number } {
  const rows = skills.map((skill) => ({ name: skill.name, demand: num(skill.demand), evidence: num(skill.evidence), hasQuote: Boolean(skill.resumeQuote) }));
  // Array.sort is stable, so ties keep the order the analysis gave.
  const best = rows.filter((row) => row.evidence > 0).sort((a, b) => b.evidence - a.evidence || b.demand - a.demand);
  const gaps = rows.filter((row) => row.demand > row.evidence).map((row) => ({ ...row, short: row.demand - row.evidence })).sort((a, b) => b.short - a.short);
  const levels: Levels = { strong: 0, some: 0, weak: 0 };
  for (const row of rows) {
    const level = proofOf(row.evidence);
    if (level === "Strong") levels.strong += 1;
    else if (level === "Some") levels.some += 1;
    else levels.weak += 1; // Weak and None share one bucket: the proof is under 40.
  }
  return { best: best.slice(0, TILE_ROWS), gaps: gaps.slice(0, TILE_ROWS), gapCount: gaps.length, levels, total: rows.length, quotes: quoteCount(skills) };
}

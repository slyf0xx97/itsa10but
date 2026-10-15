/** Tier and proof logic for the skills overview. Pure, so it is tested without a browser. */

export type Tier = "expected" | "good" | "extra";
export type ProofState = "have" | "gap";

export const TIERS: readonly Tier[] = ["expected", "good", "extra"];
export const TIER_LABEL: Record<Tier, string> = { expected: "Expected", good: "Good to have", extra: "Extra" };
/** How much the role asks for a skill (Skill.demand): at or above this, the skill is Expected. */
export const EXPECTED_FROM = 70;
export const GOOD_FROM = 40;
/** Skill.evidence at or above this counts as proven in the résumé. */
export const HAVE_FROM = 35;

const norm = (value: number) => (Number.isFinite(value) ? value : 0);
export const tierOf = (demand: number): Tier => (norm(demand) >= EXPECTED_FROM ? "expected" : norm(demand) >= GOOD_FROM ? "good" : "extra");
export const stateOf = (evidence: number): ProofState => (norm(evidence) >= HAVE_FROM ? "have" : "gap");

/** Skills grouped by tier, in a stable order: higher demand first, then the input order. */
export function groupByTier<T extends { demand: number }>(skills: T[]): Record<Tier, T[]> {
  const out: Record<Tier, T[]> = { expected: [], good: [], extra: [] };
  skills
    .map((skill, index) => ({ skill, index }))
    .sort((a, b) => norm(b.skill.demand) - norm(a.skill.demand) || a.index - b.index)
    .forEach(({ skill }) => out[tierOf(skill.demand)].push(skill));
  return out;
}

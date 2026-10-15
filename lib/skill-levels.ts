/** Plain-word levels for a skill row: what the role wants, what the résumé shows, and what to do about it. Pure; the numbers stay in the popup. */
import { tierOf } from "./radar-tiers.ts";

export type Want = "High" | "Medium" | "Low";
export type Proof = "Strong" | "Some" | "Weak" | "None";
export type Verdict = "covered" | "add" | "missing";

/** Skill.evidence at or above these counts as Strong / Some; 1 and up is Weak; 0 is None. */
export const STRONG_FROM = 70;
export const SOME_FROM = 40;

const num = (value: number) => (Number.isFinite(value) ? value : 0);
const WANT_BY_TIER = { expected: "High", good: "Medium", extra: "Low" } as const;
const WANT_DOTS: Record<Want, number> = { High: 3, Medium: 2, Low: 1 };
const PROOF_RANK: Record<Proof, number> = { None: 0, Weak: 1, Some: 2, Strong: 3 };

export const wantOf = (demand: number): Want => WANT_BY_TIER[tierOf(demand)];
/** 1 to 3 filled dots. */
export const wantDots = (want: Want): number => WANT_DOTS[want];

export function proofOf(evidence: number): Proof {
  const value = num(evidence);
  return value >= STRONG_FROM ? "Strong" : value >= SOME_FROM ? "Some" : value > 0 ? "Weak" : "None";
}
/** Filled steps of the 4-step bar: 0 None, 1 Weak, 2 Some, 3 Strong, 4 Strong from 85. */
export const proofSteps = (evidence: number): number => (num(evidence) >= 85 ? 4 : PROOF_RANK[proofOf(evidence)]);

/** Missing: no proof at all for something the role cares about. Covered: the proof level reaches the ask (High needs Strong, Medium needs Some, Low needs Weak). Otherwise: add proof. */
export function verdictOf(demand: number, evidence: number): Verdict {
  const want = wantOf(demand);
  const proof = proofOf(evidence);
  if (proof === "None" && want !== "Low") return "missing";
  return PROOF_RANK[proof] >= WANT_DOTS[want] ? "covered" : "add";
}

export const VERDICT_LABEL: Record<Verdict, string> = { covered: "Covered", add: "Add proof", missing: "Missing" };

/** One sentence in plain words for the popup. */
export function whyLine(demand: number, evidence: number): string {
  const want = wantOf(demand).toLowerCase();
  const proof = proofOf(evidence).toLowerCase();
  const verdict = verdictOf(demand, evidence);
  if (verdict === "missing") return `The role puts this at ${want} priority and your résumé shows nothing for it yet.`;
  if (verdict === "add") return `The role puts this at ${want} priority, but ${proof === "none" ? "you have no proof" : `your proof is ${proof}`} so far. One clearer example would close the gap.`;
  return `Your proof is ${proof}, which is enough for a ${want} priority skill.`;
}

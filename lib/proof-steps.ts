/**
 * The five proof steps behind a skill's score, in plain words. The native scan awards points for each one (evidence-scoring.ts), so a score of 70 means
 * three steps are done. Counting steps turns "70 of what?" into "3 of 5, and these two are missing". Pure, so it is tested without a browser.
 */
import type { Skill } from "./analysis-types.ts";
import { sumParts } from "./scoring.ts";

export type ProofStep = { label: string; name: string; have: string; fix: string };

/** `label` is the exact rule label the native scan writes into Skill.breakdown. */
export const PROOF_STEPS: readonly ProofStep[] = [
  { label: "Skill named in a résumé passage", name: "Named", have: "named in a line", fix: "Name it in a résumé line" },
  { label: "Used in a project or work action", name: "Used", have: "used in real work", fix: "Show what you built or did with it" },
  { label: "Quantified result or scope", name: "Number", have: "has a number", fix: "Add a number, like users or time saved" },
  { label: "Outcome described", name: "Result", have: "shows a result", fix: "Say what changed because of it" },
  { label: "Second distinct supporting passage", name: "Twice", have: "shown twice", fix: "Show it in a second line or project" },
];
export const PROOF_STEP_TOTAL = PROOF_STEPS.length;

type Scored = Pick<Skill, "evidence" | "breakdown">;
const score = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0);

/**
 * The steps this skill passes. It is exact when the score came from the rules (the points in the breakdown add up to the score). Any other score, such as one
 * from the API boost agents, is read in fifths and credits the steps in order, because a model's score has no step list behind it.
 */
export function stepsDone(skill: Scored): ProofStep[] {
  const value = score(skill.evidence);
  const parts = skill.breakdown?.parts;
  if (parts && sumParts(parts) === value) {
    const labels = new Set(parts.map((part) => part.label));
    return PROOF_STEPS.filter((step) => labels.has(step.label));
  }
  return PROOF_STEPS.slice(0, Math.min(PROOF_STEP_TOTAL, Math.round(value / (100 / PROOF_STEP_TOTAL))));
}

export const proofCount = (skill: Scored): number => stepsDone(skill).length;

/** The steps still missing, in the order to do them. */
export function stepsMissing(skill: Scored): ProofStep[] {
  const done = new Set(stepsDone(skill));
  return PROOF_STEPS.filter((step) => !done.has(step));
}

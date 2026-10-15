import type { EvidenceQuote } from "./analysis-types";

export type ScorePart = { label: string; points: number; line?: EvidenceQuote };
export type SkillBreakdown = {
  parts: ScorePart[];
  demandParts: ScorePart[];
  jobLine: EvidenceQuote | null;
  resumeLines: EvidenceQuote[];
  missing: string[];
};

export function sumParts(parts: ScorePart[]): number {
  return Math.max(0, Math.min(100, Math.round(parts.reduce((total, part) => total + part.points, 0))));
}

export function computeMatch(skills: Array<{ name: string; demand: number; evidence: number }>): { percent: number; formula: string } {
  const totalDemand = skills.reduce((sum, skill) => sum + skill.demand, 0);
  if (!skills.length || !totalDemand) return { percent: 0, formula: "No weighted skills available." };
  const weightedSum = skills.reduce((sum, skill) => sum + skill.evidence * skill.demand, 0);
  const percent = Math.round(weightedSum / totalDemand);
  const terms = skills.map((skill) => `${skill.evidence}×${skill.demand}`).join(" + ");
  const weights = skills.map((skill) => String(skill.demand)).join("+");
  return { percent, formula: `(${terms}) ÷ (${weights}) = ${percent}%` };
}

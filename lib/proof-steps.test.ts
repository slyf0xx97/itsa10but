import assert from "node:assert/strict";
import test from "node:test";
import type { Skill } from "./analysis-types.ts";
import { PROOF_STEPS, proofCount, stepsDone, stepsMissing } from "./proof-steps.ts";
import { scoreEvidence } from "./evidence-scoring.ts";

const line = { label: "résumé", quote: "q", matched: ["x"] };
const scored = (labels: string[], points: number[]) => ({
  evidence: points.reduce((a, b) => a + b, 0),
  breakdown: { parts: labels.map((label, i) => ({ label, points: points[i], line })), demandParts: [], jobLine: null, resumeLines: [], missing: [] },
}) as Pick<Skill, "evidence" | "breakdown">;

test("the five steps use the labels the native scan writes", () => {
  const result = scoreEvidence("Python", ["python"], [{ id: "a", name: "cv.txt", text: "Built a Python tool that cut report time by 40%. Reduced errors with Python tests." }], "Python required");
  const labels = new Set(result.breakdown.parts.map((part) => part.label));
  for (const label of labels) assert.ok(PROOF_STEPS.some((step) => step.label === label), label);
  assert.equal(proofCount(result), result.breakdown.parts.length);
});

test("a rules score lists exactly the steps it earned and the ones it lacks", () => {
  const skill = scored([PROOF_STEPS[0].label, PROOF_STEPS[1].label, PROOF_STEPS[4].label], [20, 25, 25]);
  assert.deepEqual(stepsDone(skill).map((step) => step.name), ["Named", "Used", "Twice"]);
  assert.deepEqual(stepsMissing(skill).map((step) => step.name), ["Number", "Result"]);
});

test("a score with no step list is read in fifths", () => {
  assert.equal(proofCount({ evidence: 0 }), 0);
  assert.equal(proofCount({ evidence: 45 }), 2);
  assert.equal(proofCount({ evidence: 84 }), 4);
  assert.equal(proofCount({ evidence: 100 }), 5);
  assert.deepEqual(stepsMissing({ evidence: 100 }), []);
});

test("a breakdown that no longer matches the score is ignored", () => {
  const skill = { ...scored([PROOF_STEPS[0].label], [20]), evidence: 85 };
  assert.equal(proofCount(skill), 4);
});

test("bad numbers count as no proof", () => {
  assert.equal(proofCount({ evidence: Number.NaN }), 0);
  assert.equal(stepsMissing({ evidence: -5 }).length, 5);
});

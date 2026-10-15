import assert from "node:assert/strict";
import test from "node:test";
import type { Skill } from "./analysis-types.ts";
import { sampleAnalysis } from "./analysis-types.ts";
import { radarFacts } from "./radar-facts.ts";

const skill = (name: string, demand: number, evidence: number, quote = false): Skill =>
  ({ name, demand, evidence, detail: "", source: "", ...(quote ? { resumeQuote: { label: "résumé", quote: "q", matched: [name] } } : {}) });

test("best lists the three strongest proofs, highest first, and skips zero proof", () => {
  const facts = radarFacts([skill("A", 50, 0), skill("B", 60, 40), skill("C", 80, 90, true), skill("D", 70, 70), skill("E", 20, 10)]);
  assert.deepEqual(facts.best.map((row) => row.name), ["C", "D", "B"]);
  assert.equal(facts.best[0].hasQuote, true);
  assert.equal(facts.quotes, 1);
});

test("gaps list the three biggest shortfalls and count all of them", () => {
  const facts = radarFacts([skill("A", 80, 0), skill("B", 60, 50), skill("C", 70, 20), skill("D", 40, 40), skill("E", 90, 10)]);
  assert.deepEqual(facts.gaps.map((row) => [row.name, row.short]), [["A", 80], ["E", 80], ["C", 50]]);
  assert.equal(facts.gapCount, 4);
});

test("levels split the skills by proof and add up to the total", () => {
  const facts = radarFacts([skill("A", 80, 90), skill("B", 60, 45), skill("C", 70, 20), skill("D", 40, 0)]);
  assert.deepEqual(facts.levels, { strong: 1, some: 1, weak: 2 });
  assert.equal(facts.total, 4);
});

test("bad numbers count as zero and nothing is invented for an empty list", () => {
  const odd = radarFacts([skill("A", Number.NaN, Number.NaN)]);
  assert.equal(odd.best.length, 0);
  assert.equal(odd.gapCount, 0);
  const empty = radarFacts([]);
  assert.deepEqual([empty.best, empty.gaps, empty.total], [[], [], 0]);
});

test("the sample result gives rows from its own skills", () => {
  const facts = radarFacts(sampleAnalysis.skills);
  const names = new Set(sampleAnalysis.skills.map((item) => item.name));
  for (const row of [...facts.best, ...facts.gaps]) assert.ok(names.has(row.name));
  assert.equal(facts.levels.strong + facts.levels.some + facts.levels.weak, sampleAnalysis.skills.length);
});

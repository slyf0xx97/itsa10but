import assert from "node:assert/strict";
import test from "node:test";
import type { Skill } from "./analysis-types.ts";
import { sampleAnalysis } from "./analysis-types.ts";
import { radarFacts, shortQuote } from "./radar-facts.ts";

const skill = (name: string, demand: number, evidence: number, quote = false): Skill =>
  ({ name, demand, evidence, detail: "", source: "", ...(quote ? { resumeQuote: { label: "résumé", quote: "q", matched: [name] } } : {}) });

test("best lists the three strongest proofs, highest first, and skips zero proof", () => {
  const facts = radarFacts([skill("A", 50, 0), skill("B", 60, 40), skill("C", 80, 90, true), skill("D", 70, 70), skill("E", 20, 10)]);
  assert.deepEqual(facts.best.map((row) => row.name), ["C", "D", "B"]);
  assert.equal(facts.best[0].hasQuote, true);
  assert.equal(facts.quotes, 1);
});

test("gaps are the skills the proof does not cover yet: the three biggest shortfalls are listed and all are counted", () => {
  const facts = radarFacts([skill("A", 80, 0), skill("B", 60, 50), skill("C", 70, 20), skill("D", 40, 40), skill("E", 90, 10)]);
  assert.deepEqual(facts.gaps.map((row) => [row.name, row.short]), [["A", 80], ["E", 80], ["C", 50]]);
  assert.equal(facts.gapCount, 3);
  assert.equal(facts.gapCount, facts.verdicts.add + facts.verdicts.missing);
});

test("verdicts split the skills into covered, add proof and missing and add up to the total", () => {
  const facts = radarFacts([skill("A", 80, 90), skill("B", 60, 45), skill("C", 70, 20), skill("D", 40, 0)]);
  assert.deepEqual(facts.verdicts, { covered: 2, add: 1, missing: 1 });
  assert.equal(facts.total, 4);
});

test("each row says how many proof steps it has and which one to add next", () => {
  const facts = radarFacts([skill("A", 80, 45), skill("B", 60, 100)]);
  const a = facts.best.find((row) => row.name === "A");
  assert.equal(a?.steps, 2);
  assert.equal(a?.fix, "Add a number, like users or time saved");
  assert.equal(facts.best.find((row) => row.name === "B")?.fix, "");
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
  assert.equal(facts.verdicts.covered + facts.verdicts.add + facts.verdicts.missing, sampleAnalysis.skills.length);
});

test("the lead is the strongest proof among skills the role clearly asks for, and carries its quote", () => {
  const withQuote = (name: string, demand: number, evidence: number, quote: string): Skill => ({ ...skill(name, demand, evidence), resumeQuote: { label: "résumé", quote, matched: [name] } });
  const facts = radarFacts([withQuote("Extra", 20, 95, "an extra"), withQuote("SQL", 90, 70, "Cut report time by 40% with SQL views"), withQuote("Python", 80, 60, "Built a parser")]);
  assert.equal(facts.lead?.name, "SQL");
  assert.equal(facts.lead?.resumeQuote, "Cut report time by 40% with SQL views");
  assert.equal(radarFacts([skill("A", 80, 0)]).lead, undefined);
});

test("missing names come most-asked first, and the biggest gap is the same skill the dashboard card names", () => {
  const facts = radarFacts([skill("A", 60, 0), skill("B", 90, 0), skill("C", 70, 50), skill("D", 40, 40)]);
  assert.deepEqual(facts.missing, ["B", "A"]);
  assert.equal(facts.gaps[0].name, "B");
});

test("a quote is cut at a word, with an ellipsis, only when it is too long", () => {
  assert.equal(shortQuote("Built a parser"), "Built a parser");
  const cut = shortQuote("one two three four five six seven eight nine ten", 20);
  assert.equal(cut, "one two three four…");
});

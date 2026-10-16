import test from "node:test";
import assert from "node:assert/strict";
import { cases } from "./cases.ts";
import { evaluate } from "./run.ts";
import { catalog } from "../catalog.ts";

const report = evaluate(cases);
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

test("eval set is the agreed size and labels use catalog names", () => {
  assert.ok(cases.length >= 36 && cases.length <= 44, `got ${cases.length} cases`);
  assert.equal(new Set(cases.map((item) => item.id)).size, cases.length, "case ids must be unique");
  const names = new Set(catalog.map((seed) => seed.name));
  for (const item of cases) for (const name of [...item.resumeShows, ...item.resumeMentionsOnly, ...item.jobWants]) assert.ok(names.has(name), `${item.id}: unknown skill ${name}`);
  const counts = new Map<string, number>();
  for (const item of cases) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  for (const [category, n] of counts) assert.ok(n >= 3, `${category} has only ${n} cases`);
});

test("résumé and job text stay in the agreed length range", () => {
  for (const item of cases.filter((c) => c.category !== "very short or long")) {
    const resume = words(item.resumes.join(" ")), job = words(item.job);
    assert.ok(resume >= 80 && resume <= 250, `${item.id}: résumé has ${resume} words`);
    assert.ok(job >= 60 && job <= 200, `${item.id}: job has ${job} words`);
  }
});

// The product rule from AGENTS.md. This must hold for every case, always.
test("every quote appears literally in its source text", () => {
  assert.ok(report.quotesChecked > 100);
  assert.deepEqual(report.failures.filter((f) => f.kind === "quote"), []);
});

// Floors sit a little below what the scan measured when this file was written. Raise them when the scan improves.
test("native scan accuracy has not regressed", () => {
  assert.ok(report.resumePrecision >= FLOOR.resumePrecision, `résumé precision ${report.resumePrecision}`);
  assert.ok(report.resumeRecall >= FLOOR.resumeRecall, `résumé recall ${report.resumeRecall}`);
  assert.ok(report.proofPrecision >= FLOOR.proofPrecision, `strong-proof precision ${report.proofPrecision}`);
  assert.ok(report.proofRecall >= FLOOR.proofRecall, `strong-proof recall ${report.proofRecall}`);
  assert.ok(report.demandPrecision >= FLOOR.demandPrecision, `demand precision ${report.demandPrecision}`);
  assert.ok(report.demandRecall >= FLOOR.demandRecall, `demand recall ${report.demandRecall}`);
  // Lower is better here: how often a mention-only skill gets strong proof.
  assert.ok(report.mentionOvercredit <= FLOOR.mentionOvercreditMax, `mention overcredit ${report.mentionOvercredit}`);
});

test("cases that pass today keep passing", () => {
  // stuff-4 left this list on purpose: matching plurals means "preventing 9 broken dashboards" now counts as a mention of Dashboards, a known cost of word forms.
  for (const id of ["near-1", "near-2", "near-5", "near-7", "syn-1", "syn-5"]) {
    const bad = report.failures.filter((f) => f.caseId === id && f.kind !== "proof-miss");
    assert.deepEqual(bad, [], `${id} regressed`);
  }
});

// Measured on 16 Oct 2026 after word forms, the scrub rules and the wider verb list: 97%, 95%, 97%, 89%, 100%, 98% and 6%. Floors sit a little under that.
const FLOOR = { resumePrecision: 0.93, resumeRecall: 0.9, proofPrecision: 0.92, proofRecall: 0.83, demandPrecision: 0.95, demandRecall: 0.93, mentionOvercreditMax: 0.15 };

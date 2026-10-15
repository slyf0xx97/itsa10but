import test from "node:test";
import assert from "node:assert/strict";
import { groupByTier, stateOf, tierOf } from "./radar-tiers.ts";

test("demand thresholds: 70 and up Expected, 40 to 69 Good to have, below 40 Extra", () => {
  assert.deepEqual([100, 70, 69, 40, 39, 0].map(tierOf), ["expected", "expected", "good", "good", "extra", "extra"]);
  assert.equal(tierOf(Number.NaN), "extra");
});

test("proof threshold: 35 and up is Have, below is Gap", () => {
  assert.deepEqual([100, 35, 34, 0].map(stateOf), ["have", "have", "gap", "gap"]);
});

test("grouping is demand first, then input order, and does not depend on evidence", () => {
  const skills = [
    { name: "a", demand: 80, evidence: 0 },
    { name: "b", demand: 90, evidence: 100 },
    { name: "c", demand: 80, evidence: 50 },
    { name: "d", demand: 10, evidence: 0 },
  ];
  const groups = groupByTier(skills);
  assert.deepEqual(groups.expected.map((s) => s.name), ["b", "a", "c"]);
  assert.deepEqual(groups.good, []);
  assert.deepEqual(groups.extra.map((s) => s.name), ["d"]);
  assert.deepEqual(groupByTier(skills), groups);
});

import test from "node:test";
import assert from "node:assert/strict";
import { proofOf, proofSteps, verdictOf, wantDots, wantOf, whyLine } from "./skill-levels.ts";

test("role wants: 70 and up High, 40 to 69 Medium, below 40 Low", () => {
  assert.deepEqual([100, 70, 69, 40, 39, 0, Number.NaN].map(wantOf), ["High", "High", "Medium", "Medium", "Low", "Low", "Low"]);
  assert.deepEqual((["High", "Medium", "Low"] as const).map(wantDots), [3, 2, 1]);
});

test("you show: 70 Strong, 40 Some, 1 Weak, 0 None", () => {
  assert.deepEqual([100, 70, 69, 40, 39, 1, 0].map(proofOf), ["Strong", "Strong", "Some", "Some", "Weak", "Weak", "None"]);
  assert.deepEqual([0, 20, 50, 75, 90].map(proofSteps), [0, 1, 2, 3, 4]);
});

test("verdict: Missing needs zero proof and a role that cares", () => {
  assert.equal(verdictOf(80, 0), "missing");
  assert.equal(verdictOf(50, 0), "missing");
  assert.equal(verdictOf(20, 0), "add");
});

test("verdict: Covered when the proof level reaches the ask, Add proof below it", () => {
  assert.equal(verdictOf(80, 70), "covered");
  assert.equal(verdictOf(80, 69), "add");
  assert.equal(verdictOf(50, 40), "covered");
  assert.equal(verdictOf(50, 39), "add");
  assert.equal(verdictOf(10, 1), "covered");
});

test("the why line names the verdict without numbers", () => {
  assert.match(whyLine(90, 0), /nothing for it yet/);
  assert.match(whyLine(90, 30), /weak so far/);
  assert.doesNotMatch(whyLine(90, 30), /\d/);
  assert.match(whyLine(30, 80), /enough/);
});

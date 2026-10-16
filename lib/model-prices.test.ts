import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateCost } from "./model-prices.ts";

test("cost is tokens times the listed price per million", () => {
  assert.equal(estimateCost("claude-sonnet-5-5", 1_000_000, 100_000), 3);
  assert.equal(estimateCost("anthropic/claude-haiku-5.5", 2_000_000, 0), 0.2);
});

test("an unlisted or missing model has no estimate", () => {
  assert.equal(estimateCost("some/other-model", 10, 10), null);
  assert.equal(estimateCost(undefined, 10, 10), null);
});

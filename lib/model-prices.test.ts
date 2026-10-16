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

test("tokens read from the cache cost a tenth, and tokens written to it a quarter more", () => {
  // 1M prompt tokens at $2 per million: all fresh is $2; 800k read from cache costs 0.2 * 2 + 0.8 * 0.2 = $0.56.
  assert.equal(estimateCost("claude-sonnet-5-5", 1_000_000, 0), 2);
  assert.ok(Math.abs((estimateCost("claude-sonnet-5-5", 1_000_000, 0, 800_000, 0) ?? 0) - 0.56) < 1e-9);
  assert.ok(Math.abs((estimateCost("claude-sonnet-5-5", 1_000_000, 0, 0, 400_000) ?? 0) - 2.2) < 1e-9);
});

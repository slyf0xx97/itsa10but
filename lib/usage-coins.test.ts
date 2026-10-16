import assert from "node:assert/strict";
import { test } from "node:test";
import { coinHalves, shortCost, shortSeconds, shortTokens, totalOf } from "./usage-coins.ts";

test("any spend shows at least half a coin, and the row caps at six coins", () => {
  assert.equal(coinHalves(0), 0);
  assert.equal(coinHalves(1), 1);
  assert.equal(coinHalves(2500), 1);
  assert.equal(coinHalves(2501), 2);
  assert.equal(coinHalves(20_000), 8);
  assert.equal(coinHalves(900_000), 12);
});

test("tokens, seconds and cost read short", () => {
  assert.deepEqual([940, 12_930, 2_000, 123_000].map(shortTokens), ["940", "12.9k", "2k", "123k"]);
  assert.deepEqual([4100, 21_219].map(shortSeconds), ["4.1 s", "21 s"]);
  assert.equal(shortCost(0.0042), "under $0.01");
  assert.equal(shortCost(0.136), "about $0.14");
  assert.equal(shortCost(null), "no price listed");
});

test("the total adds every agent and has no cost if any model has no price", () => {
  const rows = [
    { agent: "Role Scout", inputTokens: 1_000_000, outputTokens: 0, ms: 1000, model: "claude-sonnet-5-5" },
    { agent: "Recruiter", inputTokens: 0, outputTokens: 100_000, ms: 2000, model: "claude-sonnet-5-5" },
  ];
  assert.deepEqual(totalOf(rows), { inputTokens: 1_000_000, outputTokens: 100_000, cachedTokens: 0, ms: 3000, cost: 3, firecrawlCalls: 0, firecrawlCredits: 0, webFree: 0 });
  assert.equal(totalOf([...rows, { agent: "Planner", inputTokens: 1, outputTokens: 1, ms: 1, model: "other/model" }]).cost, null);
  assert.equal(totalOf([]).cost, null);
});

test("Firecrawl use reads short, and shows credits only when Firecrawl reported them", async () => {
  const { shortFirecrawl } = await import("./usage-coins.ts");
  assert.equal(shortFirecrawl({}), null);
  assert.equal(shortFirecrawl({ firecrawlCalls: 2, firecrawlCredits: 3 }), "2 Firecrawl calls, 3 credits");
  assert.equal(shortFirecrawl({ firecrawlCalls: 1 }), "1 Firecrawl call");
  assert.equal(shortFirecrawl({ webFree: 2 }), "2 free lookups");
  assert.equal(shortFirecrawl({ firecrawlCalls: 1, firecrawlCredits: 1, webFree: 1 }), "1 Firecrawl call, 1 credit, 1 free lookup");
});

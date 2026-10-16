import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_FIRECRAWL_DAILY, firecrawlBudgetId, firecrawlDailyCap, needsWeb } from "./budget.ts";

test("the daily cap reads a whole number, allows 0 to switch the site key off, and falls back to the default", () => {
  assert.equal(firecrawlDailyCap("40"), 40);
  assert.equal(firecrawlDailyCap("0"), 0);
  for (const bad of [undefined, "", "abc", "-3", "999999999"]) assert.equal(firecrawlDailyCap(bad), DEFAULT_FIRECRAWL_DAILY, String(bad));
});

test("the counter row changes at midnight in Singapore", () => {
  assert.equal(firecrawlBudgetId(Date.parse("2026-10-16T15:59:00Z")), "firecrawl|2026-10-16");
  assert.equal(firecrawlBudgetId(Date.parse("2026-10-16T16:00:00Z")), "firecrawl|2026-10-17");
});

test("a company query that already has three free hits does not go to the web", () => {
  assert.equal(needsWeb(true, 3), false);
  assert.equal(needsWeb(true, 2), true);
  assert.equal(needsWeb(false, 5), true);
});

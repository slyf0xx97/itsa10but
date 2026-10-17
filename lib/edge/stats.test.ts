import assert from "node:assert/strict";
import test from "node:test";
import { cleanCredits, countersByDay } from "./stats.ts";

test("day and hour counters roll up to one number per bucket per day, newest day first", () => {
  const rows = [
    { id: "firecrawl|2026-10-16", span: "2026-10-16", count: 2 },
    { id: "site-day|2026-10-17", span: "2026-10-17", count: 4 },
    { id: "own|2026-10-17T09|abc123", span: "2026-10-17T09", count: 3 },
    { id: "own|2026-10-17T10|def456", span: "2026-10-17T10", count: 1 },
  ];
  assert.deepEqual(countersByDay(rows), [
    { day: "2026-10-17", counts: { "site-day": 4, own: 4 } },
    { day: "2026-10-16", counts: { firecrawl: 2 } },
  ]);
});

test("the visitor hash never appears, and malformed rows are dropped", () => {
  const out = JSON.stringify(countersByDay([
    { id: "own|2026-10-17T09|secrethash", span: "2026-10-17T09", count: 1 },
    { id: "BAD ID|2026-10-17", span: "2026-10-17", count: 9 },
    { id: "own|x", span: "not a day", count: 9 },
  ]));
  assert.ok(!out.includes("secrethash"));
  assert.ok(!out.includes("BAD"));
  assert.equal(out, JSON.stringify([{ day: "2026-10-17", counts: { own: 1 } }]));
});

test("Firecrawl credits read in both spellings and ignore anything else", () => {
  assert.deepEqual(cleanCredits({ success: true, data: { remainingCredits: 420, planCredits: 500, billingPeriodEnd: "2026-11-01T00:00:00Z" } }), { remaining: 420, plan: 500, periodEnd: "2026-11-01T00:00:00Z" });
  assert.deepEqual(cleanCredits({ data: { remaining_credits: 7, plan_credits: 10 } }), { remaining: 7, plan: 10, periodEnd: null });
  assert.equal(cleanCredits({ data: { remainingCredits: "lots" } }), null);
  assert.equal(cleanCredits(null), null);
});

import assert from "node:assert/strict";
import test from "node:test";
import { renderAdmin, type AdminStats } from "./admin-html.ts";

const stats: AdminStats = {
  today: "2026-10-17",
  counters: [{ day: "2026-10-17", counts: { firecrawl: 2, "site-day": 4, own: 3, roleai: 9 } }],
  usage: { allTime: { runs: 7, in_tokens: 1000, out_tokens: 250 }, byModel: [{ day: "2026-10-17", model: "claude-<b>x</b>", provider: "anthropic", runs: 3, in_tokens: 800, out_tokens: 200, ms: 12_000, fallbacks: 1 }] },
  firecrawl: { keySet: true, dailyCap: 0, credits: { remaining: 420, plan: 500, periodEnd: "2026-11-01T00:00:00Z" } },
  workersAi: { dailyCap: 200 },
};

test("the page shows today's figures, credits and caps", () => {
  const html = renderAdmin(stats, "owner@example.com");
  assert.match(html, /Firecrawl credits left<\/span><b>420<\/b><small>of 500, plan renews 2026-11-01/);
  assert.match(html, /Firecrawl calls \(site key\)<\/span><b>2<\/b><small>off<\/small>/);
  assert.match(html, /Workers AI role reads<\/span><b>9<\/b><small>of 200 a day/);
  assert.match(html, /Tokens, all time<\/span><b>1,250<\/b>/);
});

test("every value is escaped", () => {
  const html = renderAdmin(stats, "<script>alert(1)</script>@example.com");
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<b>x</b>"));
  assert.match(html, /claude-&lt;b&gt;x&lt;\/b&gt;/);
});

test("empty data still renders a readable page", () => {
  const html = renderAdmin({ ...stats, counters: [], usage: { allTime: null, byModel: [] }, firecrawl: { keySet: false, dailyCap: 0, credits: null } }, "owner@example.com");
  assert.match(html, /No counters yet/);
  assert.match(html, /No Claude runs logged yet/);
  assert.match(html, /No site key on the Worker/);
});

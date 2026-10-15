import test from "node:test";
import assert from "node:assert/strict";
import { createLimiter, liveStatus, ownKeyLimiterFromEnv, visitorKey } from "./rate-limit.ts";

test("allows N runs per visitor then refuses, and frees up after the window", () => {
  let t = 1_000_000;
  const limiter = createLimiter({ perVisitorMax: 2, perVisitorWindowMs: 1000, dailyCap: 100, now: () => t });
  assert.equal(limiter.take("a").ok, true);
  assert.equal(limiter.take("a").ok, true);
  assert.deepEqual(limiter.take("a"), { ok: false, reason: "visitor" });
  assert.equal(limiter.take("b").ok, true);
  t += 1500;
  assert.equal(limiter.take("a").ok, true);
});

test("daily cap stops every visitor and resets the next day", () => {
  let t = Date.UTC(2026, 9, 13, 12);
  const limiter = createLimiter({ perVisitorMax: 9, perVisitorWindowMs: 1000, dailyCap: 2, now: () => t });
  limiter.take("a"); limiter.take("b");
  assert.deepEqual(limiter.take("c"), { ok: false, reason: "daily" });
  assert.equal(limiter.dailyCapReached(), true);
  t += 24 * 3600 * 1000;
  assert.equal(limiter.take("c").ok, true);
});

test("live is off unless the kill switch is exactly true and a key exists", () => {
  assert.equal(liveStatus({ ANTHROPIC_API_KEY: "sk-ant-secret" }).live, false);
  assert.equal(liveStatus({ LIVE_AGENTS_ENABLED: "true" }).live, false);
  assert.equal(liveStatus({ LIVE_AGENTS_ENABLED: "yes", ANTHROPIC_API_KEY: "k" }).live, false);
  assert.deepEqual(liveStatus({ LIVE_AGENTS_ENABLED: "true", ANTHROPIC_API_KEY: "k" }), { live: true, ownKey: true });
  assert.equal(liveStatus({ LIVE_AGENTS_ENABLED: "true", ANTHROPIC_API_KEY: "k" }, { dailyCapReached: () => true }).live, false);
});

test("own-key mode does not depend on the server key state", () => {
  assert.equal(liveStatus({}).ownKey, true);
  assert.equal(liveStatus({ LIVE_AGENTS_ENABLED: "true", ANTHROPIC_API_KEY: "k" }, { dailyCapReached: () => true }).ownKey, true);
});

test("the own-key limiter has a per-visitor limit but no daily cap", () => {
  const limiter = ownKeyLimiterFromEnv({ LIVE_OWN_KEY_PER_VISITOR: "2" });
  assert.equal(limiter.take("a").ok, true);
  assert.equal(limiter.take("a").ok, true);
  assert.deepEqual(limiter.take("a"), { ok: false, reason: "visitor" });
  assert.equal(limiter.take("b").ok, true);
  assert.equal(limiter.dailyCapReached(), false);
});

test("the mode response never contains key material", () => {
  const key = "sk-ant-api03-SECRETSECRET";
  for (const env of [{ ANTHROPIC_API_KEY: key }, { ANTHROPIC_API_KEY: key, LIVE_AGENTS_ENABLED: "true" }, {}]) {
    assert.ok(!JSON.stringify(liveStatus(env)).includes("SECRET"));
  }
  assert.match(liveStatus({}).reason ?? "", /./);
});

test("visitor key uses platform headers only", () => {
  const headers = (h: Record<string, string>) => ({ get: (n: string) => h[n] ?? null });
  assert.equal(visitorKey(headers({ "x-vercel-forwarded-for": "203.0.113.5", "x-forwarded-for": "1.1.1.1" })), "203.0.113.5");
  assert.equal(visitorKey(headers({ "x-forwarded-for": "1.1.1.1" })), "unknown");
  assert.equal(visitorKey(headers({ "x-real-ip": "<script>" })), "unknown");
});

import test from "node:test";
import assert from "node:assert/strict";
import { isAuthRejection, readVisitorKeys, scrubKeys } from "./visitor-keys.ts";

const headers = (h: Record<string, string>) => ({ get: (n: string) => h[n] ?? null });
const good = "sk-ant-api03-" + "A1b2C3d4".repeat(6);
const goodOr = "sk-or-v1-" + "e5F6g7H8".repeat(6);

test("no key headers means no visitor keys", () => {
  assert.deepEqual(readVisitorKeys(headers({})), { ok: true, keys: {} });
  assert.deepEqual(readVisitorKeys(headers({ "x-anthropic-key": "   " })), { ok: true, keys: {} });
});

test("keys are trimmed and accepted", () => {
  const result = readVisitorKeys(headers({ "x-anthropic-key": "  " + good + " ", "x-firecrawl-key": "fc-abcdef123456" }));
  assert.deepEqual(result, { ok: true, keys: { anthropic: good, firecrawl: "fc-abcdef123456" } });
});

test("odd characters and absurd lengths are refused without echoing the key", () => {
  for (const bad of ["short", "x".repeat(401), good + " extra", good + "é", "<script>alert(1)</script>".padEnd(30, "a")]) {
    const result = readVisitorKeys(headers({ "x-anthropic-key": bad }));
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(!result.error.includes(bad));
  }
  const fc = readVisitorKeys(headers({ "x-firecrawl-key": "bad key!" }));
  assert.deepEqual(fc, { ok: false, error: "That Firecrawl key does not look right. Check it and paste it again." });
});

test("an OpenRouter key is read from its own header", () => {
  assert.deepEqual(readVisitorKeys(headers({ "x-openrouter-key": " " + goodOr + " " })), { ok: true, keys: { openrouter: goodOr } });
  const bad = readVisitorKeys(headers({ "x-openrouter-key": "bad key!" }));
  assert.deepEqual(bad, { ok: false, error: "That OpenRouter key does not look right. Check it and paste it again." });
});

test("two model keys at once are refused with fixed text", () => {
  const result = readVisitorKeys(headers({ "x-anthropic-key": good, "x-openrouter-key": goodOr }));
  assert.deepEqual(result, { ok: false, error: "Send one model key at a time." });
});

test("scrubKeys removes every supplied key", () => {
  const text = `failed with ${good} and ${goodOr} and fc-abcdef123456 twice fc-abcdef123456`;
  const out = scrubKeys(text, { anthropic: good, openrouter: goodOr, firecrawl: "fc-abcdef123456" });
  assert.ok(!out.includes(good) && !out.includes(goodOr) && !out.includes("fc-abcdef123456"));
  assert.equal(scrubKeys("plain", {}), "plain");
});

test("only a 401 counts as a rejected key", () => {
  assert.equal(isAuthRejection({ status: 401 }), true);
  assert.equal(isAuthRejection({ status: 429 }), false);
  assert.equal(isAuthRejection(null), false);
});

const goodGemini = "AQ.Fake" + "TestKey0".repeat(4);

test("a Gemini key is read from its own header and checked like the others", () => {
  assert.deepEqual(readVisitorKeys(headers({ "x-gemini-key": " " + goodGemini + " " })), { ok: true, keys: { gemini: goodGemini } });
  const bad = readVisitorKeys(headers({ "x-gemini-key": "bad key!" }));
  assert.deepEqual(bad, { ok: false, error: "That Gemini key does not look right. Check it and paste it again." });
});

test("any two of the three model keys are refused, and a Gemini key is scrubbed from text", () => {
  for (const pair of [["x-gemini-key", "x-anthropic-key"], ["x-gemini-key", "x-openrouter-key"]]) {
    const result = readVisitorKeys(headers({ [pair[0]]: goodGemini, [pair[1]]: good }));
    assert.deepEqual(result, { ok: false, error: "Send one model key at a time." });
  }
  assert.ok(!scrubKeys(`oops ${goodGemini} oops`, { gemini: goodGemini }).includes(goodGemini));
});

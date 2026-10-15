import assert from "node:assert/strict";
import test from "node:test";
import { MODE_SHORT, switchStatus } from "./mode-copy.ts";

const none = { provider: "anthropic", entered: false, siteKey: false } as const;

test("native scan says no key is used and that the agents are simpler", () => {
  const status = switchStatus("rules", { ...none, entered: true });
  assert.equal(status.state, "native");
  assert.equal(status.title, "Native scan, no key used");
  assert.match(status.detail, /simple rules/);
  assert.match(status.detail, /Switch to API boost/);
});

test("API boost names the key provider, and the model only when the visitor picked one", () => {
  const plain = switchStatus("live", { ...none, entered: true });
  assert.deepEqual(plain, { state: "on", title: "API boost is on", detail: "Your Anthropic key powers the four agents." });
  const picked = switchStatus("live", { provider: "openrouter", entered: true, siteKey: false, model: "Sonnet 5.5" });
  assert.equal(picked.detail, "Your OpenRouter key powers the four agents. Model: Sonnet 5.5.");
});

test("the toggle names are exactly Native scan and API boost", () => {
  assert.deepEqual(MODE_SHORT, { rules: "Native scan", live: "API boost" });
});

test("API boost without a key asks for one, or uses the site key when it exists", () => {
  assert.deepEqual(switchStatus("live", none), { state: "needs-key", title: "Add your API key", detail: "A key lets your four agents think with a real AI model." });
  assert.deepEqual(switchStatus("live", { ...none, siteKey: true }), { state: "on", title: "API boost is on", detail: "This site's key powers the four agents." });
});

test("status text never names Claude and has no dashes, semicolons or middle dots", () => {
  const all = [switchStatus("rules", none), switchStatus("live", none), switchStatus("live", { ...none, siteKey: true }), switchStatus("live", { ...none, entered: true })];
  for (const { title, detail } of all) assert.doesNotMatch(title + detail, /claude|sonnet|[–—;·]/i);
});

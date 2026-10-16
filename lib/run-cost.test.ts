import assert from "node:assert/strict";
import { test } from "node:test";
import { AGENT_SPECS } from "./agents/index.ts";
import { costCeiling, costOverview, costSentence, typicalRunCost, TYPICAL_RUN } from "./run-cost.ts";

test("the Claude model each agent gets by default matches the agent specs", () => {
  for (const row of TYPICAL_RUN) {
    const spec = Object.values(AGENT_SPECS).find((item) => item.name === row.agent);
    assert.ok(spec, row.agent);
    assert.equal(spec!.model, row.claude, row.agent);
  }
});

test("a typical run costs cents on the low cost defaults and more on the Claude mix", () => {
  const deepseek = typicalRunCost("openrouter")!;
  const gemini = typicalRunCost("gemini")!;
  const mix = typicalRunCost("anthropic")!;
  assert.ok(deepseek < 0.01, `DeepSeek ${deepseek}`);
  assert.ok(gemini < 0.03, `Gemini ${gemini}`);
  assert.ok(mix > gemini && mix < 0.2, `mix ${mix}`);
});

test("a picked model prices all four agents, and an unpriced model says so", () => {
  const sonnet = typicalRunCost("anthropic", "claude-sonnet-5-5")!;
  const haiku = typicalRunCost("anthropic", "claude-haiku-5-5")!;
  assert.ok(sonnet > haiku * 10);
  assert.equal(typicalRunCost("openrouter", "someone/unpriced-model"), null);
  assert.match(costSentence("openrouter", "someone/unpriced-model"), /no listed price/);
});

test("the ceiling rounds up with room to spare, to the cent and then to five cents", () => {
  assert.equal(costCeiling(0.0057), "$0.01");
  assert.equal(costCeiling(0.0196), "$0.03");
  assert.equal(costCeiling(0.0001), "$0.01", "never prints $0.00");
  assert.equal(costCeiling(0.091), "$0.15");
  assert.equal(costCeiling(0.5), "$0.65");
});

test("the sentence reads plainly for each default", () => {
  assert.equal(costSentence("openrouter"), "Estimated cost is usually below $0.01 a run.");
  assert.equal(costSentence("gemini"), "Estimated cost is usually below $0.03 a run.");
  assert.match(costSentence("anthropic"), /^Estimated cost is usually below \$0\.\d\d a run\.$/);
});

test("before a key is entered the overview gives each provider's ceiling", () => {
  assert.equal(costOverview(), "Estimated cost is usually below $0.01 a run on OpenRouter, $0.03 on Gemini and $0.15 on Anthropic.");
});

test("a pick for one agent changes the estimate by that agent's share only", () => {
  const base = typicalRunCost("openrouter")!;
  const withSonnet = typicalRunCost("openrouter", undefined, { "Experience Finder": "anthropic/claude-sonnet-5.5" })!;
  assert.ok(withSonnet > base * 3, `${withSonnet} vs ${base}`);
  assert.equal(typicalRunCost("openrouter", undefined, {}), base);
  assert.ok(typicalRunCost("openrouter", undefined, { Recruiter: "someone/unpriced-model" }) === null);
});

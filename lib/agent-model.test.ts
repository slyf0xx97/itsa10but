import assert from "node:assert/strict";
import { test } from "node:test";
import { agentModelSource } from "./agent-model.ts";
import { effectiveModel } from "./model-choice.ts";

const spec = "claude-sonnet-5-5";

test("before a key is entered no model is named", () => {
  assert.equal(agentModelSource("Recruiter", { specModel: spec }), undefined);
  assert.equal(agentModelSource("Recruiter", { specModel: spec, picks: { Recruiter: "claude-haiku-5-5" } }), undefined);
});

test("the source is this agent's pick, then the pick for all four, then the key's default", () => {
  assert.deepEqual(agentModelSource("Recruiter", { provider: "gemini", picks: { Recruiter: "gemini-3.5-flash-lite" }, all: "gemini-3.1-flash-lite", specModel: spec }), { model: "gemini-3.5-flash-lite", from: "agent", provider: "gemini" });
  assert.deepEqual(agentModelSource("Recruiter", { provider: "gemini", all: "gemini-3.5-flash-lite", specModel: spec }), { model: "gemini-3.5-flash-lite", from: "all", provider: "gemini" });
  assert.deepEqual(agentModelSource("Recruiter", { provider: "openrouter", specModel: spec }), { model: "deepseek/deepseek-v4.1-flash", from: "default", provider: "openrouter" });
  assert.deepEqual(agentModelSource("Recruiter", { provider: "anthropic", specModel: spec }), { model: spec, from: "default", provider: "anthropic" }, "an Anthropic key keeps the spec's own Claude model");
});

test("it names the same model the server will use", () => {
  for (const provider of ["anthropic", "openrouter", "gemini"] as const) {
    for (const picks of [undefined, { Recruiter: "claude-haiku-5-5" }]) {
      assert.equal(agentModelSource("Recruiter", { provider, picks, specModel: spec })!.model, effectiveModel("Recruiter", { provider, picks, specModel: spec }));
    }
  }
});

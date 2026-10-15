import test from "node:test";
import assert from "node:assert/strict";
import { ANTHROPIC_MODELS, CUSTOM, OPENROUTER_MODELS, RECOMMENDED, checkModelChoice, isClaudeModel, isCustomModelId, modelLabel, modelToSend } from "./model-choice.ts";
import { openRouterModel } from "./openrouter-models.ts";

test("no choice, null, empty and 'recommended' all mean the recommended mix", () => {
  for (const value of [undefined, null, "", RECOMMENDED, "  recommended "]) {
    for (const provider of ["anthropic", "openrouter", "site"] as const) assert.deepEqual(checkModelChoice(value, provider), { ok: true });
  }
});

test("the site key never takes a model choice", () => {
  const result = checkModelChoice("claude-opus-5-5", "site");
  assert.equal(result.ok, false);
  assert.equal(checkModelChoice("openai/gpt-5.6-terra", "site").ok, false);
});

test("an Anthropic key accepts only the listed Claude models", () => {
  for (const option of ANTHROPIC_MODELS) assert.deepEqual(checkModelChoice(option.id, "anthropic"), { ok: true, model: option.id });
  for (const bad of ["openai/gpt-5.6-terra", "anthropic/claude-sonnet-5.5", "claude-sonnet-4-5", "claude-opus-5-5-extra", "CLAUDE-OPUS-5-5", "claude-opus-5-5\nx"]) assert.equal(checkModelChoice(bad, "anthropic").ok, false, bad);
  assert.deepEqual(checkModelChoice(" claude-opus-5-5 ", "anthropic"), { ok: true, model: "claude-opus-5-5" }, "surrounding spaces are trimmed");
});

test("an OpenRouter key accepts the listed models and a well-formed custom id", () => {
  for (const option of OPENROUTER_MODELS) assert.deepEqual(checkModelChoice(option.id, "openrouter"), { ok: true, model: option.id });
  for (const id of ["meta-llama/llama-4.1-70b-instruct", "mistralai/mistral-large-4-0", "deepseek/deepseek-v4.1-flash:free", "a/b", "Qwen/Qwen3.8_Flash"]) {
    assert.deepEqual(checkModelChoice(id, "openrouter"), { ok: true, model: id }, id);
  }
});

test("malformed ids are refused with fixed text that never repeats the input", () => {
  const long = "a".repeat(50) + "/" + "b".repeat(60);
  const bad = ["gpt-5", "/gpt", "openai/", "openai//gpt", "openai/gpt 5", "openai/gpt?x=1", "openai/gpt#frag", "https://evil.example/x", "../etc/passwd", "a/../b", "openai/gpt\u0000", "openai/gpt-5\nHost: x", "-x/y", "x/-y", ".x/y", "openai/gpt/5", "openai/gpt@5", "openai/gpt%2F5", "openai/gpt;rm", "<script>/x", "openai/ünï", long];
  const errors = new Set<string>();
  for (const id of bad) {
    const result = checkModelChoice(id, "openrouter");
    assert.equal(result.ok, false, JSON.stringify(id));
    if (!result.ok) errors.add(result.error);
  }
  assert.equal(errors.size, 1, "one fixed message, so the input is never echoed");
  for (const value of [5, true, {}, [], ["openai/gpt-5"]]) assert.equal(checkModelChoice(value, "openrouter").ok, false);
  assert.equal(isCustomModelId("a".repeat(40) + "/" + "b".repeat(59)), true);
  assert.equal(isCustomModelId("a".repeat(41) + "/b"), false);
  assert.equal(isCustomModelId("a/" + "b".repeat(61)), false);
  assert.equal(isCustomModelId("a".repeat(40) + "/" + "b".repeat(60)), false, "over 100 characters");
});

test("what the page sends follows the key's provider and never a stale pick", () => {
  assert.equal(modelToSend(undefined, "", "openrouter"), undefined);
  assert.equal(modelToSend(RECOMMENDED, "x/y", "anthropic"), undefined);
  assert.equal(modelToSend("claude-opus-5-5", "", "anthropic"), "claude-opus-5-5");
  assert.equal(modelToSend("claude-opus-5-5", "", "openrouter"), undefined, "an Anthropic id is not an OpenRouter option");
  assert.equal(modelToSend("openai/gpt-5.6-terra", "", "anthropic"), undefined, "an OpenRouter pick is dropped after switching to an Anthropic key");
  assert.equal(modelToSend(CUSTOM, "  vendor/model-x  ", "openrouter"), "vendor/model-x");
  assert.equal(modelToSend(CUSTOM, "vendor/model-x", "anthropic"), undefined);
  assert.equal(modelToSend(CUSTOM, "   ", "openrouter"), undefined);
});

test("a custom id the page would send always passes the server check, and a bad one is caught there", () => {
  assert.deepEqual(checkModelChoice(modelToSend(CUSTOM, "vendor/model-x:free", "openrouter"), "openrouter"), { ok: true, model: "vendor/model-x:free" });
  assert.equal(checkModelChoice(modelToSend(CUSTOM, "not valid", "openrouter"), "openrouter").ok, false);
});

test("listed OpenRouter Claude ids are already in OpenRouter spelling, and Anthropic ids map to them", () => {
  for (const option of ANTHROPIC_MODELS) assert.ok(OPENROUTER_MODELS.some((other) => other.id === openRouterModel(option.id)), option.id);
  assert.ok(OPENROUTER_MODELS.every((option) => checkModelChoice(option.id, "openrouter").ok));
  assert.equal(new Set([...ANTHROPIC_MODELS, ...OPENROUTER_MODELS].map((option) => option.id)).size, ANTHROPIC_MODELS.length + OPENROUTER_MODELS.length);
});

test("labels and the Claude check read both spellings", () => {
  assert.equal(modelLabel("claude-haiku-5-5"), "Haiku 5.5");
  assert.equal(modelLabel("anthropic/claude-sonnet-5.5"), "Sonnet 5.5");
  assert.equal(modelLabel("vendor/model-x"), "vendor/model-x");
  assert.equal(isClaudeModel("claude-opus-5-5"), true);
  assert.equal(isClaudeModel("anthropic/claude-opus-5.5"), true);
  assert.equal(isClaudeModel("openai/gpt-5.6-terra"), false);
  assert.equal(isClaudeModel("evil/claude-x"), false);
});

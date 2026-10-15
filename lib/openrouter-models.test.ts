import test from "node:test";
import assert from "node:assert/strict";
import { keyProvider, openRouterModel } from "./openrouter-models.ts";

test("Claude ids map to OpenRouter slugs", () => {
  assert.equal(openRouterModel("claude-sonnet-5-5"), "anthropic/claude-sonnet-5.5");
  assert.equal(openRouterModel("claude-haiku-5-5"), "anthropic/claude-haiku-5.5");
  assert.equal(openRouterModel("claude-opus-5-5"), "anthropic/claude-opus-5.5");
});

test("other ids pass through unchanged", () => {
  for (const id of ["anthropic/claude-sonnet-5.5", "claude-sonnet-5-5-20260101", "claude-3-haiku", "gpt-5", ""]) assert.equal(openRouterModel(id), id);
});

test("sk-or- keys are OpenRouter, everything else is Anthropic", () => {
  assert.equal(keyProvider("sk-or-v1-abc"), "openrouter");
  assert.equal(keyProvider("sk-ant-api03-abc"), "anthropic");
  assert.equal(keyProvider("SK-OR-v1-abc"), "anthropic");
  assert.equal(keyProvider(""), "anthropic");
});

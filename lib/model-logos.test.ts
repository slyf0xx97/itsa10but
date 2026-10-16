import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { ANTHROPIC_MODELS, GEMINI_MODELS, OPENROUTER_MODELS, DEFAULT_MODELS } from "./model-choice.ts";
import { modelMaker, modelMark } from "./model-logos.ts";

test("an id is matched to its maker in each spelling", () => {
  assert.equal(modelMaker("claude-haiku-5-5"), "anthropic");
  assert.equal(modelMaker("anthropic/claude-sonnet-5.5"), "anthropic");
  assert.equal(modelMaker("gemini-3.1-flash-lite"), "gemini");
  assert.equal(modelMaker("google/gemini-3.1-flash-lite"), "gemini");
  assert.equal(modelMaker("openai/gpt-5.6-terra"), "openai");
  assert.equal(modelMaker("meta-llama/llama-4"), null);
});

test("every listed model and every default has a logo file that is on disk", () => {
  const ids = [...ANTHROPIC_MODELS, ...OPENROUTER_MODELS, ...GEMINI_MODELS].map((option) => option.id).concat(Object.values(DEFAULT_MODELS).filter((id): id is string => Boolean(id)));
  for (const id of ids) {
    const mark = modelMark(id);
    assert.ok("file" in mark, id);
    assert.ok(existsSync(new URL(`../public/assets/logos/${mark.file}`, import.meta.url)), `${id}: ${mark.file}`);
  }
});

test("a model from another maker shows a letter from its name", () => {
  assert.deepEqual(modelMark("meta-llama/llama-4.1-70b"), { letter: "M" });
  assert.deepEqual(modelMark("qwen/qwen3.8-flash"), { letter: "Q" });
  assert.deepEqual(modelMark(""), { letter: "?" });
});

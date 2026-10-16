import assert from "node:assert/strict";
import { test } from "node:test";
import { withCacheMarks } from "./anthropic-client.ts";
import type { LiveRequest } from "./live-agents.ts";

const request = (model: string): LiveRequest => ({ model, max_tokens: 10, system: "rules", messages: [{ role: "user", content: "hello" }, { role: "assistant", content: [{ type: "text", text: "hi" }] }, { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "result" }] }], output_config: { format: { type: "json_schema", schema: {} } } });

test("Claude requests get a cache mark on the system prompt and on the newest message only", () => {
  const sent = withCacheMarks(request("claude-sonnet-5-5"));
  assert.deepEqual(sent.system, [{ type: "text", text: "rules", cache_control: { type: "ephemeral" } }]);
  assert.equal(sent.messages[0].content, "hello", "older messages are untouched");
  const newest = sent.messages[2].content as { cache_control?: unknown }[];
  assert.deepEqual(newest[0].cache_control, { type: "ephemeral" });
  assert.equal(JSON.stringify(sent).split("cache_control").length - 1, 2);
});

test("a string message becomes a text block that carries the mark, and other models are left alone", () => {
  const one = { ...request("claude-haiku-5-5"), messages: [{ role: "user" as const, content: "hello" }] };
  assert.deepEqual(withCacheMarks(one).messages[0].content, [{ type: "text", text: "hello", cache_control: { type: "ephemeral" } }]);
  const other = request("some/other-model");
  assert.deepEqual(withCacheMarks(other), other);
  const single = { ...request("claude-sonnet-5-5"), cache: false };
  assert.equal(JSON.stringify(withCacheMarks(single)).includes("cache"), false, "a one-turn agent gets no marks, and the flag is not sent");
});

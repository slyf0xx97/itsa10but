import { test } from "node:test";
import assert from "node:assert/strict";
import { fromChatResponse, openRouterChatClient, toChatRequest } from "./openrouter-chat-client.ts";
import type { LiveRequest } from "./live-agents.ts";

const request: LiveRequest = {
  model: "deepseek/deepseek-v4.1-flash",
  max_tokens: 1000,
  system: "You score.",
  messages: [
    { role: "user", content: "Score Python." },
    { role: "assistant", content: [{ type: "text", text: "Looking." }, { type: "tool_use", id: "t1", name: "search", input: { skill: "Python" } }] },
    { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "passage" }] },
  ],
  tools: [{ name: "search", description: "find", input_schema: { type: "object" } }],
  output_config: { format: { type: "json_schema", schema: { type: "object" } } },
};

const ok = (message: object, finish = "stop") => new Response(JSON.stringify({ choices: [{ message, finish_reason: finish }], usage: { prompt_tokens: 100, completion_tokens: 20 } }), { status: 200 });

test("request: tool calls and results are translated, thinking is off, the schema is in the system prompt", () => {
  const body = toChatRequest(request, { effort: "none" }) as { messages: { role: string; tool_calls?: unknown[]; tool_call_id?: string }[]; reasoning: unknown; max_tokens: number; response_format?: unknown };
  assert.deepEqual(body.messages.map((m) => m.role), ["system", "user", "assistant", "tool"]);
  assert.equal(body.messages[2].tool_calls?.length, 1);
  assert.equal(body.messages[3].tool_call_id, "t1");
  assert.deepEqual(body.reasoning, { effort: "none" });
  assert.equal(body.max_tokens, 1000);
  assert.equal(body.response_format, undefined);
});

test("response: think tags are dropped and tool calls become blocks", () => {
  const out = fromChatResponse({ choices: [{ message: { content: "<think>hmm</think>{\"a\":1}", tool_calls: [{ id: "c1", function: { name: "search", arguments: "{\"skill\":\"SQL\"}" } }] }, finish_reason: "tool_calls" }], usage: { prompt_tokens: 50, completion_tokens: 9 } });
  assert.equal(out.stop_reason, "tool_use");
  assert.deepEqual(out.content.map((b) => b.type), ["text", "tool_use"]);
  assert.equal(out.content[0].text, "{\"a\":1}");
  assert.deepEqual(out.content[1].input, { skill: "SQL" });
  assert.equal(out.usage?.output_tokens, 9);
});

test("a length stop maps to max_tokens", () => {
  assert.equal(fromChatResponse({ choices: [{ message: { content: "{" }, finish_reason: "length" }] }).stop_reason, "max_tokens");
});

test("a model that refuses thinking off is asked again at the next level, and remembered", async () => {
  const efforts: unknown[] = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    const sent = JSON.parse(String(init.body));
    efforts.push(sent.reasoning ?? null);
    return sent.reasoning?.effort === "none" ? new Response(JSON.stringify({ error: { message: "reasoning effort none is not supported" } }), { status: 400 }) : ok({ content: "{}" });
  }) as unknown as typeof fetch;
  const client = openRouterChatClient("sk-or-v1-secret", { fetchImpl });
  await client.create(request);
  await client.create(request);
  assert.deepEqual(efforts, [{ effort: "none" }, { effort: "low" }, { effort: "low" }]);
});

test("a rejected key surfaces status 401 and never repeats the key", async () => {
  const fetchImpl = (async () => new Response(JSON.stringify({ error: { message: "bad key sk-or-v1-secret" } }), { status: 401 })) as unknown as typeof fetch;
  const client = openRouterChatClient("sk-or-v1-secret", { fetchImpl });
  await assert.rejects(client.create(request), (error: Error & { status?: number }) => error.status === 401 && !error.message.includes("secret"));
});

test("a 503 is retried once", async () => {
  let calls = 0;
  const fetchImpl = (async () => (++calls === 1 ? new Response("{}", { status: 503 }) : ok({ content: "{}" }))) as unknown as typeof fetch;
  const client = openRouterChatClient("k", { fetchImpl, retryDelaysMs: [1] });
  await client.create(request);
  assert.equal(calls, 2);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { fromGeminiResponse, geminiClient, geminiModelId, toGeminiRequest } from "./gemini-client.ts";
import type { LiveRequest } from "./live-agents.ts";

/** The part of a Gemini request these tests read. */
type Sent = {
  systemInstruction: unknown;
  contents: { role: string; parts: Record<string, unknown>[] }[];
  tools?: { functionDeclarations: { name: string; parametersJsonSchema: unknown }[] }[];
  toolConfig?: unknown;
  generationConfig: { maxOutputTokens: number; responseMimeType: string; responseJsonSchema: unknown; thinkingConfig?: unknown };
};

const schema = { type: "object", properties: { status: { type: "string" } }, required: ["status"] };
const base: LiveRequest = {
  model: "gemini-3.5-flash", max_tokens: 2500, system: "You read a resume.",
  messages: [{ role: "user", content: "Read it." }],
  tools: [{ name: "search_resume_passages", description: "Find passages.", input_schema: { type: "object", properties: { skill: { type: "string" } }, required: ["skill"] } }],
  output_config: { format: { type: "json_schema", schema } },
};

test("the request carries the system prompt, the tools, the answer schema and a thinking level", () => {
  const out = toGeminiRequest(base) as Sent;
  assert.deepEqual(out.systemInstruction, { parts: [{ text: "You read a resume." }] });
  assert.deepEqual(out.contents, [{ role: "user", parts: [{ text: "Read it." }] }]);
  assert.equal(out.tools![0].functionDeclarations[0].name, "search_resume_passages");
  assert.deepEqual(out.tools![0].functionDeclarations[0].parametersJsonSchema, base.tools![0].input_schema);
  assert.equal(out.generationConfig.responseMimeType, "application/json");
  assert.deepEqual(out.generationConfig.responseJsonSchema, schema);
  assert.deepEqual(out.generationConfig.thinkingConfig, { thinkingLevel: "low" });
  assert.equal(out.generationConfig.maxOutputTokens, 5500, "room on top of the agent's limit for Gemini's thinking tokens");
  assert.equal(out.toolConfig, undefined);
});

test("older and unknown models get the thinking setting they understand, or none", () => {
  assert.deepEqual((toGeminiRequest({ ...base, model: "gemini-2.5-flash" }) as Sent).generationConfig.thinkingConfig, { thinkingBudget: 1024 });
  assert.equal((toGeminiRequest({ ...base, model: "gemini-flash-latest" }) as Sent).generationConfig.thinkingConfig, undefined);
});

test("a finished tool round trip keeps the call id and the thought signature, and names the response", () => {
  const out = toGeminiRequest({
    ...base,
    messages: [
      { role: "user", content: "Read it." },
      { role: "assistant", content: [{ type: "text", text: "Looking." }, { type: "tool_use", id: "call_1", name: "search_resume_passages", input: { skill: "Python" }, thoughtSignature: "sig-abc" }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "call_1", content: "passages here" }] },
    ],
    tool_choice: { type: "none" },
  }) as Sent;
  assert.deepEqual(out.contents[1], { role: "model", parts: [{ text: "Looking." }, { functionCall: { name: "search_resume_passages", args: { skill: "Python" }, id: "call_1" }, thoughtSignature: "sig-abc" }] });
  assert.deepEqual(out.contents[2], { role: "user", parts: [{ functionResponse: { name: "search_resume_passages", id: "call_1", response: { output: "passages here" } } }] });
  assert.deepEqual(out.toolConfig, { functionCallingConfig: { mode: "NONE" } });
});

test("a failed tool result is reported as an error, not as output", () => {
  const out = toGeminiRequest({
    ...base,
    messages: [
      { role: "assistant", content: [{ type: "tool_use", id: "c", name: "check_quote", input: {} }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "c", content: "nope", is_error: true }] },
    ],
  }) as Sent;
  assert.deepEqual((out.contents[1].parts[0].functionResponse as { response: unknown }).response, { error: "nope" });
});

test("a tool call comes back as a tool_use block with its signature, and the stop reason says so", () => {
  const out = fromGeminiResponse({
    candidates: [{ content: { parts: [{ functionCall: { name: "search_resume_passages", args: { skill: "SQL" }, id: "call_9" }, thoughtSignature: "sig-1" }] }, finishReason: "STOP" }],
    usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 20, thoughtsTokenCount: 80, cachedContentTokenCount: 400 },
  });
  assert.equal(out.stop_reason, "tool_use");
  assert.deepEqual(out.content, [{ type: "tool_use", id: "call_9", name: "search_resume_passages", input: { skill: "SQL" }, thoughtSignature: "sig-1" }]);
  assert.deepEqual(out.usage, { input_tokens: 600, output_tokens: 100, cache_read_input_tokens: 400 });
});

test("text answers, thought summaries, token limits and blocked prompts map to the runner's stop reasons", () => {
  const text = fromGeminiResponse({ candidates: [{ content: { parts: [{ text: "thinking...", thought: true }, { text: "{\"status\":\"ok\"}" }] }, finishReason: "STOP" }] });
  assert.equal(text.stop_reason, "end_turn");
  assert.deepEqual(text.content, [{ type: "text", text: "{\"status\":\"ok\"}" }]);
  assert.equal(fromGeminiResponse({ candidates: [{ content: { parts: [{ text: "{" }] }, finishReason: "MAX_TOKENS" }] }).stop_reason, "max_tokens");
  assert.equal(fromGeminiResponse({ candidates: [{ finishReason: "SAFETY" }] }).stop_reason, "refusal");
  assert.equal(fromGeminiResponse({ promptFeedback: { blockReason: "OTHER" } }).stop_reason, "refusal");
  assert.throws(() => fromGeminiResponse({}), /no answer/);
});

test("a call with no id from Google still gets one", () => {
  const out = fromGeminiResponse({ candidates: [{ content: { parts: [{ functionCall: { name: "a" } }, { functionCall: { name: "b" } }] } }] });
  assert.deepEqual(out.content.map((block) => block.id), ["call_1", "call_2"]);
});

test("model ids lose the google/ and models/ prefixes", () => {
  assert.equal(geminiModelId("google/gemini-3.8-flash"), "gemini-3.8-flash");
  assert.equal(geminiModelId("models/gemini-3.5-flash"), "gemini-3.5-flash");
  assert.equal(geminiModelId("gemini-3.5-flash"), "gemini-3.5-flash");
});

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const answer = { candidates: [{ content: { parts: [{ text: "{\"status\":\"ok\"}" }] }, finishReason: "STOP" }] };

test("the key goes in a header, never the URL, and the model is in the path", async () => {
  const seen: { url: string; headers: Record<string, string> }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => { seen.push({ url, headers: init.headers as Record<string, string> }); return ok(answer); }) as unknown as typeof fetch;
  await geminiClient("secret-key-123", { fetchImpl }).create(base);
  assert.match(seen[0].url, /\/models\/gemini-3\.5-flash:generateContent$/);
  assert.ok(!seen[0].url.includes("secret-key-123"));
  assert.equal(seen[0].headers["x-goog-api-key"], "secret-key-123");
});

test("a busy model is retried, then the answer comes through", async () => {
  let calls = 0;
  const fetchImpl = (async () => { calls += 1; return calls < 3 ? new Response("{}", { status: 503 }) : ok(answer); }) as unknown as typeof fetch;
  const out = await geminiClient("k-0123456789", { fetchImpl, retryDelaysMs: [1, 1] }).create(base);
  assert.equal(calls, 3);
  assert.equal(out.stop_reason, "end_turn");
});

test("a model that stays busy fails with a fixed message after the retries", async () => {
  let calls = 0;
  const fetchImpl = (async () => { calls += 1; return new Response(JSON.stringify({ error: { message: "echoes secret-key-123 and the prompt" } }), { status: 503 }); }) as unknown as typeof fetch;
  await assert.rejects(geminiClient("secret-key-123", { fetchImpl, retryDelaysMs: [1, 1] }).create(base), (error: Error & { status?: number }) => {
    assert.equal(calls, 3);
    assert.equal(error.status, 503);
    assert.equal(error.message, "Gemini is busy right now.");
    assert.ok(!error.message.includes("secret-key-123"));
    return true;
  });
});

test("a refused key surfaces as status 401 so the page can say so, and is not retried", async () => {
  let calls = 0;
  for (const response of [() => new Response("{}", { status: 403 }), () => new Response(JSON.stringify({ error: { status: "INVALID_ARGUMENT", details: [{ reason: "API_KEY_INVALID" }] } }), { status: 400 })]) {
    calls = 0;
    const fetchImpl = (async () => { calls += 1; return response(); }) as unknown as typeof fetch;
    await assert.rejects(geminiClient("bad-key-0123456", { fetchImpl, retryDelaysMs: [1] }).create(base), (error: Error & { status?: number }) => error.status === 401 && error.message === "Gemini rejected the key.");
    assert.equal(calls, 1);
  }
});

test("any other failure keeps its status and says nothing from Google's reply", async () => {
  const fetchImpl = (async () => new Response(JSON.stringify({ error: { message: "Invalid JSON payload: the resume text was..." } }), { status: 400 })) as unknown as typeof fetch;
  await assert.rejects(geminiClient("k-0123456789", { fetchImpl }).create(base), (error: Error & { status?: number }) => error.status === 400 && error.message === "Gemini could not finish the request (400).");
});

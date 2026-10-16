import type { Block, LiveClient, LiveMessage, LiveRequest, LiveResponse } from "./live-agents.ts";

/**
 * Server-only: runs the four agents on Google's Gemini API. The runner speaks Anthropic's message format, so this translates in both directions:
 * system prompt, text, tool calls and tool results go out as Gemini "contents", and the answer comes back as the same blocks the runner already reads.
 * The key goes in a header, never the URL, and no error text ever repeats it or anything Google echoes from the request.
 */
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/";

type Part = {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: { name: string; args?: unknown; id?: string };
  functionResponse?: { name: string; id?: string; response: unknown };
};
type Content = { role: "user" | "model"; parts: Part[] };
type GeminiResponse = {
  candidates?: { content?: { parts?: Part[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; cachedContentTokenCount?: number };
};

/** Gemini counts its thinking tokens against the output limit, so the limit the agent asked for gets this much room on top. */
const THINKING_ROOM = 3000;

/** Gemini 3 takes a thinking level and 2.5 a token budget. An unknown model keeps Google's default. Low thinking keeps these short, structured jobs fast and cheap. */
const thinkingFor = (model: string) => (/gemini-3/.test(model) ? { thinkingLevel: "low" } : /gemini-2\.5/.test(model) ? { thinkingBudget: 1024 } : undefined);

/** "google/gemini-3.5-flash" (an OpenRouter spelling) and "models/gemini-3.5-flash" both become "gemini-3.5-flash". */
export const geminiModelId = (id: string) => id.replace(/^(?:google\/|models\/)/, "");

const asText = (content: unknown): string => (typeof content === "string" ? content : JSON.stringify(content ?? ""));

function toContents(messages: LiveMessage[]): Content[] {
  // A tool result names its call only by id, and Gemini wants the function name too.
  const names = new Map<string, string>();
  for (const message of messages) {
    if (message.role === "assistant" && typeof message.content !== "string") for (const block of message.content) if (block.type === "tool_use" && block.id && block.name) names.set(block.id, block.name);
  }
  return messages.map((message) => {
    const role = message.role === "assistant" ? "model" : "user";
    if (typeof message.content === "string") return { role, parts: [{ text: message.content }] };
    const parts: Part[] = [];
    for (const block of message.content) {
      // Gemini 3 refuses the next turn if a call comes back without the signature it was given, so it rides on the block.
      const signature = typeof block.thoughtSignature === "string" ? { thoughtSignature: block.thoughtSignature } : {};
      if (block.type === "text") parts.push({ text: block.text ?? "", ...signature });
      else if (block.type === "tool_use") parts.push({ functionCall: { name: String(block.name), args: block.input ?? {}, id: block.id }, ...signature });
      else if (block.type === "tool_result") {
        const id = String(block.tool_use_id ?? "");
        parts.push({ functionResponse: { name: names.get(id) ?? "tool", id, response: block.is_error ? { error: asText(block.content) } : { output: asText(block.content) } } });
      }
    }
    return { role, parts };
  });
}

export function toGeminiRequest(request: LiveRequest): Record<string, unknown> {
  const thinking = thinkingFor(request.model);
  return {
    systemInstruction: { parts: [{ text: request.system }] },
    contents: toContents(request.messages),
    ...(request.tools?.length ? { tools: [{ functionDeclarations: request.tools.map((tool) => ({ name: tool.name, description: tool.description, parametersJsonSchema: tool.input_schema })) }] } : {}),
    ...(request.tool_choice?.type === "none" ? { toolConfig: { functionCallingConfig: { mode: "NONE" } } } : {}),
    generationConfig: {
      maxOutputTokens: request.max_tokens + THINKING_ROOM,
      responseMimeType: "application/json",
      responseJsonSchema: request.output_config.format.schema,
      ...(thinking ? { thinkingConfig: thinking } : {}),
    },
  };
}

const REFUSED = new Set(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "IMAGE_SAFETY"]);

export function fromGeminiResponse(json: GeminiResponse): LiveResponse {
  const candidate = json.candidates?.[0];
  const usage = json.usageMetadata;
  const cached = usage?.cachedContentTokenCount ?? 0;
  const counts = { input_tokens: Math.max(0, (usage?.promptTokenCount ?? 0) - cached), output_tokens: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0), cache_read_input_tokens: cached };
  if (!candidate) {
    if (json.promptFeedback?.blockReason) return { stop_reason: "refusal", content: [], usage: counts };
    throw Object.assign(new Error("Gemini returned no answer."), { status: 502 });
  }
  const content: Block[] = [];
  let calls = 0;
  for (const part of candidate.content?.parts ?? []) {
    if (part.thought) continue; // a thought summary is not part of the answer
    const signature = part.thoughtSignature ? { thoughtSignature: part.thoughtSignature } : {};
    if (part.functionCall) { calls += 1; content.push({ type: "tool_use", id: part.functionCall.id ?? `call_${calls}`, name: part.functionCall.name, input: part.functionCall.args ?? {}, ...signature }); }
    else if (typeof part.text === "string") content.push({ type: "text", text: part.text, ...signature });
  }
  const reason = candidate.finishReason ?? "";
  const stop_reason = REFUSED.has(reason) ? "refusal" : reason === "MAX_TOKENS" ? "max_tokens" : calls ? "tool_use" : "end_turn";
  return { stop_reason, content, usage: counts };
}

/** What the page and the usage log may say about a failure. Google's own message is dropped: it can quote the request. */
function failure(status: number, body: { error?: { status?: string; details?: { reason?: string }[] } } | null): Error {
  const rejectedKey = status === 401 || status === 403 || (status === 400 && (body?.error?.details ?? []).some((detail) => detail.reason === "API_KEY_INVALID"));
  // The route treats status 401 as "the key was refused", whatever Google called it.
  const effective = rejectedKey ? 401 : status;
  const text = rejectedKey ? "Gemini rejected the key." : status === 429 ? "Gemini is limiting this key for now." : status === 503 ? "Gemini is busy right now." : `Gemini could not finish the request (${status}).`;
  return Object.assign(new Error(text), { status: effective });
}

const RETRY_STATUSES = new Set([429, 500, 503, 504]);
const pause = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve) => {
  if (signal?.aborted) return resolve();
  const timer = setTimeout(resolve, ms);
  signal?.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
});

export function geminiClient(apiKey: string, options: { fetchImpl?: typeof fetch; retryDelaysMs?: number[] } = {}): LiveClient {
  const doFetch = options.fetchImpl ?? fetch;
  // Busy models are common on Gemini: two quick retries before giving up.
  const delays = options.retryDelaysMs ?? [800, 2000];
  return {
    async create(request: LiveRequest, signal?: AbortSignal): Promise<LiveResponse> {
      const body = JSON.stringify(toGeminiRequest(request));
      const url = `${ENDPOINT}${encodeURIComponent(geminiModelId(request.model))}:generateContent`;
      for (let attempt = 0; ; attempt++) {
        const timeout = AbortSignal.timeout(60_000);
        const response = await doFetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, body, signal: signal ? AbortSignal.any([signal, timeout]) : timeout, cache: "no-store" });
        if (response.ok) return fromGeminiResponse((await response.json()) as GeminiResponse);
        if (RETRY_STATUSES.has(response.status) && attempt < delays.length && !signal?.aborted) { await pause(delays[attempt], signal); continue; }
        throw failure(response.status, (await response.json().catch(() => null)) as Parameters<typeof failure>[1]);
      }
    },
  };
}

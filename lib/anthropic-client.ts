import Anthropic from "@anthropic-ai/sdk";
import type { LiveClient, LiveRequest, LiveResponse } from "./live-agents.ts";
import { openRouterModel } from "./openrouter-models.ts";

type CacheBlock = { type: string; cache_control?: { type: "ephemeral" }; [key: string]: unknown };

/**
 * Marks what the model may reuse from the turn before: the system prompt (with the tools before it) and the newest message. Each agent turn re-sends everything
 * so far; a cached prefix is billed at a tenth of the normal input price. Only Claude models get the marks, since other models may not understand them.
 */
export function withCacheMarks(request: LiveRequest): LiveRequest {
  // `cache` is ours, not the API's, so it never goes upstream.
  const { cache, ...plain } = request;
  if (cache === false || !request.model.toLowerCase().includes("claude")) return plain;
  const mark = { type: "ephemeral" as const };
  const last = plain.messages.length - 1;
  const messages = plain.messages.map((message, index) => {
    if (index !== last) return message;
    const blocks: CacheBlock[] = typeof message.content === "string" ? [{ type: "text", text: message.content }] : message.content.map((block) => ({ ...block }));
    if (blocks.length) blocks[blocks.length - 1] = { ...blocks[blocks.length - 1], cache_control: mark };
    return { ...message, content: blocks as unknown as LiveRequest["messages"][number]["content"] };
  });
  return { ...plain, system: [{ type: "text", text: plain.system, cache_control: mark }] as unknown as string, messages };
}

/** Server-only: wraps the official SDK in the narrow client seam the runner uses. Never import this from a client component. */
export function anthropicClient(apiKey: string, provider: "anthropic" | "openrouter" = "anthropic"): LiveClient {
  // OpenRouter speaks the Anthropic Messages format; the SDK appends /v1/messages to this base URL.
  const sdk = provider === "openrouter"
    ? new Anthropic({ baseURL: "https://openrouter.ai/api", authToken: apiKey, apiKey: null, maxRetries: 1, timeout: 60_000 })
    : new Anthropic({ apiKey, maxRetries: 1, timeout: 60_000 });
  return {
    async create(request: LiveRequest, signal?: AbortSignal): Promise<LiveResponse> {
      const marked = withCacheMarks(request);
      const sent = provider === "openrouter" ? { ...marked, model: openRouterModel(request.model) } : marked;
      // The SDK's parameter types lag the structured-output and tool shapes the specs use, so cast at this one seam.
      const response = await sdk.messages.create(sent as unknown as Anthropic.MessageCreateParamsNonStreaming, { signal });
      return response as unknown as LiveResponse;
    },
  };
}

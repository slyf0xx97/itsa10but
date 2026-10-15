import Anthropic from "@anthropic-ai/sdk";
import type { LiveClient, LiveRequest, LiveResponse } from "./live-agents.ts";
import { openRouterModel } from "./openrouter-models.ts";

/** Server-only: wraps the official SDK in the narrow client seam the runner uses. Never import this from a client component. */
export function anthropicClient(apiKey: string, provider: "anthropic" | "openrouter" = "anthropic"): LiveClient {
  // OpenRouter speaks the Anthropic Messages format; the SDK appends /v1/messages to this base URL.
  const sdk = provider === "openrouter"
    ? new Anthropic({ baseURL: "https://openrouter.ai/api", authToken: apiKey, apiKey: null, maxRetries: 1, timeout: 60_000 })
    : new Anthropic({ apiKey, maxRetries: 1, timeout: 60_000 });
  return {
    async create(request: LiveRequest, signal?: AbortSignal): Promise<LiveResponse> {
      const sent = provider === "openrouter" ? { ...request, model: openRouterModel(request.model) } : request;
      // The SDK's parameter types lag the structured-output and tool shapes the specs use, so cast at this one seam.
      const response = await sdk.messages.create(sent as unknown as Anthropic.MessageCreateParamsNonStreaming, { signal });
      return response as unknown as LiveResponse;
    },
  };
}

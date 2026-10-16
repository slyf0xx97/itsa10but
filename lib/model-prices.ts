import { openRouterModel } from "./openrouter-models.ts";

/** US dollars per million tokens (input, output), from OpenRouter's public model list on 2026-10-16. Estimates only: the provider's bill is the real figure. */
const PRICES: Record<string, readonly [number, number]> = {
  "anthropic/claude-haiku-5.5": [0.1, 0.5],
  "anthropic/claude-sonnet-5.5": [2, 10],
  "anthropic/claude-opus-5.5": [4, 20],
  "anthropic/claude-fable-5.1": [10, 50],
};

/**
 * Estimated cost in dollars, or null when the model has no listed price (a non-Claude model, say). `inputTokens` is the whole prompt. Tokens read from the cache
 * cost a tenth of the input price, and tokens written to it a quarter more (Anthropic's published cache rates), so a run that reuses its prompt costs less.
 */
export function estimateCost(model: string | undefined, inputTokens: number, outputTokens: number, cacheReadTokens = 0, cacheWriteTokens = 0): number | null {
  const price = model ? PRICES[openRouterModel(model)] : undefined;
  if (!price) return null;
  const fresh = Math.max(0, inputTokens - cacheReadTokens - cacheWriteTokens);
  return ((fresh + cacheReadTokens * 0.1 + cacheWriteTokens * 1.25) * price[0] + outputTokens * price[1]) / 1_000_000;
}

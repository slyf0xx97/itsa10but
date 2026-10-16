/** Maps an Anthropic model id to its OpenRouter slug: claude-sonnet-5-5 becomes anthropic/claude-sonnet-5.5. Anything else passes through. */
export function openRouterModel(id: string): string {
  const match = /^claude-([a-z]+)-(\d+)-(\d+)$/.exec(id);
  return match ? `anthropic/claude-${match[1]}-${match[2]}.${match[3]}` : id;
}

import type { ModelProvider } from "./model-choice.ts";

/**
 * Which provider a pasted key belongs to, from how it starts. The server and the page both use this so they agree on which header a key goes in.
 * OpenRouter keys start with sk-or-, Google's with AIza (or AQ. for the newer format), and anything else is taken to be an Anthropic key.
 */
export const keyProvider = (key: string): ModelProvider => (key.startsWith("sk-or-") ? "openrouter" : /^(?:AIza|AQ\.)/.test(key) ? "gemini" : "anthropic");

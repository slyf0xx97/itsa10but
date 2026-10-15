/** Maps an Anthropic model id to its OpenRouter slug: claude-sonnet-5-5 becomes anthropic/claude-sonnet-5.5. Anything else passes through. */
export function openRouterModel(id: string): string {
  const match = /^claude-([a-z]+)-(\d+)-(\d+)$/.exec(id);
  return match ? `anthropic/claude-${match[1]}-${match[2]}.${match[3]}` : id;
}

/** OpenRouter keys start with sk-or-. The server and the page both use this so they agree on which header a key goes in. */
export const keyProvider = (key: string): "openrouter" | "anthropic" => (key.startsWith("sk-or-") ? "openrouter" : "anthropic");

/**
 * Which model the four API boost agents run on. A visitor with their own key can pick one. The pick is not a secret, so it travels in
 * the request body as `model`. The server validates it here before it goes anywhere. Without a pick (or with "recommended"), every
 * agent keeps the model its spec names. Without a visitor key (the site key) only the recommended mix is allowed.
 */
export type ModelProvider = "anthropic" | "openrouter";
export type ModelOption = { id: string; label: string; note: string };

export const RECOMMENDED = "recommended";
/** What results call a run that kept each agent on its default model. No model name, because the default is ours and the visitor never picked it. */
export const RECOMMENDED_MIX = "recommended mix";
export const CUSTOM = "custom";
export const MAX_MODEL_ID = 100;

export const RECOMMENDED_OPTION: ModelOption = { id: RECOMMENDED, label: "Recommended mix", note: "Haiku 5.5 reads the role and Sonnet 5.5 does the rest. The best balance of cost and care, and the one we test." };

/** Direct Anthropic keys can only use Claude models. */
export const ANTHROPIC_MODELS: readonly ModelOption[] = [
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", note: "Fastest and lowest cost. May miss detail in long résumés." },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", note: "Balanced cost, speed and care." },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", note: "Most careful, but slower and the highest cost. It can run out of time and fall back to the native scan." },
];

/** A short list checked against OpenRouter's catalogue on 15 Oct 2026. Each supports tool calls and structured output there. Prices move, so none are shown. */
export const OPENROUTER_MODELS: readonly ModelOption[] = [
  { id: "anthropic/claude-haiku-5.5", label: "Claude Haiku 5.5", note: "Fastest and lowest cost of the Claude models." },
  { id: "anthropic/claude-sonnet-5.5", label: "Claude Sonnet 5.5", note: "Balanced cost, speed and care." },
  { id: "anthropic/claude-opus-5.5", label: "Claude Opus 5.5", note: "Most careful, but slower and the highest cost. It can run out of time and fall back to the native scan." },
  { id: "openai/gpt-5.6-terra", label: "GPT-5.6 Terra", note: "Mid cost. Not tested with these agents, so it may break the answer format." },
  { id: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash", note: "Fast and low cost. Not tested with these agents, so it may break the answer format." },
  { id: "deepseek/deepseek-v4.1-flash", label: "DeepSeek V4.1 Flash", note: "Very low cost. Not tested with these agents, so it may break the answer format." },
];

export const CUSTOM_NOTE = "Any model id from openrouter.ai/models, written as provider/model-name. Cost and speed depend on the model. If it can't call tools or follow the answer format, the run falls back to the native scan.";

export const modelOptions = (provider: ModelProvider): readonly ModelOption[] => (provider === "openrouter" ? OPENROUTER_MODELS : ANTHROPIC_MODELS);

/** provider/model-name: letters, digits, dot, dash, underscore, and a colon for variants such as :free. */
const CUSTOM_ID = /^[a-z0-9][a-z0-9._-]{0,39}\/[a-z0-9][a-z0-9._:-]{0,59}$/i;
export const isCustomModelId = (value: string) => value.length <= MAX_MODEL_ID && CUSTOM_ID.test(value) && !value.includes("..");

const BAD_MODEL = {
  anthropic: "Pick one of the listed Claude models, or leave it on the recommended mix.",
  openrouter: "That model id does not look right. Use provider/model-name, such as openai/gpt-5.6-terra.",
  site: "Choosing a model needs your own API key. This site's key uses the recommended mix.",
} as const;

export type ModelCheck = { ok: true; model?: string } | { ok: false; error: string };

/**
 * Checks the `model` field of a request. `provider` is "site" when the run uses the site's own key. The result's `model` is undefined for
 * the recommended mix. The error text is fixed, so nothing the visitor typed is echoed back.
 */
export function checkModelChoice(value: unknown, provider: ModelProvider | "site"): ModelCheck {
  if (value === undefined || value === null || value === "" || value === RECOMMENDED) return { ok: true };
  if (typeof value !== "string") return { ok: false, error: BAD_MODEL[provider] };
  const id = value.trim();
  if (id === RECOMMENDED) return { ok: true };
  if (provider === "site") return { ok: false, error: BAD_MODEL.site };
  if (provider === "anthropic") return ANTHROPIC_MODELS.some((option) => option.id === id) ? { ok: true, model: id } : { ok: false, error: BAD_MODEL.anthropic };
  return isCustomModelId(id) ? { ok: true, model: id } : { ok: false, error: BAD_MODEL.openrouter };
}

/**
 * What the page sends. `pick` is a select value (recommended, a listed id or "custom") and `custom` the typed id. A pick that the current
 * provider doesn't list falls back to the recommended mix, so changing keys never sends a stale choice. Returns undefined to send nothing.
 */
export function modelToSend(pick: string | undefined, custom: string | undefined, provider: ModelProvider): string | undefined {
  if (!pick || pick === RECOMMENDED) return undefined;
  if (pick === CUSTOM) return provider === "openrouter" ? custom?.trim() || undefined : undefined;
  return modelOptions(provider).some((option) => option.id === pick) ? pick : undefined;
}

const KNOWN_LABELS = new Map<string, string>([
  ...ANTHROPIC_MODELS.map((option) => [option.id, option.label.replace(/^Claude /, "")] as const),
  ...OPENROUTER_MODELS.map((option) => [option.id, option.label.replace(/^Claude /, "")] as const),
]);

/** A short name for results: "Haiku 5.5" for a known id, the id itself otherwise. */
export const modelLabel = (id: string) => KNOWN_LABELS.get(id) ?? id;

/** True for Claude model ids, in Anthropic or OpenRouter spelling. */
export const isClaudeModel = (id: string) => /^(anthropic\/)?claude-/i.test(id);

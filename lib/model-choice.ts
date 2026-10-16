/**
 * Which model the four API boost agents run on. A visitor with their own key can pick one. The pick is not a secret, so it travels in
 * the request body as `model`. The server validates it here before it goes anywhere. Without a pick (or with "recommended"), the agents run on the
 * provider's default: each agent's own Claude model for an Anthropic key, one low-cost model for the other two. Without a visitor key (the site key)
 * only the recommended choice is allowed.
 */
export type ModelProvider = "anthropic" | "openrouter" | "gemini";
export type ModelOption = { id: string; label: string; note: string };

export const RECOMMENDED = "recommended";
/** What results call a run that kept each Claude agent on its default model. No model name, because the default is ours and the visitor never picked it. */
export const RECOMMENDED_MIX = "recommended mix";
export const CUSTOM = "custom";
export const MAX_MODEL_ID = 100;

/**
 * The one model all four agents use when the visitor leaves the choice on "recommended". Anthropic has none: each agent keeps the Claude model its spec names.
 * Both defaults were picked for cost and for tool calling plus structured output, which these agents need.
 */
export const DEFAULT_MODELS: Record<ModelProvider, string | undefined> = {
  anthropic: undefined,
  openrouter: "deepseek/deepseek-v4.1-flash",
  gemini: "gemini-3.1-flash-lite",
};

export const RECOMMENDED_OPTION: ModelOption = { id: RECOMMENDED, label: "Recommended mix", note: "Haiku 5.5 reads the role and Sonnet 5.5 does the rest. The best balance of cost and care, and the one we test." };

/** The first choice in the model list: what runs when nothing is picked. */
export function recommendedOption(provider: ModelProvider): ModelOption {
  if (provider === "openrouter") return { id: RECOMMENDED, label: "Recommended: DeepSeek V4.1 Flash", note: "Very low cost and finishes a run in about ten seconds. The model we test through OpenRouter." };
  if (provider === "gemini") return { id: RECOMMENDED, label: "Recommended: Gemini 3.1 Flash Lite", note: "The lowest cost Gemini model that calls tools and follows the answer format." };
  return RECOMMENDED_OPTION;
}

/** Direct Anthropic keys can only use Claude models. */
export const ANTHROPIC_MODELS: readonly ModelOption[] = [
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", note: "Fastest and lowest cost. May miss detail in long résumés." },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", note: "Balanced cost, speed and care." },
];

/** A short list checked against OpenRouter's catalogue on 16 Oct 2026. Each supports tool calls and structured output there. Prices move, so none are shown. */
export const OPENROUTER_MODELS: readonly ModelOption[] = [
  { id: "deepseek/deepseek-v4.1-flash", label: "DeepSeek V4.1 Flash", note: "Very low cost and quick. The recommended model. Thinking is switched off to keep each agent inside its time." },
  { id: "google/gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", note: "Low cost. Not tested through OpenRouter with these agents, so it may break the answer format." },
  { id: "anthropic/claude-haiku-5.5", label: "Claude Haiku 5.5", note: "Fastest and lowest cost of the Claude models. Careful with long résumés." },
  { id: "anthropic/claude-sonnet-5.5", label: "Claude Sonnet 5.5", note: "Balanced cost, speed and care." },
  { id: "openai/gpt-5.6-terra", label: "GPT-5.6 Terra", note: "Mid cost. Not tested with these agents, so it may break the answer format." },
];

/** Model ids from the Gemini API's own list, 16 Oct 2026. Only the Lite models are offered, for cost. There is no custom id for Gemini. */
export const GEMINI_MODELS: readonly ModelOption[] = [
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", note: "Lowest cost. The recommended model. May miss detail in long résumés." },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite", note: "Low cost and newer. Try it if 3.1 is busy." },
];

export const CUSTOM_NOTE = "Any model id from openrouter.ai/models, written as provider/model-name. Cost and speed depend on the model. A model that must think at length can be too slow, and a model that can't call tools or follow the answer format fails. Either way the run stops and offers the native scan.";

export const modelOptions = (provider: ModelProvider): readonly ModelOption[] => (provider === "openrouter" ? OPENROUTER_MODELS : provider === "gemini" ? GEMINI_MODELS : ANTHROPIC_MODELS);

/** provider/model-name: letters, digits, dot, dash, underscore, and a colon for variants such as :free. */
const CUSTOM_ID = /^[a-z0-9][a-z0-9._-]{0,39}\/[a-z0-9][a-z0-9._:-]{0,59}$/i;
export const isCustomModelId = (value: string) => value.length <= MAX_MODEL_ID && CUSTOM_ID.test(value) && !value.includes("..");

const BAD_MODEL = {
  anthropic: "Pick one of the listed Claude models, or leave it on the recommended mix.",
  openrouter: "That model id does not look right. Use provider/model-name, such as openai/gpt-5.6-terra.",
  gemini: "Pick one of the listed Gemini models, or leave it on the recommended model.",
  site: "Choosing a model needs your own API key. This site's key uses the recommended mix.",
} as const;

export type ModelCheck = { ok: true; model?: string } | { ok: false; error: string };

/**
 * Checks the `model` field of a request. `provider` is "site" when the run uses the site's own key. The result's `model` is undefined for
 * the recommended choice. The error text is fixed, so nothing the visitor typed is echoed back.
 */
export function checkModelChoice(value: unknown, provider: ModelProvider | "site"): ModelCheck {
  if (value === undefined || value === null || value === "" || value === RECOMMENDED) return { ok: true };
  if (typeof value !== "string") return { ok: false, error: BAD_MODEL[provider] };
  const id = value.trim();
  if (id === RECOMMENDED) return { ok: true };
  if (provider === "site") return { ok: false, error: BAD_MODEL.site };
  // Anthropic and Gemini keys take only the listed models. OpenRouter also takes a well-formed id of any model.
  if (provider !== "openrouter") return modelOptions(provider).some((option) => option.id === id) ? { ok: true, model: id } : { ok: false, error: BAD_MODEL[provider] };
  return isCustomModelId(id) ? { ok: true, model: id } : { ok: false, error: BAD_MODEL.openrouter };
}

/**
 * What the page sends. `pick` is a select value (recommended, a listed id or "custom") and `custom` the typed id. A pick that the current
 * provider doesn't list falls back to the recommended choice, so changing keys never sends a stale choice. Returns undefined to send nothing.
 */
export function modelToSend(pick: string | undefined, custom: string | undefined, provider: ModelProvider): string | undefined {
  if (!pick || pick === RECOMMENDED) return undefined;
  if (pick === CUSTOM) return provider === "openrouter" ? custom?.trim() || undefined : undefined;
  return modelOptions(provider).some((option) => option.id === pick) ? pick : undefined;
}

const KNOWN_LABELS = new Map<string, string>([
  ...ANTHROPIC_MODELS.map((option) => [option.id, option.label.replace(/^Claude /, "")] as const),
  ...OPENROUTER_MODELS.map((option) => [option.id, option.label.replace(/^Claude /, "")] as const),
  ...GEMINI_MODELS.map((option) => [option.id, option.label] as const),
]);

/** A short name for results: "Haiku 5.5" for a known id, the id itself otherwise. */
export const modelLabel = (id: string) => KNOWN_LABELS.get(id) ?? id;

/** True for Claude model ids, in Anthropic or OpenRouter spelling. */
export const isClaudeModel = (id: string) => /^(anthropic\/)?claude-/i.test(id);

/* ---- One model per agent ---- */

/** The four agents, in run order. The page, the server and the runner all key a per-agent pick by these names. */
export const AGENT_NAMES = ["Role Scout", "Experience Finder", "Recruiter", "Action Planner"] as const;
export type AgentName = (typeof AGENT_NAMES)[number];
/** A visitor's pick for each agent. An agent without a pick follows the pick for all four, then the provider's default. */
export type AgentModels = Partial<Record<AgentName, string>>;

const isAgentName = (value: string): value is AgentName => (AGENT_NAMES as readonly string[]).includes(value);

const BAD_AGENT_MODELS = "Those model choices do not look right. Pick each agent's model from its list, or leave it on the default.";

/**
 * Checks the `agentModels` field of a request: an object of agent name to model id. Every id goes through checkModelChoice for the key's provider, so an agent can take
 * exactly what the all-agents pick can. An unknown agent name, a non-object or one bad id refuses the whole field, with fixed text. Empty and "recommended" entries are dropped.
 */
export function checkAgentModels(value: unknown, provider: ModelProvider | "site"): { ok: true; models: AgentModels } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, models: {} };
  if (typeof value !== "object" || Array.isArray(value)) return { ok: false, error: BAD_AGENT_MODELS };
  const models: AgentModels = {};
  for (const [name, pick] of Object.entries(value as Record<string, unknown>)) {
    if (!isAgentName(name)) return { ok: false, error: BAD_AGENT_MODELS };
    const checked = checkModelChoice(pick, provider);
    if (!checked.ok) return { ok: false, error: BAD_AGENT_MODELS };
    if (checked.model) models[name] = checked.model;
  }
  return { ok: true, models };
}

/** What the page sends: only the picks this provider can take, so changing keys never sends a stale one. Undefined when nothing is picked. */
export function agentModelsToSend(picks: AgentModels | undefined, provider: ModelProvider): AgentModels | undefined {
  const kept: AgentModels = {};
  for (const name of AGENT_NAMES) {
    const pick = picks?.[name];
    if (pick && checkModelChoice(pick, provider).ok) kept[name] = pick;
  }
  return Object.keys(kept).length ? kept : undefined;
}

/**
 * The model one agent runs on: its own pick, else the pick for all four, else the provider's default, else the model the spec names (an Anthropic key keeps each
 * agent's own Claude model). `provider` is undefined before a key is entered, when only the spec's model is known.
 */
export function effectiveModel(agent: AgentName, ctx: { picks?: AgentModels; all?: string; provider?: ModelProvider; specModel: string }): string {
  return ctx.picks?.[agent] ?? ctx.all ?? (ctx.provider ? DEFAULT_MODELS[ctx.provider] : undefined) ?? ctx.specModel;
}

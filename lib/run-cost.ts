import { effectiveModel, type AgentModels, type AgentName, type ModelProvider } from "./model-choice.ts";
import { estimateCost } from "./model-prices.ts";

/**
 * The tokens each agent used in one recorded run on the sample role (the same figures lib/demo-live.ts replays). A real run on a longer résumé or a wordier posting
 * can use more, so the page says "usually below", never "will cost". The model each Anthropic agent gets by default is repeated here because the client side
 * must not import lib/agents; lib/run-cost.test.ts fails if it drifts from AGENT_SPECS.
 */
export const TYPICAL_RUN = [
  { agent: "Role Scout", claude: "claude-haiku-5-5", input: 16_944, output: 2275 },
  { agent: "Experience Finder", claude: "claude-sonnet-5-5", input: 13_148, output: 1910 },
  { agent: "Recruiter", claude: "claude-sonnet-5-5", input: 2889, output: 936 },
  { agent: "Action Planner", claude: "claude-sonnet-5-5", input: 8330, output: 1088 },
] as const;

/** Room on top of the recorded run for longer texts, a retry, and the thinking tokens some models bill as output. */
const HEADROOM = 1.3;

/**
 * Estimated dollars for a typical run. `model` is the one the visitor picked for all four agents and `picks` the ones they picked for single agents. Without a pick, Anthropic
 * keys run each agent on its own Claude model and the other providers on their default. Null when a model has no listed price. Cached input is not counted as cheaper, so the figure is a ceiling for Claude.
 */
export function typicalRunCost(provider: ModelProvider, model?: string, picks?: AgentModels): number | null {
  let total = 0;
  for (const row of TYPICAL_RUN) {
    const used = effectiveModel(row.agent as AgentName, { picks, all: model, provider, specModel: row.claude });
    const cost = estimateCost(used, row.input, row.output);
    if (cost === null) return null;
    total += cost;
  }
  return total;
}

/** Rounds a cost up to a figure worth printing: the next cent below ten cents, the next five cents above. */
export function costCeiling(dollars: number): string {
  const padded = dollars * HEADROOM;
  const rounded = padded < 0.1 ? Math.max(0.01, Math.ceil(padded * 100) / 100) : Math.ceil(padded * 20) / 20;
  return "$" + rounded.toFixed(2);
}

/** The sentence under the API boost intro: "Estimated cost is usually below $0.01." Honest about a model with no listed price. */
export function costSentence(provider: ModelProvider, model?: string, picks?: AgentModels): string {
  const cost = typicalRunCost(provider, model, picks);
  return cost === null ? "The cost depends on the model you pick, and this one has no listed price." : `Estimated cost is usually below ${costCeiling(cost)} a run.`;
}

/** Before a key is entered: what each provider's recommended setup usually costs, in one sentence. */
export function costOverview(): string {
  const [openrouter, gemini, anthropic] = (["openrouter", "gemini", "anthropic"] as const).map((provider) => costCeiling(typicalRunCost(provider)!));
  return `Estimated cost is usually below ${openrouter} a run on OpenRouter, ${gemini} on Gemini and ${anthropic} on Anthropic.`;
}

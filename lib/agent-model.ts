import { DEFAULT_MODELS, type AgentModels, type AgentName, type ModelProvider } from "./model-choice.ts";

/** Which model an agent will run on, and why. Undefined before a key is entered, because without one no model runs. */
export type ModelSource = { model: string; from: "agent" | "all" | "default"; provider: ModelProvider };

/** What the cards need to let a visitor choose a model per agent. `onPick` with undefined puts the agent back on its default. */
export type ModelSettings = { provider?: ModelProvider; all?: string; picks: AgentModels; onPick: (agent: AgentName, model: string | undefined) => void };

/**
 * The model one agent will use and where it came from: the visitor's pick for this agent, their pick for all four, or the key's default. `specModel` is the
 * Claude model the agent's spec names, which an Anthropic key keeps by default. Mirrors effectiveModel in lib/model-choice.ts, plus the reason.
 */
export function agentModelSource(agent: AgentName, ctx: { provider?: ModelProvider; picks?: AgentModels; all?: string; specModel: string }): ModelSource | undefined {
  const { provider } = ctx;
  if (!provider) return undefined;
  const own = ctx.picks?.[agent];
  if (own) return { model: own, from: "agent", provider };
  if (ctx.all) return { model: ctx.all, from: "all", provider };
  return { model: DEFAULT_MODELS[provider] ?? ctx.specModel, from: "default", provider };
}

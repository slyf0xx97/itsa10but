/**
 * Each live agent as a Markdown file, built from its real spec: the role prompt, the rules every reader shares, what it receives, its tools, the shape of its answer, its limits and when it refuses.
 * The page shows these as a peek (a short look on hover, the whole file on click) so a visitor can see how every agent is prompt-engineered.
 * Nothing here is written twice: the text comes from lib/agents/*, so the file always matches what the runner sends. The specs hold prompts, schemas and limits only, and no key or secret.
 */
import { actionPlanner } from "./agents/action-planner.ts";
import { experienceFinder } from "./agents/experience-finder.ts";
import { recruiter } from "./agents/recruiter.ts";
import { roleScout } from "./agents/role-scout.ts";
import { SHARED_PREAMBLE, TOOL_DEFINITIONS, type AgentSpec, type BaseOutput, type JsonSchema } from "./agents/shared.ts";
import type { ModelSource } from "./agent-model.ts";
import { DEFAULT_MODELS, modelLabel } from "./model-choice.ts";
import { PROVIDER_LABEL } from "./provider-copy.ts";
import type { ReaderName } from "./simulated-engine.ts";

const SEPARATOR = "\n\n---\n\n";

type AnySpec = AgentSpec<never, BaseOutput>;
const SPECS = [roleScout, experienceFinder, recruiter, actionPlanner] as unknown as AnySpec[];

const kebab = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function typeOf(schema: JsonSchema): string {
  if ("anyOf" in schema) return schema.anyOf.map(typeOf).join(" or ");
  if (schema.type === "string") return schema.enum ? schema.enum.map((value) => `"${value}"`).join(" or ") : "text";
  if (schema.type === "integer") return "whole number";
  if (schema.type === "boolean") return "true or false";
  if (schema.type === "array") return "list of " + (typeOf(schema.items) === "object" ? "objects" : typeOf(schema.items));
  if (schema.type === "null") return "null";
  return "object";
}

/** The answer format as an indented list, one field per line with its type and what it holds. */
export function schemaLines(schema: JsonSchema, depth = 0): string[] {
  const pad = "  ".repeat(depth);
  let own: JsonSchema = schema;
  if ("anyOf" in own) own = own.anyOf.find((option) => !("anyOf" in option) && (option.type === "object" || option.type === "array")) ?? own;
  if ("anyOf" in own) return [];
  if (own.type === "array") return schemaLines(own.items, depth);
  if (own.type !== "object") return [];
  return Object.entries(own.properties).flatMap(([key, child]) => {
    const note = "description" in child && child.description ? `: ${child.description}` : "";
    return [`${pad}- ${key} (${typeOf(child)})${note}`, ...schemaLines(child, depth + 1)];
  });
}

export type AgentPrompt = { name: ReaderName; file: string; markdown: string };

/**
 * The file's "Model:" line says which model will really run this agent. With a key entered it names that model and why (picked for this agent, picked for all four, or the
 * key's default). Before a key there is no model to name, so it lists what each kind of key starts on, and no provider comes first.
 */
function modelLine(spec: AnySpec, source?: ModelSource): string {
  if (!source) {
    return `Model: set by your key. An OpenRouter key starts on ${modelLabel(DEFAULT_MODELS.openrouter!)}, a Gemini key on ${modelLabel(DEFAULT_MODELS.gemini!)} and an Anthropic key on ${modelLabel(spec.model)}. Add a key, then use the gear on this card to pick another.`;
  }
  const label = modelLabel(source.model);
  if (source.from === "agent") return `Model: ${label}, the one you picked for this agent. The other agents keep their own.`;
  if (source.from === "all") return `Model: ${label}, the one you picked for all four agents.`;
  return `Model: ${label}, the default for your ${PROVIDER_LABEL[source.provider]} key. Use the gear on this card to pick another.`;
}

function build(spec: AnySpec, source?: ModelSource): AgentPrompt {
  const cut = spec.system.indexOf(SEPARATOR); // systemPrompt() puts the shared rules first, then this line, then the role
  const role = cut >= 0 ? spec.system.slice(cut + SEPARATOR.length) : spec.system;
  const seconds = Math.round(spec.limits.timeoutMs / 1000);
  const lines = [
    `# ${spec.name}`,
    "",
    modelLine(spec, source),
    `Tools: ${spec.tools.length ? spec.tools.join(", ") : "none"}`,
    `Limits: ${spec.limits.maxToolCalls} tool calls, ${spec.limits.maxTurns} turns, ${seconds} seconds`,
    "",
    "## Role prompt",
    role.trim(),
    "",
    "## Shared rules (every reader gets these first)",
    SHARED_PREAMBLE.trim(),
    "",
    "## What it receives",
    ...spec.inputs.map((input) => `- ${input}`),
    "",
    "## Tools",
    ...(spec.tools.length ? spec.tools.map((tool) => `- ${tool}: ${TOOL_DEFINITIONS[tool].description}`) : ["- None. Everything it needs is in the message."]),
    "",
    "## Answer format",
    "One JSON object, checked against this schema before the runner trusts it:",
    ...schemaLines(spec.outputSchema),
    "",
    "## When it refuses",
    spec.refusal,
  ];
  return { name: spec.name, file: kebab(spec.name) + ".md", markdown: lines.join("\n") };
}

export const AGENT_PROMPTS: AgentPrompt[] = SPECS.map((spec) => build(spec));

/** The prompt file for one agent. Pass the model source to name the model that will run it. */
export const promptFor = (name: string, source?: ModelSource): AgentPrompt | undefined => {
  const spec = SPECS.find((candidate) => candidate.name === name);
  return spec && build(spec, source);
};

/** The Claude model an agent's spec names: what an Anthropic key runs it on by default. */
export const specModelOf = (name: string): string | undefined => SPECS.find((spec) => spec.name === name)?.model;

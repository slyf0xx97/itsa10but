import type { Analysis, AtsCheck, CompanyCulture, Resume } from "./analysis-types.ts";
import { atsCheck, atsCheckInfo, atsScore, keywordCoverage, topFixes } from "./ats-check.ts";
import { AGENT_SPECS, analysisShapeFromOutputs } from "./agents/index.ts";
import type { ActionPlannerOutput, PlannerGap } from "./agents/action-planner.ts";
import type { ExperienceFinderOutput, WeakProof } from "./agents/experience-finder.ts";
import type { RecruiterOutput } from "./agents/recruiter.ts";
import type { CompanyFinding, RoleScoutOutput } from "./agents/role-scout.ts";
import { resolveModel, TOOL_DEFINITIONS, untrusted, type AgentSpec, type BaseOutput, type JsonSchema, type ToolName } from "./agents/shared.ts";
import { logUsage, type Edge, type UsageLogRow } from "./edge-client.ts";
import { createWebTools, type ToolResult } from "./firecrawl-tools.ts";
import { RECOMMENDED_MIX, isClaudeModel, modelLabel, type AgentModels, type AgentName } from "./model-choice.ts";
import { safeJobUrl } from "./job-types.ts";
import { extractLinkedinJobId, guestPostingUrl, htmlToJobText } from "./linkedin-url.ts";
import { detectCompany, showItTips } from "./company-culture.ts";
import { gatherCompany, guessCompanyName, intelData, type CompanyIntel } from "./company-intel.ts";
import { hasTerm } from "./preview-analysis.ts";
import { playbookFor, questFor } from "./skill-playbooks.ts";
import { recruiterReview } from "./recruiter-review.ts";
import { chunkResume, verifyQuote, type Chunk } from "./rag.ts";
import { runSafetyCheck } from "./safety.ts";
import { computeMatch } from "./scoring.ts";
import { laneLabel } from "./agent-abilities.ts";
import { runSimulatedEngine, type EngineEvent, type EngineResult, type ReaderName } from "./simulated-engine.ts";

/* ---- Client seam: the route passes a real Anthropic adapter, tests pass a fake. ---- */

export type Block = { type: string; text?: string; id?: string; name?: string; input?: unknown; [key: string]: unknown };
export type LiveMessage = { role: "user" | "assistant"; content: string | Block[] };
export type LiveRequest = {
  model: string;
  max_tokens: number;
  system: string;
  messages: LiveMessage[];
  tools?: { name: string; description: string; input_schema: unknown }[];
  tool_choice?: { type: "none" };
  output_config: { format: { type: "json_schema"; schema: unknown } };
  /** False for an agent that answers in one turn: it never reuses its prompt, so caching would only cost the write premium. Default true. */
  cache?: boolean;
};
/** `input_tokens` counts only the part of the prompt that was not served from cache; the cache fields hold the rest. */
export type LiveResponse = { stop_reason: string | null; content: Block[]; usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number } };
export type LiveClient = { create(request: LiveRequest, signal?: AbortSignal): Promise<LiveResponse> };

export type LiveDeps = {
  client: LiveClient;
  /** With neither this key nor the edge Worker, the web tools are not offered to the agents at all, and the start event says web search is off. */
  firecrawlKey?: string;
  /** The edge Worker: web lookups work without a Firecrawl key, and usage rows are logged to it. */
  edge?: Edge;
  /** "openrouter" or "anthropic", for the usage log. */
  provider?: string;
  /** Pause between the small steps a card shows (each checked fact, each sentence of the note), in ms. The route sets it; tests leave it at 0. */
  paceMs?: number;
  /** Receives background work (the usage log) so the host can wait for it after the response ends. */
  track?: (task: Promise<unknown>) => void;
  /** How often a waiting model call reports progress, in ms (default 1000). */
  heartbeatMs?: number;
  /** A model the visitor chose for all four agents. Already validated by checkModelChoice. Leave out for each spec's own model. */
  model?: string;
  /** A model the visitor chose for one agent, by agent name. Already validated by checkAgentModels. It wins over `model` for that agent. */
  agentModels?: AgentModels;
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
  /** A LinkedIn job link the user gave. The link itself never reaches the model. */
  linkedinUrl?: string;
  /** Total wall-clock budget for the whole live run. */
  deadlineMs?: number;
  runId?: string;
  signal?: AbortSignal;
};

/** Same limits as the keyless routes: 1-3 résumés of 25-30,000 characters, role text of 30-15,000. Run before any model call. */
export function validateLiveBody(body: unknown): { ok: true; resumes: Resume[]; job: string; linkedinUrl?: string } | { ok: false; error: string } {
  const value = (body ?? {}) as { resumes?: Resume[]; job?: unknown; linkedinUrl?: unknown };
  if (
    !Array.isArray(value.resumes) || value.resumes.length < 1 || value.resumes.length > 3 ||
    !value.resumes.every((item) => item && typeof item.name === "string" && typeof item.text === "string" && item.text.trim().length >= 25 && item.text.length <= 30000) ||
    typeof value.job !== "string" || value.job.trim().length < 30 || value.job.length > 15000
  ) return { ok: false, error: "Add 1 to 3 readable résumés and a job description of at least 30 characters." };
  const linkedinUrl = typeof value.linkedinUrl === "string" && value.linkedinUrl.length <= 500 && extractLinkedinJobId(value.linkedinUrl) ? value.linkedinUrl : undefined;
  return { ok: true, resumes: value.resumes.map((item, i) => ({ id: String(item.id ?? i), name: item.name.slice(0, 120), text: item.text })), job: value.job, linkedinUrl };
}

/* ---- Fallback ---- */

export type FallbackReason = "refusal" | "timeout" | "api-error" | "unverifiable" | "bad-output" | "limit";
class LiveFallback extends Error {
  reason: FallbackReason;
  constructor(reason: FallbackReason) { super(reason); this.reason = reason; }
}
/** Wording never names a vendor: with an OpenRouter key the visitor may run any model. */
const fallbackText = (reason: FallbackReason): string => {
  switch (reason) {
    case "refusal": return "The model declined to read this material.";
    case "timeout": return "The agents ran out of time.";
    case "api-error": return "The agents were unavailable.";
    case "unverifiable": return "Too many of the model's quotes could not be found in your text.";
    case "bad-output": return "The model's answer didn't have the expected shape.";
    case "limit": return "An agent hit its work limit.";
  }
};
export const fallbackMessage = (reason: FallbackReason) => `${fallbackText(reason)} Showing the native scan result instead.`;

/* ---- Small helpers ---- */

const cut = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");
const clamp = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0);

/** Checks a parsed value against a spec's output schema, so a hostile reply cannot change the shape. */
export function conforms(schema: JsonSchema, value: unknown): boolean {
  if ("anyOf" in schema) return schema.anyOf.some((option) => conforms(option, value));
  switch (schema.type) {
    case "string": return typeof value === "string" && (!schema.enum || schema.enum.includes(value));
    case "integer": return typeof value === "number" && Number.isInteger(value);
    case "boolean": return typeof value === "boolean";
    case "null": return value === null;
    case "array": return Array.isArray(value) && value.every((item) => conforms(schema.items, item));
    case "object": {
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      const record = value as Record<string, unknown>;
      return schema.required.every((key) => key in record) && Object.keys(record).every((key) => key in schema.properties) && Object.entries(schema.properties).every(([key, child]) => conforms(child, record[key]));
    }
  }
}

/** Brings a parsed reply closer to a schema without trusting it: whole-number strings and decimals become integers, and keys the schema does not name are dropped. */
function coerce(schema: JsonSchema, value: unknown): unknown {
  if ("anyOf" in schema) {
    for (const option of schema.anyOf) { const next = coerce(option, value); if (conforms(option, next)) return next; }
    return value;
  }
  switch (schema.type) {
    case "integer":
      if (typeof value === "string" && /^-?\d+(\.0+)?$/.test(value.trim())) return Number(value);
      return typeof value === "number" && Number.isFinite(value) && !Number.isInteger(value) ? Math.round(value) : value;
    case "array": return Array.isArray(value) ? value.map((item) => coerce(schema.items, item)) : value;
    case "object": {
      if (!value || typeof value !== "object" || Array.isArray(value)) return value;
      const record = value as Record<string, unknown>;
      return Object.fromEntries(Object.entries(schema.properties).filter(([key]) => key in record).map(([key, child]) => [key, coerce(child, record[key])]));
    }
    default: return value;
  }
}

/**
 * Reads a model's final text as the agent's JSON. Models that are not Claude often wrap the object in a code fence or a sentence, send a number as a string or add a key, so this
 * tries the whole text, a fenced block and the outermost braces, tidies the value (coerce) and returns it only when it conforms to the schema. Undefined means no attempt fit.
 */
export function parseAgentJson(text: string, schema: JsonSchema): unknown {
  const attempts = [text.trim()];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) attempts.push(fenced[1].trim());
  const first = text.indexOf("{"), last = text.lastIndexOf("}");
  if (first >= 0 && last > first) attempts.push(text.slice(first, last + 1));
  for (const attempt of attempts) {
    try { const value = coerce(schema, JSON.parse(attempt)); if (conforms(schema, value)) return value; } catch { /* try the next reading */ }
  }
  return undefined;
}

async function readLinkedinPosting(url: string, fetchImpl: typeof fetch): Promise<{ title: string; company: string; location: string; description: string } | null> {
  const id = extractLinkedinJobId(url);
  if (!id) return null;
  try {
    // Public guest page only: no cookies, no login, URL rebuilt from the numeric id.
    const response = await fetchImpl(guestPostingUrl(id), { redirect: "manual", signal: AbortSignal.timeout(6000), credentials: "omit", cache: "no-store", headers: { "Accept-Language": "en" } });
    if (response.status !== 200) return null;
    const html = (await response.text()).slice(0, 500_000);
    if (/authwall|login-wall|checkpoint|join\s+linkedin|sign\s+in\s+to\s+linkedin/i.test(html.slice(0, 100_000))) return null;
    const job = htmlToJobText(html);
    return job.description.length >= 50 ? { ...job, description: job.description.slice(0, 6000) } : null;
  } catch {
    return null;
  }
}

/* ---- One agent: the tool loop ---- */

type AgentContext = {
  client: LiveClient;
  env: Record<string, string | undefined>;
  deadline: number;
  signal?: AbortSignal;
  tools: Partial<Record<ToolName, (input: unknown) => Promise<ToolResult> | ToolResult>>;
  /** The visitor's chosen model for every agent, or undefined for each spec's own. */
  model?: string;
  /** The visitor's choice for single agents. */
  agentModels?: AgentModels;
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number };
  /** How often a waiting model call reports progress, in ms. Tests pass a large number to keep their event lists short. */
  heartbeatMs?: number;
};

/**
 * Awaits `work` and yields a tick event every `ms` while it is pending, so a long model call is never silent on the card.
 * A rejection is rethrown after the loop; nothing is swallowed.
 */
async function* beat<T>(work: Promise<T>, ms: number, tick: (elapsedMs: number) => EngineEvent): AsyncGenerator<EngineEvent, T> {
  const settled = work.then((value) => ({ value }), (error: unknown) => ({ error }));
  const startedAt = Date.now();
  for (;;) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const outcome = await Promise.race([settled, new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ms); })]);
    clearTimeout(timer);
    if (outcome) {
      if ("error" in outcome) throw outcome.error;
      return outcome.value;
    }
    yield tick(Date.now() - startedAt);
  }
}

async function callOnce(ctx: AgentContext, request: LiveRequest, budgetMs: number): Promise<LiveResponse> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onOuterAbort = () => controller.abort();
  ctx.signal?.addEventListener("abort", onOuterAbort);
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new LiveFallback("timeout")); }, Math.max(1, budgetMs)); });
  try {
    return await Promise.race([ctx.client.create(request, controller.signal), timeout]);
  } catch (error) {
    // Only the reason is kept: an SDK error can carry request details.
    throw error instanceof LiveFallback ? error : new LiveFallback("api-error");
  } finally {
    clearTimeout(timer);
    ctx.signal?.removeEventListener("abort", onOuterAbort);
  }
}

/** What a tool call looks like on the card. Counts, hosts and short search phrases only: never résumé text, and a résumé search shows no query at all. */
function activityDetail(tool: ToolName, input: unknown, result: ToolResult | null, tally: { checked: number; literal: number }): string | undefined {
  const value = (input ?? {}) as { query?: unknown; url?: unknown };
  if (!result) {
    if (tool === "firecrawl_search") { const q = cut(value.query, 200); return q ? `"${q.slice(0, 48)}${q.length > 48 ? "…" : ""}"` : undefined; }
    if (tool === "firecrawl_scrape") { try { return new URL(String(value.url)).hostname.slice(0, 80); } catch { return undefined; } }
    return tool === "read_linkedin_posting" ? "Public posting page" : tool === "check_quote" ? "One quote against your text" : undefined;
  }
  if (!result.ok) return "No result";
  const data = result.data as { results?: unknown[]; passages?: unknown[] } | null;
  switch (tool) {
    case "firecrawl_search": return `${data?.results?.length ?? 0} results`;
    case "firecrawl_scrape": return "Page read";
    case "read_linkedin_posting": return "Posting read";
    case "search_resume_passages": return `${data?.passages?.length ?? 0} passages found`;
    case "check_quote": return `${tally.literal} of ${tally.checked} quotes found so far`;
  }
}

const isWebTool = (name: ToolName) => name.startsWith("firecrawl_");
const NO_WEB_NOTE = "\n\nWeb search is switched off for this run, so you have no web tools. Do not try to search. Leave any field that needs web results empty or null.";

async function* runAgent<Input, Output extends BaseOutput>(spec: AgentSpec<Input, Output>, input: Input, ctx: AgentContext): AsyncGenerator<EngineEvent, Output> {
  const startedAt = Date.now();
  const agentDeadline = Math.min(startedAt + spec.limits.timeoutMs, ctx.deadline);
  // Only tools the runner can really run are offered. With no Firecrawl key the web tools are left out and the agent is told so.
  const offered = spec.tools.filter((name) => ctx.tools[name]);
  const webOff = spec.tools.some(isWebTool) && !offered.some(isWebTool);
  const messages: LiveMessage[] = [{ role: "user", content: spec.buildUserMessage(input) + (webOff ? NO_WEB_NOTE : "") }];
  const used: Partial<Record<ToolName, number>> = {};
  let totalCalls = 0;
  const tally = { checked: 0, literal: 0 };
  let repaired = false; // a reply that does not fit the shape gets one more turn, asking for the JSON again

  for (let turn = 0; turn < spec.limits.maxTurns + (repaired ? 1 : 0); turn++) {
    if (ctx.signal?.aborted) throw new LiveFallback("api-error");
    const remaining = agentDeadline - Date.now();
    if (remaining <= 0) throw new LiveFallback("timeout");
    const lastTurn = turn === spec.limits.maxTurns - 1 + (repaired ? 1 : 0) || totalCalls >= spec.limits.maxToolCalls;
    // The wait for the model is a lane of its own: it starts, ticks about once a second and ends with the seconds it took.
    const modelLane = { type: "activity" as const, agent: spec.name, lane: "model", label: turn === 0 ? "Reading the material" : "Thinking it over", ...live };
    const turnStart = Date.now();
    yield { ...modelLane, status: "start", progress: 0 };
    const response = yield* beat(callOnce(ctx, {
      model: ctx.agentModels?.[spec.name as AgentName] ?? ctx.model ?? resolveModel(spec, ctx.env),
      max_tokens: spec.limits.maxOutputTokens,
      system: spec.system,
      messages,
      // An agent with no tools (the Recruiter) sends none, so the API never sees an empty list.
      ...(offered.length ? { tools: offered.map((name) => ({ name, description: TOOL_DEFINITIONS[name].description, input_schema: TOOL_DEFINITIONS[name].input_schema })) } : {}),
      ...(lastTurn && offered.length ? { tool_choice: { type: "none" as const } } : {}),
      output_config: { format: { type: "json_schema", schema: spec.outputSchema } },
      cache: offered.length > 0,
    }, remaining), ctx.heartbeatMs ?? 1000, (elapsed) => ({ ...modelLane, status: "progress", progress: Math.round(95 * (1 - Math.exp(-elapsed / 12_000))) }));
    yield { ...modelLane, status: "done", progress: 100, detail: `${Math.max(1, Math.round((Date.now() - turnStart) / 1000))}s` };
    // inputTokens is the whole prompt (fresh, cached and newly cached), so the card shows what the model really read; the cache parts are kept for pricing.
    const read = response.usage?.cache_read_input_tokens ?? 0, wrote = response.usage?.cache_creation_input_tokens ?? 0;
    ctx.usage.inputTokens += (response.usage?.input_tokens ?? 0) + read + wrote;
    ctx.usage.outputTokens += response.usage?.output_tokens ?? 0;
    ctx.usage.cacheReadTokens += read;
    ctx.usage.cacheWriteTokens += wrote;

    if (response.stop_reason === "refusal") throw new LiveFallback("refusal");
    if (response.stop_reason === "max_tokens") throw new LiveFallback("limit");
    messages.push({ role: "assistant", content: response.content });
    if (response.stop_reason === "pause_turn") continue;

    const calls = response.content.filter((block) => block.type === "tool_use");
    if (calls.length) {
      const results: Block[] = [];
      for (const call of calls) {
        const name = call.name as ToolName;
        const granted = spec.tools.includes(name) && ctx.tools[name];
        const cap = spec.limits.perTool[name] ?? 0;
        let result: ToolResult;
        if (!granted) result = { ok: false, error: "That tool is not available to you." };
        else if (totalCalls >= spec.limits.maxToolCalls || (used[name] ?? 0) >= cap) result = { ok: false, error: "You have used your calls for that tool." };
        else {
          totalCalls += 1;
          used[name] = (used[name] ?? 0) + 1;
          const activity = { type: "activity" as const, agent: spec.name, lane: name, label: laneLabel(spec.name, name), ...live };
          yield { ...activity, status: "start", progress: 0, detail: activityDetail(name, call.input, null, tally) };
          try { result = await ctx.tools[name]!(call.input); } catch { result = { ok: false, error: "The tool failed." }; }
          if (name === "check_quote" && result.ok) { tally.checked += 1; if ((result.data as { literal?: boolean }).literal) tally.literal += 1; }
          yield { ...activity, status: "done", progress: 100, detail: activityDetail(name, call.input, result, tally) };
        }
        results.push({ type: "tool_result", tool_use_id: call.id, content: untrusted(String(call.name), JSON.stringify(result.ok ? result.data : { error: result.error })), ...(result.ok ? {} : { is_error: true }) });
      }
      messages.push({ role: "user", content: results });
      continue;
    }

    const textOut = response.content.filter((block) => block.type === "text").map((block) => block.text ?? "").join("");
    const parsed = parseAgentJson(textOut, spec.outputSchema);
    if (parsed === undefined) {
      if (repaired) throw new LiveFallback("bad-output");
      repaired = true;
      messages.push({ role: "user", content: "Your last answer was not the JSON object the format needs. Reply again with only that JSON object, with every required field and no other text." });
      continue;
    }
    const output = parsed as Output;
    if (output.status !== "ok") throw new LiveFallback("refusal");
    return output;
  }
  throw new LiveFallback("limit");
}

/* ---- Local résumé tools ---- */

type ResumeChunk = Chunk & { resume: string };

function searchPassages(chunks: ResumeChunk[], query: unknown): ToolResult {
  const words = cut(query, 120).toLowerCase().split(/[^a-z0-9+#.]+/).filter((word) => word.length > 1);
  if (!words.length) return { ok: false, error: "Use a few words for one skill." };
  const ranked = chunks
    .map((chunk) => ({ chunk, score: words.filter((word) => chunk.text.toLowerCase().includes(word)).length }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  return { ok: true, data: { passages: ranked.map(({ chunk }) => ({ passageId: chunk.id, resume: chunk.resume, text: chunk.text })) } };
}

/**
 * The passages most likely to matter for each skill, picked here so the Finder can usually answer in one turn instead of searching skill by skill.
 * Up to three per skill, no passage twice, at most 14 in all, each cut to 420 characters. The quote check still runs against every chunk of the résumé.
 */
export function prePassages(chunks: ResumeChunk[], skills: { name: string }[], perSkill = 3, max = 14): { passageId: string; text: string }[] {
  const picked = new Map<string, string>();
  for (const skill of skills) {
    const found = searchPassages(chunks, skill.name);
    if (!found.ok) continue;
    for (const passage of (found.data as { passages: { passageId: string; text: string }[] }).passages.slice(0, perSkill)) {
      if (picked.size >= max) return [...picked].map(([passageId, text]) => ({ passageId, text }));
      if (!picked.has(passage.passageId)) picked.set(passage.passageId, passage.text.slice(0, 420));
    }
  }
  return [...picked].map(([passageId, text]) => ({ passageId, text }));
}

/* ---- Company culture ---- */

/**
 * Checks what the Role Scout says about the employer. The company must be named in the role text, every source must be an https
 * link from the Scout's own search, and lengths and counts are capped. A built-in entry (checked list) wins over web values; the web
 * only adds reputation lines to it. Nothing credible means no company.
 */
export function checkCompany(raw: CompanyFinding | null, roleText: string, seen: Set<string>, about?: string): CompanyCulture | undefined {
  const name = cut(raw?.name, 60);
  const token = name.match(/[\p{L}\p{N}]{3,}/u)?.[0];
  const named = Boolean(token && hasTerm(roleText, token));
  const builtIn = detectCompany(roleText) ?? (named ? detectCompany(`About ${name}`) : undefined);

  const urls = new Set<string>();
  const sources = (raw?.sources ?? []).flatMap((source) => {
    const url = safeJobUrl(source.url);
    if (!url || !seen.has(url) || urls.has(url)) return [];
    urls.add(url);
    return [{ label: cut(source.label, 80) || url, url }];
  }).slice(0, 6);
  // Reputation must cite a source, so with none it is dropped.
  const reputation = sources.length ? (raw?.reputation ?? []).map((line) => cut(line, 160)).filter(Boolean).slice(0, 3) : [];

  if (builtIn) {
    // Web lines are added only when the Scout's company is the same one.
    if (!reputation.length || detectCompany(`About ${name}`)?.name !== builtIn.name) return builtIn;
    const merged = [...builtIn.sources, ...sources.filter((source) => !builtIn.sources.some((own) => own.url === source.url))].slice(0, 6);
    return { ...builtIn, reputation, sources: merged, note: `${builtIn.note} Reputation lines were found on the web this run; check the sources.` };
  }
  if (!raw || !named || !sources.length) return undefined;
  const seenValues = new Set<string>();
  const values = raw.values.flatMap((item) => {
    const valueName = cut(item.name, 80);
    const meaning = cut(item.meaning, 160).split(" ").slice(0, 14).join(" ");
    if (!valueName || !meaning || seenValues.has(valueName.toLowerCase())) return [];
    seenValues.add(valueName.toLowerCase());
    return [{ name: valueName, meaning }];
  }).slice(0, 16);
  const expectations = raw.expectations.map((line) => cut(line, 120)).filter(Boolean).slice(0, 4);
  // Found the company and its pages but no stated values: show what the runner found (what it does, who says what), not nothing.
  if (!values.length && !expectations.length && !about && !reputation.length) return undefined;
  return { name, ...(about ? { about } : {}), values, expectations, ...(reputation.length ? { reputation } : {}), showIt: showItTips(values), sources, origin: "web", note: "Found on the web this run; check the sources." };
}

/* ---- The pipeline ---- */

const live = { simulated: false as const, mode: "live" as const };
const READERS = ["Role Scout", "Experience Finder", "Recruiter", "Action Planner"] as const satisfies readonly ReaderName[];

export async function* runLiveAgents(resumes: Resume[], job: string, deps: LiveDeps): AsyncGenerator<EngineEvent> {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  const deadline = Date.now() + (deps.deadlineMs ?? 84_000);
  // What the results say about this run: the model the visitor picked (or "recommended mix", never a model name we chose), whether it is Claude, and whether web search was on.
  // With a pick for single agents the run can use several models, so the label names each distinct one.
  const modelFor = (spec: (typeof AGENT_SPECS)[number]) => deps.agentModels?.[spec.name as AgentName] ?? deps.model ?? resolveModel(spec, env);
  const used = AGENT_SPECS.map(modelFor);
  const claude = used.every(isClaudeModel);
  const labels = [...new Set(used.map(modelLabel))];
  const modelName = !deps.model && !deps.agentModels ? RECOMMENDED_MIX : labels.length === 1 ? labels[0] : labels.length <= 3 ? labels.join(" and ") : "mixed models";
  const web = Boolean(deps.firecrawlKey || deps.edge);
  // Counts only, one row per finished agent; sent to the edge log when the run ends, even when it falls back.
  const usageRows: UsageLogRow[] = [];

  try {
    yield { type: "start", mode: "live", runId: deps.runId ?? "run", simulated: false, model: modelName, claude, web };
    yield { type: "orchestrator", message: `Four agents will read the masked material in turn. Every quote is checked against your text.${web ? "" : " Web search is off for this run."}`, ...live };

    // Only masked text ever reaches the model.
    const safety = runSafetyCheck(resumes, job);
    yield { type: "safety", piiFound: safety.piiFound, injectionFlags: safety.injectionFlags, simulated: false };
    if (safety.injectionFlags.length > 0) {
      yield { type: "orchestrator", message: `Found ${safety.injectionFlags.length} possible hidden instruction(s) in the role text. The agents are told to treat it as data only.`, ...live };
    }

    const chunks: ResumeChunk[] = safety.maskedResumes.flatMap((resume, r) => chunkResume(resume.text).map((chunk) => ({ ...chunk, id: `r${r}-${chunk.id}`, resume: resume.name })));
    let postingText = "";
    let postingCache: Awaited<ReturnType<typeof readLinkedinPosting>> | undefined;
    const hasLinkedinLink = Boolean(deps.linkedinUrl && extractLinkedinJobId(deps.linkedinUrl));
    const roleSource = () => `${safety.maskedJob}\n${postingText}`;

    const quoteInRole = (quote: string) => verifyQuote(roleSource(), quote);
    const quoteInResume = (quote: string) => chunks.some((chunk) => verifyQuote(chunk.text, quote));

    const scoutWeb = createWebTools({ apiKey: deps.firecrawlKey, allowScrape: true, fetchImpl, edge: deps.edge });
    const plannerWeb = createWebTools({ apiKey: deps.firecrawlKey, allowScrape: false, fetchImpl, edge: deps.edge });
    const local = (extra: AgentContext["tools"]): AgentContext => ({ client: deps.client, env, deadline, signal: deps.signal, usage, tools: extra, model: deps.model, agentModels: deps.agentModels, heartbeatMs: deps.heartbeatMs });

    const scoutCtx = local({
      read_linkedin_posting: async () => {
        if (!hasLinkedinLink || !deps.linkedinUrl) return { ok: false, error: "No LinkedIn link was given." };
        postingCache ??= await readLinkedinPosting(deps.linkedinUrl, fetchImpl);
        if (!postingCache) return { ok: false, error: "LinkedIn did not share this posting." };
        postingText = postingCache.description;
        return { ok: true, data: postingCache };
      },
      // No Firecrawl key: these two are left out, so the Scout is never offered a web tool it can't use.
      ...(web ? {
        firecrawl_search: (input: unknown) => scoutWeb.search((input as { query?: unknown } | null)?.query),
        firecrawl_scrape: (input: unknown) => scoutWeb.scrape((input as { url?: unknown } | null)?.url),
      } : {}),
    });
    const finderCtx = local({ search_resume_passages: (input) => searchPassages(chunks, (input as { query?: unknown } | null)?.query) });
    const recruiterCtx = local({});

    // The handoff goes out before the agent runs, so its card turns active when the work starts. The stage follows when it is done.
    const started = Date.now();
    const webNow = () => ({ calls: scoutWeb.stats.calls + plannerWeb.stats.calls, credits: scoutWeb.stats.credits + plannerWeb.stats.credits, free: scoutWeb.stats.free + plannerWeb.stats.free });
    let mark = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, at: started, web: webNow() };
    function* handoff(index: number, from: ReaderName | "Orchestrator"): Generator<EngineEvent> {
      const reader = READERS[index];
      mark = { ...usage, at: Date.now(), web: webNow() };
      yield { type: "handoff", from, to: reader, message: `${from} hands the material to ${reader}.`, ...live };
    }
    const pace = deps.paceMs ?? 0;
    const pause = (ms: number) => (ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve());
    // The note types out a sentence at a time. Time and tokens are read first so this pacing is not counted as the agent's work.
    async function* present(index: number, note: string): AsyncGenerator<EngineEvent> {
      const reader = READERS[index];
      const spent = { inputTokens: usage.inputTokens - mark.inputTokens, outputTokens: usage.outputTokens - mark.outputTokens, cacheReadTokens: usage.cacheReadTokens - mark.cacheReadTokens, cacheWriteTokens: usage.cacheWriteTokens - mark.cacheWriteTokens, ms: Date.now() - mark.at, model: modelFor(AGENT_SPECS[index]), firecrawlCalls: webNow().calls - mark.web.calls, firecrawlCredits: webNow().credits - mark.web.credits, webFree: webNow().free - mark.web.free };
      usageRows.push({ agent: reader, model: spent.model, provider: deps.provider ?? "anthropic", inputTokens: spent.inputTokens, outputTokens: spent.outputTokens, ms: spent.ms, fallback: false });
      const pieces = (note.match(/[^.!?]+[.!?]*/g) ?? [note]).map((piece) => piece.trim()).filter(Boolean);
      for (const piece of pieces) { yield { type: "reasoning", agent: reader, text: piece, done: false, ...live }; await pause(pace); }
      yield { type: "reasoning", agent: reader, text: "", done: true, ...live };
      yield { type: "stage", index, agent: { role: reader, note }, usage: spent, ...live };
    }
    // What the runner itself checked, shown as short lanes on the card. Counts only, from numbers already in hand: no extra model call.
    async function* facts(index: number, lines: { lane: string; label: string; detail: string }[]): AsyncGenerator<EngineEvent> {
      for (const line of lines) {
        const base = { type: "activity" as const, agent: READERS[index], lane: line.lane, label: line.label, ...live };
        yield { ...base, status: "start", progress: 0 };
        await pause(pace);
        yield { ...base, status: "done", progress: 100, detail: line.detail };
      }
    }
    const tooManyBad = (checked: number, bad: number) => checked > 0 && bad * 2 > checked;

    /* 1. Role Scout */
    const [scoutSpec, finderSpec, recruiterSpec, plannerSpec] = AGENT_SPECS;
    yield* handoff(0, "Orchestrator");
    // The runner researches the employer itself, so the company part does not depend on a small model choosing to search.
    let intel: CompanyIntel | undefined;
    const employer = web ? (detectCompany(safety.maskedJob)?.name ?? guessCompanyName(safety.maskedJob)) : undefined;
    if (employer) {
      const lane = { type: "activity" as const, agent: READERS[0], lane: "firecrawl_search", label: laneLabel("Role Scout", "firecrawl_search"), ...live };
      yield { ...lane, status: "start", progress: 0, detail: employer.slice(0, 40) };
      intel = await gatherCompany(employer, scoutWeb).catch(() => undefined);
      yield { ...lane, status: "done", progress: 100, detail: intel ? `${intel.pages.length} page${intel.pages.length === 1 ? "" : "s"} read` : "No result" };
    }
    const rawScout = yield* runAgent(scoutSpec, { roleText: safety.maskedJob, hasLinkedinLink, ...(intel ? { companyWeb: intelData(intel) } : {}) }, scoutCtx);
    const seenSkills = new Set<string>();
    let roleQuotes = 0;
    let roleQuotesBad = 0;
    const scoutSkills = rawScout.skills.flatMap((item) => {
      const name = cut(item.name, 40);
      if (!name || seenSkills.has(name.toLowerCase())) return [];
      seenSkills.add(name.toLowerCase());
      const quote = cut(item.roleQuote, 400);
      const demand = clamp(item.demand);
      const why = cut(item.why, 200);
      if (quote) {
        roleQuotes += 1;
        if (!quoteInRole(quote)) {
          roleQuotesBad += 1;
          return [{ name, demand: 0, roleQuote: "", why: "The role quote could not be found in the role text, so this skill scores 0 for the role." }];
        }
      }
      return [{ name, demand, roleQuote: quote, why }];
    }).slice(0, 8);
    if (tooManyBad(roleQuotes, roleQuotesBad)) throw new LiveFallback("unverifiable");
    if (!scoutSkills.some((item) => item.demand > 0)) throw new LiveFallback("bad-output");
    const scout: RoleScoutOutput = {
      ...rawScout,
      note: cut(rawScout.note, 220),
      title: cut(rawScout.title, 80) || "Your target role",
      skills: scoutSkills,
    };
    // The Scout's company findings stay here: no other agent is given company text.
    const roleWords = [roleSource(), postingCache?.company ?? ""].join(" ");
    let company = checkCompany(rawScout.company, roleWords, scoutWeb.seen, intel?.about);
    // The model found nothing it could cite, but the runner did: show the company with what it found.
    if (!company && intel && (intel.about || intel.pages.length) && hasTerm(roleWords, intel.name.match(/[\p{L}\p{N}]{3,}/u)?.[0] ?? "")) {
      company = { name: intel.name, ...(intel.about ? { about: intel.about } : {}), values: [], expectations: [], showIt: ["Read the company's own about page and echo its words in your summary line.", "Pick one thing the company does and say how your project relates to it."], sources: intel.sources.slice(0, 6), origin: "web", note: "Found on the web this run, without a published list of values. Check the sources." };
    }
    if (company?.origin === "web" && !company.about && intel?.about) company = { ...company, about: intel.about };
    yield* present(0, scout.note);
    yield* facts(0, [
      ...(roleQuotes ? [{ lane: "verify", label: "Role quotes", detail: `${roleQuotes - roleQuotesBad} of ${roleQuotes} found word for word` }] : []),
      { lane: "skills", label: "Skills found", detail: `${scout.skills.length} skills, ${scout.skills.filter((skill) => skill.demand >= 70).length} the role clearly asks for` },
      ...(company ? [{ lane: "company", label: "Company", detail: company.name }] : []),
    ]);

    /* 2. Experience Finder */
    yield* handoff(1, "Role Scout");
    const rawFinder = yield* runAgent(finderSpec, { roleTitle: scout.title, skills: scout.skills.map(({ name, demand, roleQuote }) => ({ name, demand, roleQuote })), scoutNote: scout.note, passages: prePassages(chunks, scout.skills) }, finderCtx);
    let resumeQuotes = 0;
    let resumeQuotesBad = 0;
    const failedQuote = new Set<string>();
    const finderEvidence = scout.skills.map((skill) => {
      const found = rawFinder.evidence.find((item) => cut(item.skill, 40).toLowerCase() === skill.name.toLowerCase());
      const quote = cut(found?.resumeQuote, 400);
      let evidence = clamp(found?.evidence);
      let resumeQuote = quote;
      if (quote) {
        resumeQuotes += 1;
        if (!quoteInResume(quote)) { resumeQuotesBad += 1; failedQuote.add(skill.name); evidence = 0; resumeQuote = ""; }
      } else evidence = 0;
      return { skill: skill.name, evidence, resumeQuote, passageId: "", detail: failedQuote.has(skill.name) ? "The résumé quote could not be found in your text, so this scores 0." : cut(found?.detail, 240) || "No matching résumé passage was found." };
    });
    if (tooManyBad(resumeQuotes, resumeQuotesBad)) throw new LiveFallback("unverifiable");
    // Weak proof: only known skills and fixed kinds; a skill with no proof at all is always flagged.
    const weakProofs: WeakProof[] = scout.skills.flatMap((skill, i) => {
      if (skill.demand === 0) return [];
      const flagged = rawFinder.weakProofs.find((item) => cut(item.skill, 40).toLowerCase() === skill.name.toLowerCase());
      const own = finderEvidence[i];
      if (own.evidence === 0) return [{ skill: skill.name, kind: "no proof found" as const, why: failedQuote.has(skill.name) ? own.detail : cut(flagged?.why, 240) || own.detail }];
      return flagged ? [{ skill: skill.name, kind: flagged.kind, why: cut(flagged.why, 240) }] : [];
    });
    const finder: ExperienceFinderOutput = { ...rawFinder, note: cut(rawFinder.note, 220), evidence: finderEvidence, weakProofs, but: cut(rawFinder.but, 300) };
    if (!finder.but) throw new LiveFallback("bad-output");
    yield* present(1, finder.note);
    yield* facts(1, [
      { lane: "verify", label: "Résumé quotes", detail: resumeQuotes ? `${resumeQuotes - resumeQuotesBad} of ${resumeQuotes} found word for word` : "none to check" },
      { lane: "weak", label: "Weak proof", detail: `${weakProofs.length} skill${weakProofs.length === 1 ? "" : "s"} flagged` },
    ]);

    /* 3. Recruiter: a cold read of the whole masked résumé. It gets the role's skill names and no Finder output. The runner checks the report. */
    const resumeText = safety.maskedResumes.map((resume) => resume.text).join("\n\n");
    const roleSkillNames = scout.skills.filter((skill) => skill.demand > 0).map((skill) => skill.name);
    // A Recruiter that fails (not a refusal) does not cost the run: the native ATS-style check stands in for it, and its note says so.
    yield* handoff(2, "Experience Finder");
    let rawRecruiter: RecruiterOutput | undefined;
    try { rawRecruiter = yield* runAgent(recruiterSpec, { skillNames: roleSkillNames, resumeText }, recruiterCtx); } catch (error) { if (!(error instanceof LiveFallback) || error.reason === "refusal") throw error; }
    const seenChecks = new Set<string>();
    const checks: AtsCheck[] = (rawRecruiter?.checks ?? []).flatMap((item) => {
      const info = atsCheckInfo(item.id);
      if (!info || seenChecks.has(info.id) || !(["pass", "warn", "fail"] as const).includes(item.status)) return [];
      seenChecks.add(info.id);
      return [{ id: info.id, group: info.group, label: cut(item.label, 60) || info.label, status: item.status, tip: cut(item.tip, 240) }];
    }).slice(0, 12);
    let recruiter: RecruiterOutput;
    if (rawRecruiter && checks.length) {
      // Keyword lists come from the text itself, not from the model.
      const coverage = keywordCoverage(resumeText, roleSkillNames);
      const fixes = rawRecruiter.fixes.map((fix) => cut(fix, 240)).filter(Boolean).slice(0, 3);
      recruiter = { ...rawRecruiter, note: cut(rawRecruiter.note, 220), score: atsScore(checks), checks, keywordsFound: coverage.found, keywordsMissing: coverage.missing, fixes: fixes.length ? fixes : topFixes(checks) };
    } else {
      const native = atsCheck(resumeText, roleSkillNames);
      recruiter = { status: "ok", refusalReason: "", note: "The model's check did not come through, so this is the native ATS-style check, a rule of thumb with no model call.", score: native.score, checks: native.checks, keywordsFound: native.keywordsFound, keywordsMissing: native.keywordsMissing, fixes: native.fixes };
    }
    yield* present(2, recruiter.note);
    yield* facts(2, [
      { lane: "ats", label: "ATS checks", detail: `${recruiter.checks.filter((check) => check.status === "pass").length} pass, ${recruiter.checks.filter((check) => check.status === "warn").length} warn, ${recruiter.checks.filter((check) => check.status === "fail").length} fail` },
      { lane: "keywords", label: "Keywords", detail: `${recruiter.keywordsFound.length} of ${recruiter.keywordsFound.length + recruiter.keywordsMissing.length} in your résumé` },
    ]);

    /* 4. Action Planner: numbers and fixed labels only, no résumé text */
    const gaps: PlannerGap[] = scout.skills.map((skill, i) => {
      const evidence = finderEvidence[i].evidence;
      const reason: PlannerGap["reason"] = failedQuote.has(skill.name) ? "quote did not check out" : evidence === 0 ? "no proof found" : "named but not shown in work";
      return { skill: skill.name, demand: skill.demand, evidence, reason };
    }).filter((gap) => gap.demand > 0).sort((a, b) => b.demand * (100 - b.evidence) - a.demand * (100 - a.evidence)).slice(0, 6);
    yield* handoff(3, "Recruiter");
    // Skills with a checked playbook already get checked lesson links from the runner, so the Planner only searches when a gap has none.
    const plannerSearches = web && gaps.some((gap) => !playbookFor(gap.skill));
    const plannerCtx = local(plannerSearches ? { firecrawl_search: (input) => plannerWeb.search((input as { query?: unknown } | null)?.query) } : {});
    const rawPlanner = yield* runAgent(plannerSpec, { roleTitle: scout.title, gaps }, plannerCtx);
    const quests = rawPlanner.quests.slice(0, 6).map((quest) => {
      const url = safeJobUrl(quest.link?.url);
      return {
        title: cut(quest.title, 80), task: cut(quest.task, 300), proof: cut(quest.proof, 160), skill: cut(quest.skill, 40),
        // A link must be https and come from this agent's own search.
        link: quest.link && url && plannerWeb.seen.has(url) ? { title: cut(quest.link.title, 200) || url, url } : null,
      };
    }).filter((quest) => quest.title && quest.task);
    if (!quests.length) throw new LiveFallback("bad-output");
    const planner: ActionPlannerOutput = { ...rawPlanner, note: cut(rawPlanner.note, 220), verdict: cut(rawPlanner.verdict, 240), quests };
    if (!planner.verdict) throw new LiveFallback("bad-output");
    yield* present(3, planner.note);
    yield* facts(3, [
      ...(gaps[0] ? [{ lane: "gap", label: "Biggest gap", detail: gaps[0].skill }] : []),
      { lane: "tips", label: "Tips", detail: `${quests.length} tip${quests.length === 1 ? "" : "s"}, ${quests.filter((quest) => quest.link).length} with a link` },
    ]);
    yield { type: "handoff", from: "Action Planner", to: "Orchestrator", message: "Action Planner returns the findings to the table for the final verdict.", ...live };

    /* Assemble */
    const final = scout.skills.map((skill, i) => ({ name: skill.name, demand: skill.demand, evidence: finderEvidence[i].evidence }));
    const match = computeMatch(final);
    const analysis: Analysis = analysisShapeFromOutputs(scout, finder, recruiter, planner, { matchPercent: match.percent, matchFormula: match.formula, confidence: `API boost agents · every quote checked against your text` });
    analysis.skills = analysis.skills.map((skill, i) => ({ ...skill, source: "API boost agents", evidence: final[i].evidence, scoreReason: scout.skills[i].demand === 0 ? scout.skills[i].why || "The role does not ask for this skill." : weakProofs.find((item) => item.skill === skill.name)?.why || skill.scoreReason }));
    if (company) analysis.company = company;
    // The same rule-based quick read as the native scan, over the live skills and checks, so the Recruiter always has concrete things to fix.
    if (analysis.ats) analysis.review = recruiterReview({ resumeText, roleTitle: scout.title, skills: analysis.skills, ats: analysis.ats, bulletFor: (name) => questFor(name, "show")?.bullet });
    analysis.run = { model: modelName, claude, web };
    const seenLinks = new Set<string>();
    analysis.sources = analysis.sources.filter((source) => { const url = safeJobUrl(source.url); if (!url || seenLinks.has(url)) return false; seenLinks.add(url); return true; });

    const result: EngineResult = { analysis, usage: { ...usage, ms: Date.now() - started }, safety: { piiFound: safety.piiFound, injectionFlags: safety.injectionFlags } };
    deps.track?.(logUsage(deps.edge, deps.runId ?? "run", usageRows));
    yield { type: "complete", result, ...live };
  } catch (error) {
    if (deps.signal?.aborted) return;
    const reason: FallbackReason = error instanceof LiveFallback ? error.reason : "api-error";
    deps.track?.(logUsage(deps.edge, deps.runId ?? "run", usageRows.length ? usageRows.map((row) => ({ ...row, fallback: true })) : [{ agent: "run", provider: deps.provider ?? "anthropic", inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, ms: 0, fallback: true }]));
    yield { type: "notice", kind: "fallback", message: fallbackMessage(reason), simulated: false, mode: "live" };
    // The rules engine masks and runs on the original input; its events say simulated: true.
    for await (const event of runSimulatedEngine(resumes, job)) {
      if (deps.signal?.aborted) return;
      yield { ...event, ...(event.type === "error" || event.type === "safety" ? {} : { mode: "rules" as const }) } as EngineEvent;
    }
  }
}

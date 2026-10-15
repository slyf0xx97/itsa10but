import type { Analysis, AtsCheck, CompanyCulture, Resume } from "./analysis-types.ts";
import { atsCheckInfo, atsScore, keywordCoverage, topFixes } from "./ats-check.ts";
import { AGENT_SPECS, analysisShapeFromOutputs } from "./agents/index.ts";
import type { ActionPlannerOutput, PlannerGap } from "./agents/action-planner.ts";
import type { ExperienceFinderOutput, WeakProof } from "./agents/experience-finder.ts";
import type { RecruiterOutput } from "./agents/recruiter.ts";
import type { CompanyFinding, RoleScoutOutput } from "./agents/role-scout.ts";
import { resolveModel, TOOL_DEFINITIONS, untrusted, type AgentSpec, type BaseOutput, type JsonSchema, type ToolName } from "./agents/shared.ts";
import { createWebTools, type ToolResult } from "./firecrawl-tools.ts";
import { RECOMMENDED_MIX, isClaudeModel, modelLabel } from "./model-choice.ts";
import { safeJobUrl } from "./job-types.ts";
import { extractLinkedinJobId, guestPostingUrl, htmlToJobText } from "./linkedin-url.ts";
import { detectCompany, showItTips } from "./company-culture.ts";
import { hasTerm } from "./preview-analysis.ts";
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
};
export type LiveResponse = { stop_reason: string | null; content: Block[]; usage?: { input_tokens?: number; output_tokens?: number } };
export type LiveClient = { create(request: LiveRequest, signal?: AbortSignal): Promise<LiveResponse> };

export type LiveDeps = {
  client: LiveClient;
  /** Without a Firecrawl key the web tools are not offered to the agents at all, and the start event says web search is off. */
  firecrawlKey?: string;
  /** A model the visitor chose for all four agents. Already validated by checkModelChoice. Leave out for each spec's own model. */
  model?: string;
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
  usage: { inputTokens: number; outputTokens: number };
};

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

  for (let turn = 0; turn < spec.limits.maxTurns; turn++) {
    if (ctx.signal?.aborted) throw new LiveFallback("api-error");
    const remaining = agentDeadline - Date.now();
    if (remaining <= 0) throw new LiveFallback("timeout");
    const lastTurn = turn === spec.limits.maxTurns - 1 || totalCalls >= spec.limits.maxToolCalls;
    const response = await callOnce(ctx, {
      model: ctx.model ?? resolveModel(spec, ctx.env),
      max_tokens: spec.limits.maxOutputTokens,
      system: spec.system,
      messages,
      // An agent with no tools (the Recruiter) sends none, so the API never sees an empty list.
      ...(offered.length ? { tools: offered.map((name) => ({ name, description: TOOL_DEFINITIONS[name].description, input_schema: TOOL_DEFINITIONS[name].input_schema })) } : {}),
      ...(lastTurn && offered.length ? { tool_choice: { type: "none" as const } } : {}),
      output_config: { format: { type: "json_schema", schema: spec.outputSchema } },
    }, remaining);
    ctx.usage.inputTokens += response.usage?.input_tokens ?? 0;
    ctx.usage.outputTokens += response.usage?.output_tokens ?? 0;

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
    let parsed: unknown;
    try { parsed = JSON.parse(textOut); } catch { throw new LiveFallback("bad-output"); }
    if (!conforms(spec.outputSchema, parsed)) throw new LiveFallback("bad-output");
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

/* ---- Company culture ---- */

/**
 * Checks what the Role Scout says about the employer. The company must be named in the role text, every source must be an https
 * link from the Scout's own search, and lengths and counts are capped. A built-in entry (checked list) wins over web values; the web
 * only adds reputation lines to it. Nothing credible means no company.
 */
export function checkCompany(raw: CompanyFinding | null, roleText: string, seen: Set<string>): CompanyCulture | undefined {
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
  if (!values.length && !expectations.length) return undefined;
  return { name, values, expectations, ...(reputation.length ? { reputation } : {}), showIt: showItTips(values), sources, origin: "web", note: "Found on the web this run; check the sources." };
}

/* ---- The pipeline ---- */

const live = { simulated: false as const, mode: "live" as const };
const READERS = ["Role Scout", "Experience Finder", "Recruiter", "Action Planner"] as const satisfies readonly ReaderName[];

export async function* runLiveAgents(resumes: Resume[], job: string, deps: LiveDeps): AsyncGenerator<EngineEvent> {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const usage = { inputTokens: 0, outputTokens: 0 };
  const deadline = Date.now() + (deps.deadlineMs ?? 84_000);
  // What the results say about this run: the model the visitor picked (or "recommended mix", never a model name we chose), whether it is Claude, and whether web search was on.
  const claude = deps.model ? isClaudeModel(deps.model) : true;
  const modelName = deps.model ? modelLabel(deps.model) : RECOMMENDED_MIX;
  const web = Boolean(deps.firecrawlKey);

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

    const scoutWeb = createWebTools({ apiKey: deps.firecrawlKey, allowScrape: true, fetchImpl });
    const plannerWeb = createWebTools({ apiKey: deps.firecrawlKey, allowScrape: false, fetchImpl });
    const local = (extra: AgentContext["tools"]): AgentContext => ({ client: deps.client, env, deadline, signal: deps.signal, usage, tools: extra, model: deps.model });

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
    const plannerCtx = local(web ? { firecrawl_search: (input) => plannerWeb.search((input as { query?: unknown } | null)?.query) } : {});

    // The agent's card: one handoff, its note, then the stage that fills the roster.
    async function* present(index: number, from: ReaderName | "Orchestrator", note: string): AsyncGenerator<EngineEvent> {
      const reader = READERS[index];
      yield { type: "handoff", from, to: reader, message: `${from} hands the material to ${reader}.`, ...live };
      if (note) yield { type: "reasoning", agent: reader, text: note, done: false, ...live };
      yield { type: "reasoning", agent: reader, text: "", done: true, ...live };
      yield { type: "stage", index, agent: { role: reader, note }, ...live };
    }
    const tooManyBad = (checked: number, bad: number) => checked > 0 && bad * 2 > checked;

    /* 1. Role Scout */
    const [scoutSpec, finderSpec, recruiterSpec, plannerSpec] = AGENT_SPECS;
    const rawScout = yield* runAgent(scoutSpec, { roleText: safety.maskedJob, hasLinkedinLink }, scoutCtx);
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
    const marketUrl = safeJobUrl(rawScout.marketNote?.sourceUrl);
    const scout: RoleScoutOutput = {
      ...rawScout,
      note: cut(rawScout.note, 500),
      title: cut(rawScout.title, 80) || "Your target role",
      skills: scoutSkills,
      // A market note must cite a page this agent's own search returned.
      marketNote: rawScout.marketNote && marketUrl && scoutWeb.seen.has(marketUrl) ? { text: cut(rawScout.marketNote.text, 400), sourceTitle: cut(rawScout.marketNote.sourceTitle, 200) || marketUrl, sourceUrl: marketUrl } : null,
    };
    // The Scout's company findings stay here: no other agent is given company text.
    const company = checkCompany(rawScout.company, [roleSource(), postingCache?.company ?? ""].join(" "), scoutWeb.seen);
    yield* present(0, "Orchestrator", scout.note);

    /* 2. Experience Finder */
    const rawFinder = yield* runAgent(finderSpec, { roleTitle: scout.title, skills: scout.skills.map(({ name, demand, roleQuote }) => ({ name, demand, roleQuote })), scoutNote: scout.note }, finderCtx);
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
    const finder: ExperienceFinderOutput = { ...rawFinder, note: cut(rawFinder.note, 500), evidence: finderEvidence, weakProofs, but: cut(rawFinder.but, 300) };
    if (!finder.but) throw new LiveFallback("bad-output");
    yield* present(1, "Role Scout", finder.note);

    /* 3. Recruiter: a cold read of the whole masked résumé. It gets the role's skill names and no Finder output. The runner checks the report. */
    const resumeText = safety.maskedResumes.map((resume) => resume.text).join("\n\n");
    const rawRecruiter = yield* runAgent(recruiterSpec, { skillNames: scout.skills.filter((skill) => skill.demand > 0).map((skill) => skill.name), resumeText }, recruiterCtx);
    const seenChecks = new Set<string>();
    const checks: AtsCheck[] = rawRecruiter.checks.flatMap((item) => {
      const info = atsCheckInfo(item.id);
      if (!info || seenChecks.has(info.id) || !(["pass", "warn", "fail"] as const).includes(item.status)) return [];
      seenChecks.add(info.id);
      return [{ id: info.id, group: info.group, label: cut(item.label, 60) || info.label, status: item.status, tip: cut(item.tip, 240) }];
    }).slice(0, 12);
    if (!checks.length) throw new LiveFallback("bad-output");
    // Keyword lists come from the text itself, not from the model.
    const coverage = keywordCoverage(resumeText, scout.skills.filter((skill) => skill.demand > 0).map((skill) => skill.name));
    const fixes = rawRecruiter.fixes.map((fix) => cut(fix, 240)).filter(Boolean).slice(0, 3);
    const recruiter: RecruiterOutput = { ...rawRecruiter, note: cut(rawRecruiter.note, 500), score: atsScore(checks), checks, keywordsFound: coverage.found, keywordsMissing: coverage.missing, fixes: fixes.length ? fixes : topFixes(checks) };
    yield* present(2, "Experience Finder", recruiter.note);

    /* 4. Action Planner: numbers and fixed labels only, no résumé text */
    const gaps: PlannerGap[] = scout.skills.map((skill, i) => {
      const evidence = finderEvidence[i].evidence;
      const reason: PlannerGap["reason"] = failedQuote.has(skill.name) ? "quote did not check out" : evidence === 0 ? "no proof found" : "named but not shown in work";
      return { skill: skill.name, demand: skill.demand, evidence, reason };
    }).filter((gap) => gap.demand > 0).sort((a, b) => b.demand * (100 - b.evidence) - a.demand * (100 - a.evidence)).slice(0, 5);
    const rawPlanner = yield* runAgent(plannerSpec, { roleTitle: scout.title, gaps }, plannerCtx);
    const quests = rawPlanner.quests.slice(0, 3).map((quest) => {
      const url = safeJobUrl(quest.link?.url);
      return {
        title: cut(quest.title, 80), task: cut(quest.task, 300), proof: cut(quest.proof, 160), skill: cut(quest.skill, 40),
        // A link must be https and come from this agent's own search.
        link: quest.link && url && plannerWeb.seen.has(url) ? { title: cut(quest.link.title, 200) || url, url } : null,
      };
    }).filter((quest) => quest.title && quest.task);
    if (!quests.length) throw new LiveFallback("bad-output");
    const planner: ActionPlannerOutput = { ...rawPlanner, note: cut(rawPlanner.note, 500), verdict: cut(rawPlanner.verdict, 240), quests };
    if (!planner.verdict) throw new LiveFallback("bad-output");
    yield* present(3, "Recruiter", planner.note);
    yield { type: "handoff", from: "Action Planner", to: "Orchestrator", message: "Action Planner returns the findings to the table for the final verdict.", ...live };

    /* Assemble */
    const final = scout.skills.map((skill, i) => ({ name: skill.name, demand: skill.demand, evidence: finderEvidence[i].evidence }));
    const match = computeMatch(final);
    const analysis: Analysis = analysisShapeFromOutputs(scout, finder, recruiter, planner, { matchPercent: match.percent, matchFormula: match.formula, confidence: `API boost agents · every quote checked against your text` });
    analysis.skills = analysis.skills.map((skill, i) => ({ ...skill, source: "API boost agents", evidence: final[i].evidence, scoreReason: scout.skills[i].demand === 0 ? scout.skills[i].why : weakProofs.find((item) => item.skill === skill.name)?.why || skill.scoreReason }));
    if (company) analysis.company = company;
    analysis.run = { model: modelName, claude, web };
    const seenLinks = new Set<string>();
    analysis.sources = analysis.sources.filter((source) => { const url = safeJobUrl(source.url); if (!url || seenLinks.has(url)) return false; seenLinks.add(url); return true; });

    const result: EngineResult = { analysis, usage, safety: { piiFound: safety.piiFound, injectionFlags: safety.injectionFlags } };
    yield { type: "complete", result, ...live };
  } catch (error) {
    if (deps.signal?.aborted) return;
    const reason: FallbackReason = error instanceof LiveFallback ? error.reason : "api-error";
    yield { type: "notice", kind: "fallback", message: fallbackMessage(reason), simulated: false, mode: "live" };
    // The rules engine masks and runs on the original input; its events say simulated: true.
    for await (const event of runSimulatedEngine(resumes, job)) {
      if (deps.signal?.aborted) return;
      yield { ...event, ...(event.type === "error" || event.type === "safety" ? {} : { mode: "rules" as const }) } as EngineEvent;
    }
  }
}

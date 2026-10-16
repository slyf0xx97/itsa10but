import { laneLabel } from "./agent-abilities.ts";
import type { Resume } from "./analysis-types.ts";
import { runSimulatedEngine, type EngineEvent, type ReaderName } from "./simulated-engine.ts";

/**
 * A scripted API boost run for looking at the live screens on localhost without calling a model. The page loads it only in development
 * with ?demo=live. Cards, lanes, coins and the total are driven by the real event loop; the final analysis is the native scan's, labelled
 * as a demo so it can't be mistaken for a model result.
 */
const live = { simulated: false as const, mode: "live" as const };
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Step = { agent: ReaderName; model: string; inTok: number; outTok: number; ms: number; tools: { lane: string; start: string; done: string }[]; note: string; facts: { lane: string; label: string; detail: string }[] };
const STEPS: Step[] = [
  { agent: "Role Scout", model: "claude-haiku-5-5", inTok: 16_944, outTok: 2275, ms: 7000, tools: [{ lane: "firecrawl_search", start: "\"company values principles\"", done: "5 results" }, { lane: "firecrawl_scrape", start: "careers.example.com", done: "Page read" }],
    note: "The role is a junior data analyst. SQL and dashboards come up the most. The employer's own page stresses customers first.", facts: [{ lane: "verify", label: "Role quotes", detail: "6 of 6 found word for word" }, { lane: "skills", label: "Skills found", detail: "7 skills, 4 the role clearly asks for" }, { lane: "company", label: "Company", detail: "Example Co" }] },
  { agent: "Experience Finder", model: "claude-sonnet-5-5", inTok: 13_148, outTok: 1910, ms: 6000, tools: [{ lane: "search_resume_passages", start: "", done: "3 passages found" }, { lane: "search_resume_passages", start: "", done: "2 passages found" }],
    note: "Python and SQL are backed by real projects with numbers. Reporting is only named in the skills list.", facts: [{ lane: "verify", label: "Résumé quotes", detail: "5 of 5 found word for word" }, { lane: "weak", label: "Weak proof", detail: "2 skills flagged" }] },
  { agent: "Recruiter", model: "claude-sonnet-5-5", inTok: 2889, outTok: 936, ms: 4000, tools: [],
    note: "Hiring software can read the layout. Two role keywords are missing from the text.", facts: [{ lane: "ats", label: "ATS checks", detail: "8 pass, 2 warn, 1 fail" }, { lane: "keywords", label: "Keywords", detail: "5 of 7 in your résumé" }] },
  { agent: "Action Planner", model: "claude-sonnet-5-5", inTok: 8330, outTok: 1088, ms: 5000, tools: [{ lane: "firecrawl_search", start: "\"dashboard project ideas\"", done: "5 results" }],
    note: "One small dashboard project would close the biggest gap. Publish it and link it.", facts: [{ lane: "gap", label: "Biggest gap", detail: "Reporting" }, { lane: "tips", label: "Tips", detail: "3 tips, 2 with a link" }] },
];

export async function* demoLive(items: Resume[], job: string): AsyncGenerator<EngineEvent> {
  yield { type: "start", mode: "live", runId: "demo", simulated: false, model: "Demo (no model is called)", claude: true, web: true };
  yield { type: "orchestrator", message: "Demo run: scripted events, no model call.", ...live };
  let result: Extract<EngineEvent, { type: "complete" }>["result"] | undefined;
  for await (const event of runSimulatedEngine(items, job)) if (event.type === "complete") result = event.result;
  if (!result) return;

  let previous: ReaderName | "Orchestrator" = "Orchestrator";
  for (const [index, step] of STEPS.entries()) {
    yield { type: "handoff", from: previous, to: step.agent, message: `${previous} hands the material to ${step.agent}.`, ...live };
    const model = { type: "activity" as const, agent: step.agent, lane: "model", label: "Reading the material", ...live };
    yield { ...model, status: "start", progress: 0 };
    const half = step.ms / 2;
    for (let elapsed = 700; elapsed < half; elapsed += 700) { yield { ...model, status: "progress", progress: Math.round(95 * (1 - Math.exp(-elapsed / 4000))) }; await wait(700); }
    yield { ...model, status: "done", progress: 100, detail: `${Math.round(half / 1000)}s` };
    for (const tool of step.tools) {
      const lane = { type: "activity" as const, agent: step.agent, lane: tool.lane, label: laneLabel(step.agent, tool.lane), ...live };
      yield { ...lane, status: "start", progress: 0, ...(tool.start ? { detail: tool.start } : {}) };
      await wait(600);
      yield { ...lane, status: "done", progress: 100, detail: tool.done };
    }
    const second = { ...model, label: "Thinking it over" };
    yield { ...second, status: "start", progress: 0 };
    for (let elapsed = 700; elapsed < half; elapsed += 700) { yield { ...second, status: "progress", progress: Math.round(95 * (1 - Math.exp(-elapsed / 4000))) }; await wait(700); }
    yield { ...second, status: "done", progress: 100, detail: `${Math.round(half / 1000)}s` };
    for (const piece of step.note.match(/[^.!?]+[.!?]*/g) ?? [step.note]) { yield { type: "reasoning", agent: step.agent, text: piece.trim(), done: false, ...live }; await wait(220); }
    yield { type: "reasoning", agent: step.agent, text: "", done: true, ...live };
    yield { type: "stage", index, agent: { role: step.agent, note: step.note }, usage: { inputTokens: step.inTok, outputTokens: step.outTok, ms: step.ms, model: step.model, ...(step.agent === "Role Scout" ? { firecrawlCalls: 2, firecrawlCredits: 3, webFree: 1 } : step.agent === "Action Planner" ? { firecrawlCalls: 1, firecrawlCredits: 2 } : {}) }, ...live };
    for (const fact of step.facts) {
      const lane = { type: "activity" as const, agent: step.agent, lane: fact.lane, label: fact.label, ...live };
      yield { ...lane, status: "start", progress: 0 };
      await wait(220);
      yield { ...lane, status: "done", progress: 100, detail: fact.detail };
    }
    previous = step.agent;
  }
  yield { type: "handoff", from: "Action Planner", to: "Orchestrator", message: "Action Planner returns the findings to the table for the final verdict.", ...live };
  yield { type: "complete", result: { ...result, analysis: { ...result.analysis, mode: "live", run: { model: "Demo (no model is called)", claude: true, web: true } }, usage: { inputTokens: STEPS.reduce((n, s) => n + s.inTok, 0), outputTokens: STEPS.reduce((n, s) => n + s.outTok, 0), ms: STEPS.reduce((n, s) => n + s.ms, 0) } }, ...live };
}

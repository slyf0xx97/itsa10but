import type { Analysis, AtsCheck, Resume } from "./analysis-types.ts";
import { previewAnalysis } from "./preview-analysis.ts";
import { runSafetyCheck, type PiiFinding, type InjectionMatch } from "./safety.ts";
import { chunkResume, buildRetrievalSteps, verifyQuote, type Chunk, type RetrievalStep } from "./rag.ts";
import { catalog, hasTerm } from "./preview-analysis.ts";
import { laneLabel } from "./agent-abilities.ts";

export const READER_NAMES = ["Role Scout", "Experience Finder", "Recruiter", "Action Planner"] as const;
export type ReaderName = (typeof READER_NAMES)[number];
type Speaker = ReaderName | "Orchestrator";

export type EngineResult = {
  analysis: Analysis;
  /** Absent on live results: the retrieval trace belongs to the rules engine. */
  retrievalSteps?: RetrievalStep[];
  /** Live runs only: model token totals, for checking cost. */
  usage?: { inputTokens: number; outputTokens: number };
  safety: { piiFound: PiiFinding[]; injectionFlags: InjectionMatch[] };
};

export type EngineEvent =
  | { type: "orchestrator"; message: string; simulated: boolean; mode?: "rules" | "live" }
  | { type: "safety"; piiFound: PiiFinding[]; injectionFlags: InjectionMatch[]; simulated: false }
  | { type: "tool-call"; agent: Speaker; tool: string; input: unknown; output: unknown; simulated: boolean; mode?: "rules" | "live" }
  | { type: "handoff"; from: Speaker; to: Speaker; message: string; simulated: boolean; mode?: "rules" | "live" }
  | { type: "retrieval"; agent: ReaderName; step: RetrievalStep; simulated: boolean; mode?: "rules" | "live" }
  | { type: "reasoning"; agent: ReaderName; text: string; done: boolean; simulated: boolean; mode?: "rules" | "live" }
  /** One progress lane of one reader. Rules runs derive these from real text work; live runs from real tool calls. Never carries résumé text. */
  | { type: "activity"; agent: ReaderName; lane: string; label: string; status: "start" | "progress" | "done"; progress?: number; detail?: string; simulated: boolean; mode?: "rules" | "live" }
  | { type: "stage"; index: number; agent: { role: ReaderName; note: string }; simulated: boolean; mode?: "rules" | "live" }
  | { type: "complete"; result: EngineResult; simulated: boolean; mode?: "rules" | "live" }
  /** Live runs: the run started. Rules runs never send this. */
  | { type: "start"; mode: "live"; runId: string; simulated: false; /** Model name(s) used, such as "Haiku 5.5 and Sonnet 5.5". */ model?: string; /** False when a model other than Claude was chosen. */ claude?: boolean; /** False when no Firecrawl key was given, so the agents skipped the web. */ web?: boolean }
  /** Live run could not finish; the events after this are the rules engine (simulated: true, mode "rules"). */
  | { type: "notice"; kind: "fallback"; message: string; simulated: false; mode: "live" }
  | { type: "error"; error: string };

export type ActivityEvent = Extract<EngineEvent, { type: "activity" }>;

/** stepDelayMs paces the older events. paceMs is the time each reader spends on its activity lanes (default 4800 ms when stepDelayMs is set, else 0). Reduced-motion callers pass a smaller paceMs and still get every event. */
export type EngineOptions = { stepDelayMs?: number; paceMs?: number };

const wait = (ms: number) => (ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve());

const splitIntoPieces = (text: string): string[] => {
  const pieces = text.match(/[^.!?]+[.!?]*/g);
  return (pieces ?? [text]).map((piece) => piece.trim()).filter(Boolean);
};

type Script = { id: string; steps: string[]; end: string };
type LaneInput = { job: string; resumeText: string; resumeCount: number; chunks: Chunk[]; analysis: Analysis; retrievalSteps: RetrievalStep[] };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const orElse = (list: string[], fallback: string) => (list.length ? list : [fallback]);

/** The lanes for one reader. Every line is counted or checked from the real run: no résumé text, no web, no model. */
function lanesScripts(reader: ReaderName, c: LaneInput): Script[] {
  const skills = c.analysis.skills;
  switch (reader) {
    case "Role Scout": {
      const words = c.job.split(/\s+/).filter(Boolean).length;
      const found = catalog.filter((seed) => seed.terms.some((term) => hasTerm(c.job, term)));
      const ranked = [...skills].sort((a, b) => b.demand - a.demand);
      const company = c.analysis.company;
      return [
        { id: "role-read", steps: ["Opening the role text", `${plural(words, "word")} to read`, `${plural(splitIntoPieces(c.job).length, "sentence")} scanned`], end: `Read ${plural(words, "word")}` },
        { id: "role-terms", steps: orElse(found.slice(0, 4).map((seed) => `Found ${seed.name} terms`), "No known skill terms found"), end: `${found.length} of ${catalog.length} known skills found` },
        { id: "role-rank", steps: orElse(ranked.slice(0, 3).map((skill) => `${skill.name}: demand ${skill.demand}`), "Nothing to rank"), end: ranked[0] ? `Top demand: ${ranked[0].name}` : "Nothing to rank" },
        // Matched against a short checked list in lib/company-culture.ts: no web, no model.
        { id: "company-detect", steps: company ? [`Found ${company.name} in the posting`, `${plural(company.values.length, "published value")} on its own page`] : ["Checking the posting against a short list of employers"], end: company ? `${company.name}: ${plural(company.values.length, "value")} listed` : "No known employer found" },
      ];
    }
    case "Experience Finder": {
      // Scores each skill's proof and flags the weak ones; the "but" line comes from those flags.
      const checked = skills.filter((skill) => skill.resumeQuote).map((skill) => ({ name: skill.name, ok: verifyQuote(c.resumeText, skill.resumeQuote!.quote) }));
      const thin = skills.filter((skill) => skill.demand - skill.evidence >= 20);
      return [
        { id: "resume-search", steps: orElse(skills.slice(0, 4).map((skill) => `Searching for ${skill.name}`), "No skills to search for"), end: `${plural(skills.length, "skill")} searched in ${plural(c.chunks.length, "snippet")}` },
        { id: "quote-verify", steps: orElse(checked.slice(0, 4).map((item) => (item.ok ? `${item.name}: quote found word for word` : `${item.name}: quote not found, scores 0`)), "No quotes to check"), end: `${plural(checked.filter((item) => item.ok).length, "quote")} verified` },
        { id: "evidence-score", steps: orElse(skills.slice(0, 4).map((skill) => `${skill.name}: proof ${skill.evidence}`), "Nothing to score"), end: `${plural(skills.length, "skill")} scored` },
        { id: "doubt-flag", steps: orElse(thin.slice(0, 3).map((skill) => `${skill.name}: proof ${skill.evidence} against demand ${skill.demand}`), "No weak proof flagged"), end: `${plural(thin.length, "weak proof", "weak proofs")} flagged` },
      ];
    }
    case "Recruiter": {
      // A cold read of the masked text with the ATS-style rules: it never sees the Finder's evidence.
      const checks = c.analysis.ats?.checks ?? [];
      const word = { pass: "passes", warn: "needs a look", fail: "needs a fix" };
      const lane = (group: AtsCheck["group"], id: string, none: string): Script => {
        const own = checks.filter((item) => item.group === group);
        return { id, steps: orElse(own.map((item) => `${item.label}: ${word[item.status]}`), none), end: own.length ? `${own.filter((item) => item.status === "pass").length} of ${own.length} pass` : none };
      };
      return [lane("parse", "ats-parse", "No parse check ran"), lane("keywords", "ats-keywords", "No keyword check ran"), lane("wording", "ats-wording", "No wording check ran"), lane("format", "ats-format", "No format check ran")];
    }
    case "Action Planner": {
      const gaps = skills.map((skill) => ({ name: skill.name, gap: skill.demand - skill.evidence })).filter((item) => item.gap > 0).sort((a, b) => b.gap - a.gap);
      return [
        { id: "gap-rank", steps: orElse(gaps.slice(0, 3).map((item) => `${item.name}: gap of ${item.gap}`), "No gaps to rank"), end: gaps[0] ? `Biggest gap: ${gaps[0].name}` : "No gap to close" },
        { id: "quest-match", steps: orElse(c.analysis.quests.slice(0, 3).map((quest) => `Tip for ${quest.skill}`), "No tip needed"), end: `${plural(c.analysis.quests.length, "tip")} built` },
        { id: "match-formula", steps: ["Weighting each skill by demand", `Match works out at ${c.analysis.matchPercent}%`], end: `Match ${c.analysis.matchPercent}%` },
      ];
    }
  }
}

/** Runs a reader's lanes side by side: each lane starts one tick after the one before it, and the whole run takes about paceMs. */
async function* runLanes(reader: ReaderName, scripts: Script[], paceMs: number): AsyncGenerator<EngineEvent> {
  const lanes = scripts.map((script, offset) => ({ script, offset, length: script.steps.length + 2 }));
  const ticks = Math.max(...lanes.map((item) => item.length + item.offset));
  for (let tick = 0; tick < ticks; tick++) {
    for (const { script, offset, length } of lanes) {
      const at = tick - offset;
      if (at < 0 || at >= length) continue;
      const base = { type: "activity" as const, agent: reader, lane: script.id, label: laneLabel(reader, script.id), simulated: true, mode: "rules" as const };
      if (at === 0) yield { ...base, status: "start", progress: 0 };
      else if (at === length - 1) yield { ...base, status: "done", progress: 100, detail: script.end };
      else yield { ...base, status: "progress", progress: Math.round((at / (length - 1)) * 100), detail: script.steps[at - 1] };
    }
    await wait(paceMs / ticks);
  }
}

/**
 * Runs the four readers (Role Scout, Experience Finder, Recruiter, Action
 * Planner) as a staged, streamed pipeline around the conference table. The
 * Experience Finder scores proof and flags weak proof; the Recruiter runs the
 * ATS-style rules (lib/ats-check.ts) on the masked text without the Finder's
 * evidence. Every
 * event is a local simulation over the existing text-rules engine: there is
 * no model call, and every event says so.
 */
export async function* runSimulatedEngine(resumes: Resume[], job: string, options: EngineOptions = {}): AsyncGenerator<EngineEvent> {
  const delay = options.stepDelayMs ?? 0;
  const pace = options.paceMs ?? (delay > 0 ? 4800 : 0);
  try {
    yield { type: "orchestrator", message: "Four readers will go through the material in turn.", simulated: true };
    await wait(delay);

    const safety = runSafetyCheck(resumes, job);
    yield { type: "tool-call", agent: "Orchestrator", tool: "mask_personal_data", input: { resumeCount: resumes.length }, output: { categoriesMasked: safety.piiFound.map((item) => item.category) }, simulated: true };
    yield { type: "safety", piiFound: safety.piiFound, injectionFlags: safety.injectionFlags, simulated: false };
    await wait(delay);

    if (safety.injectionFlags.length > 0) {
      yield { type: "orchestrator", message: `Found ${plural(safety.injectionFlags.length, "possible hidden instruction")} in the role text. Continuing with the masked text only.`, simulated: true };
      await wait(delay);
    }

    const chunks = safety.maskedResumes.flatMap((resume) => chunkResume(resume.text));
    yield { type: "tool-call", agent: "Orchestrator", tool: "chunk_resume", input: { resumeCount: safety.maskedResumes.length }, output: { chunkCount: chunks.length }, simulated: true };
    await wait(delay);

    const analysis = previewAnalysis(safety.maskedResumes, safety.maskedJob);
    const retrievalSteps = buildRetrievalSteps(chunks, safety.maskedJob);

    const laneInput: LaneInput = { job: safety.maskedJob, resumeText: safety.maskedResumes.map((resume) => resume.text).join("\n"), resumeCount: safety.maskedResumes.length, chunks, analysis, retrievalSteps };

    let previous: Speaker = "Orchestrator";
    for (let index = 0; index < READER_NAMES.length; index++) {
      const reader = READER_NAMES[index];
      yield { type: "handoff", from: previous, to: reader, message: previous === "Orchestrator" ? `Safety check done. ${reader} goes first.` : `${previous} passes its notes to ${reader}.`, simulated: true };
      previous = reader;
      await wait(delay);

      yield* runLanes(reader, lanesScripts(reader, laneInput), pace);

      // The Recruiter reads cold, so it gets no retrieval citation.
      const step = reader === "Recruiter" ? undefined : retrievalSteps[index];
      if (step) {
        yield { type: "retrieval", agent: reader, step, simulated: true };
        await wait(delay);
      }

      const note = analysis.agents[index];
      for (const piece of splitIntoPieces(note.note)) {
        yield { type: "reasoning", agent: reader, text: piece, done: false, simulated: true };
        await wait(delay);
      }
      yield { type: "reasoning", agent: reader, text: "", done: true, simulated: true };
      yield { type: "stage", index, agent: { role: reader, note: note.note }, simulated: true };
      await wait(delay);
    }

    yield { type: "handoff", from: previous, to: "Orchestrator", message: `${previous} is done. Putting the result together.`, simulated: true };

    const result: EngineResult = { analysis, retrievalSteps, safety: { piiFound: safety.piiFound, injectionFlags: safety.injectionFlags } };
    yield { type: "complete", result, simulated: true };
  } catch (error) {
    yield { type: "error", error: error instanceof Error ? error.message : "The check could not finish." };
  }
}

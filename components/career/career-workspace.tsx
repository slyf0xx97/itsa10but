"use client";
import { BASE_PATH } from "@/lib/base-path";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { FileText, LoaderCircle, Play, RotateCcw, Upload, X } from "lucide-react";
import type { AgentNote, Analysis, Resume } from "@/lib/analysis-types";
import { sampleAnalysis, sampleJob } from "@/lib/analysis-types";
import { samplePaths } from "@/lib/sample-paths";
import { readResumeFile } from "@/lib/read-resume";
import { runSafetyCheck } from "@/lib/safety";
import { runSimulatedEngine, READER_NAMES, type EngineEvent } from "@/lib/simulated-engine";
import { liveRunNote, type RunMode } from "@/lib/mode-copy";
import { ReaderSwitch, chosenModel, modelKeyHeaders, useModeStatus, type VisitorKeyState } from "@/components/career/reader-switch";
import { recordMcpCallStart, recordMcpCallEnd, clearMcpCallLog } from "@/lib/mcp-tools";
import { LevelUpChecklist } from "@/components/level-up";
import { HowItWorks } from "@/components/how-it-works";
import { SafetyPanel } from "@/components/career/safety-panel";
import { RoleInput } from "@/components/career/role-input";
import { SampleMenu } from "@/components/career/sample-picker";
import { HeroAgents } from "@/components/career/hero-agents";
import { RunControls } from "@/components/career/run-controls";
import { createPauseGate } from "@/lib/pause-gate";
import { ReaderCards } from "@/components/career/reader-cards";
import { applyActivity, emptyActivity, type ActivityState } from "@/lib/activity-state";
import { RadarPanel, RadarTitle } from "@/components/career/skill-grid";
import { STAGES } from "@/lib/journey";
import { StageHeader } from "@/components/stage-banner";
import { SourcesCard } from "@/components/sg-signals";
import { JourneyBar } from "@/components/journey-bar";
import { HeaderTabs } from "@/components/career/header-tabs";
import { SynthesisDashboard } from "@/components/career/synthesis-dashboard";
import { Term } from "@/components/career/term";
import { LicensePopup } from "@/components/license-popup";
import { PrivacyTip } from "@/components/career/privacy-tip";
import { ResumeTips } from "@/components/career/resume-tips";
import { useDropZone } from "@/components/career/use-drop-zone";
import { pickResumeFile, type DropPayload } from "@/lib/drop-payload";

type WebMcpTool = {
  name: string; title: string; description: string; inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown | Promise<unknown>;
};
type ModelContext = { registerTool: (tool: WebMcpTool, options?: { signal: AbortSignal }) => void | Promise<void> };

const emptyAgents: AgentNote[] = [
  { role: "Role reader", note: "" }, { role: "Advocate", note: "" },
  { role: "Recruiter", note: "" }, { role: "Editor", note: "" },
];

// Hero points: an icon from /assets/icons/, a short lead and one or two plain sentences with the key phrases marked.
const heroPoints = [
  { icon: "abilities/read-role.svg", lead: "Add a role and your résumé.", text: <>Paste a <b>job posting</b> or a <b>LinkedIn link</b>, then add <b>one résumé file</b>.</> },
  { icon: "abilities/verify-quotes.svg", lead: "Multi-agent checker to analyse and improve your résumé.", text: <>Four agents read the role, look for proof in your résumé, screen it like employer software and plan your next steps.</> },
  { icon: "abilities/rank-gaps.svg", lead: "You get a clear next step.", text: <>A <b>skills radar</b>, a breakdown of each skill and a short roadmap.</> },
];

// Typing in the role box, or each step of a sample run, re-renders this whole component. These big panels only need to redraw when their own props change, so they are memoised.
const HowItWorksPanel = memo(HowItWorks);
const LevelUpPanel = memo(LevelUpChecklist);
const SourcesPanel = memo(SourcesCard);
const ReaderCardsPanel = memo(ReaderCards);
const SynthesisPanel = memo(SynthesisDashboard);
const RadarPanelMemo = memo(RadarPanel);
const JourneyBarMemo = memo(JourneyBar);

/** Header text for stage `index`, taken from lib/journey.ts so the journey bar and the stage headers always agree. */
const header = (index: number) => ({ n: STAGES[index].number, title: STAGES[index].title, line: STAGES[index].line, scene: STAGES[index].scene });

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Pause / Resume for a run in progress. One gate for the page: the sample steps (wait) and the engine loop (consume) both hold at it. */
const runGate = createPauseGate();
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms)).then(() => runGate.wait());

/** Steps of the sample run-through. "idle" means no sample sequence is running. */
type Stage = "idle" | "role" | "typing" | "reading" | "safety" | "starting";
const STAGE_HINT: Record<Exclude<Stage, "idle">, string> = {
  role: "Choosing the role…", typing: "Choosing the role…", reading: "Adding the résumé…", safety: "Adding the résumé…", starting: "Starting the readers…",
};

class LiveUnavailable extends Error {}

/** Reads /api/agents/stream as NDJSON. A refusal (400/429/503) carries a plain {error, fallback:"rules"} body. Visitor keys travel in headers only, never the body or URL. */
async function* streamLive(items: Resume[], job: string, keys: VisitorKeyState): AsyncGenerator<EngineEvent> {
  const keyHeaders = modelKeyHeaders(keys);
  const response = await fetch(BASE_PATH + "/api/agents/stream", {
    method: "POST", headers: { "Content-Type": "application/json", ...keyHeaders }, cache: "no-store", credentials: "omit",
    // The model pick is not a secret, so it travels in the body. The server checks it. Undefined (the recommended mix) is left out.
    body: JSON.stringify({ resumes: items.map(({ id, name, text }) => ({ id, name, text })), job, model: chosenModel(keys) }),
  });
  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => null) as { error?: unknown } | null;
    throw new LiveUnavailable(typeof data?.error === "string" ? data.error : "The agents were unavailable.");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = done ? "" : lines.pop() ?? "";
    for (const line of lines) if (line.trim()) yield JSON.parse(line) as EngineEvent;
    if (done) break;
  }
}

export default function Home() {
  const [handoff, setHandoff] = useState("");
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [job, setJob] = useState("");
  const [analysis, setAnalysis] = useState<Analysis>(sampleAnalysis);
  const [hasResult, setHasResult] = useState(false);
  const [stageAgents, setStageAgents] = useState<AgentNote[]>(emptyAgents);
  const [activities, setActivities] = useState<ActivityState>(emptyActivity);
  const [processStep, setProcessStep] = useState(0);
  const [activeAgent, setActiveAgent] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [interest, setInterest] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [paused, setPaused] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false); // the analysis part of a Play sample run
  // Page memory only: the choice, the mode that actually ran, and any fallback notice.
  const [mode, setMode] = useState<RunMode>("rules");
  const [ranMode, setRanMode] = useState<RunMode>("rules");
  const [notice, setNotice] = useState("");
  // Visitor API keys: React state only, never storage, cookies, URLs or the request body.
  const [keys, setKeys] = useState<VisitorKeyState>({ anthropic: "", firecrawl: "" });
  const modeStatus = useModeStatus();
  const safetyReport = useMemo(() => resumes.length ? runSafetyCheck(resumes, job.trim() || sampleJob) : null, [resumes, job]);
  const fileRef = useRef<HTMLInputElement>(null);
  const runRef = useRef(0);
  const hasResultRef = useRef(false);
  const analysisRef = useRef(analysis);
  const analyseRef = useRef<(items: Resume[], role: string) => Promise<Analysis>>(async () => sampleAnalysis);
  const locked = busy || stage !== "idle";
  const sampleRunning = stage !== "idle" || (sampleBusy && busy); // Pause and Reset show for a Play sample run only, so a visitor's own inputs are never wiped
  const sample = !hasResult && !busy;
  const shownMode: RunMode = sample ? "rules" : ranMode;
  const visibleAgents = busy ? stageAgents : analysis.agents;
  const visibleStep = busy ? processStep : 4;
  const flow = useMemo(() => ({ active: busy ? activeAgent : -1, completed: visibleStep }), [busy, activeAgent, visibleStep]);
  const madeUp = resumes[0]?.id.startsWith("example-");
  const [dropMsg, setDropMsg] = useState("");
  const dz = useDropZone(dropResume, stage === "idle");

  useEffect(() => { analysisRef.current = analysis; hasResultRef.current = hasResult; }, [analysis, hasResult]);
  useEffect(() => () => { runRef.current++; runGate.resume(); }, []); // stops a sample sequence that is still waiting when the page goes away

  useEffect(() => {
    const context = (document as unknown as { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: WebMcpTool) => {
      try { void Promise.resolve(context.registerTool({ ...tool, execute: async (input) => {
        const id = recordMcpCallStart(tool.name, { supplied: true });
        try {
          const result = await tool.execute(input);
          recordMcpCallEnd(id, true);
          return result;
        } catch (error) {
          recordMcpCallEnd(id, false);
          throw error;
        }
      } }, { signal: lifecycle.signal })).catch(() => undefined); }
      catch { /* WebMCP is optional. */ }
    };
    register({
      name: "read_itsa10but_analysis", title: "Read Itsa10but analysis",
      description: "Read the visible skill map and action path without exposing uploaded résumé text.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => {
        if (!hasResultRef.current) return { status: "No résumé analysis has been run yet." };
        const current = analysisRef.current;
        return { title: current.title, mode: current.mode, but: current.but, skills: current.skills.map(({ name, demand, evidence, detail }) => ({ name, demand, evidence, detail })), quests: current.quests };
      },
    });
    register({
      name: "analyse_itsa10but_profile", title: "Compare résumés with a role",
      description: "Compare one to three supplied résumé texts with a role and update the visible dashboard.",
      inputSchema: { type: "object", properties: {
        resumes: { type: "array", minItems: 1, maxItems: 3, items: { type: "object", properties: { name: { type: "string" }, text: { type: "string" } }, required: ["name", "text"], additionalProperties: false } },
        job: { type: "string" },
      }, required: ["resumes", "job"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input) => {
        if (!input || typeof input !== "object") throw new Error("Supply résumés and a job description.");
        const value = input as Record<string, unknown>;
        if (!Array.isArray(value.resumes) || value.resumes.length < 1 || value.resumes.length > 3 || typeof value.job !== "string") throw new Error("Supply one to three résumés and a job description.");
        const items = value.resumes.map((item, index) => {
          const resume = item as Record<string, unknown>;
          if (typeof resume.name !== "string" || typeof resume.text !== "string") throw new Error("Each résumé needs a name and text.");
          return { id: "webmcp-" + index, name: resume.name, text: resume.text };
        });
        const result = await analyseRef.current(items, value.job);
        return { title: result.title, mode: result.mode, but: result.but, skillCount: result.skills.length, questCount: result.quests.length };
      },
    });
    return () => lifecycle.abort();
  }, []);

  function scrollToResults() {
    window.setTimeout(() => document.getElementById("readers")?.scrollIntoView({ behavior: reducedMotion() ? "instant" : "smooth", block: "start" }), 80);
  }

  /** Sample run-through: scroll, pick, type the role, add the résumé, then start. Any newer run or Start over (runRef) stops it. */
  async function runExample(id: string = samplePaths[0].id) {
    const path = samplePaths.find((item) => item.id === id) ?? samplePaths[0];
    const items = [{ id: "example-" + path.id, name: path.label.replace(/[^A-Za-z0-9]+/g, "_") + "_sample.txt", text: path.resume }];
    const run = ++runRef.current;
    const quick = reducedMotion();
    const stopped = () => run !== runRef.current;
    setError(""); setNotice(""); setResumes([]); setJob(""); setInterest("");
    setStage("role");
    document.getElementById("check")?.scrollIntoView({ behavior: quick ? "instant" : "smooth", block: "start" });
    await wait(quick ? 100 : 450); if (stopped()) return;
    setInterest(path.id);
    await wait(quick ? 100 : 350); if (stopped()) return;
    if (quick) setJob(path.job);
    else {
      setStage("typing");
      const chunk = Math.ceil(path.job.length / 100); // about 100 ticks of 18ms: roughly 1.8 s for a long role
      for (let at = chunk; ; at += chunk) {
        setJob(path.job.slice(0, at));
        if (at >= path.job.length) break;
        await wait(18); if (stopped()) return;
      }
      setStage("role");
    }
    await wait(quick ? 100 : 250); if (stopped()) return;
    setStage("reading"); setResumes(items);
    await wait(quick ? 150 : 800); if (stopped()) return;
    setStage("safety");
    await wait(quick ? 150 : 650); if (stopped()) return;
    setStage("starting");
    await wait(quick ? 150 : 350); if (stopped()) return;
    setStage("idle");
    const started = analyse(items, path.job).catch(() => undefined);
    const mine = runRef.current; // analyse takes its run number before its first await
    setSampleBusy(true);
    void started.then(() => { if (runRef.current === mine) setSampleBusy(false); });
  }

  /** Pause holds the sample steps and the engine between events. Reset is Start over: it ends the run, wakes anything held at the gate, and returns to the idle sample view. */
  function togglePause() { if (runGate.paused) runGate.resume(); else runGate.pause(); setPaused(runGate.paused); }

  function startOver() {
    runRef.current++;
    runGate.resume(); setPaused(false); setSampleBusy(false);
    setHandoff(""); clearMcpCallLog();
    setResumes([]); setJob(""); setAnalysis(sampleAnalysis);
    setHasResult(false); setBusy(false); setError(""); setStageAgents(emptyAgents); setActivities(emptyActivity);
    setProcessStep(0); setActiveAgent(-1); setInterest(""); setStage("idle");
    setNotice(""); setRanMode("rules"); setDropMsg("");
  }

  // One résumé at a time: a new file replaces the current one.
  function addFiles(files: FileList | null) { const file = files?.[0]; if (file) void addFile(file); }
  async function addFile(file: File, message = "") {
    setDropMsg(message);
    try {
      const next = [{ id: file.name + "-" + file.lastModified + "-" + file.size, name: file.name, text: await readResumeFile(file) }];
      setResumes(next); setError("");
      // A live run costs a call, so it waits for the button instead of starting on upload.
      if (mode !== "live") void analyse(next, job.trim() || sampleJob).catch(() => undefined);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "This file could not be read."); }
    if (fileRef.current) fileRef.current.value = "";
  }

  // One résumé box: a dropped file is read (the first valid one), a dropped link or text is turned away with a pointer to the role box.
  function dropResume(payload: DropPayload) {
    if (payload.kind === "files") {
      const { file, message } = pickResumeFile(payload.files);
      if (file) void addFile(file, message); else setDropMsg(message);
    } else setDropMsg(payload.kind === "none" ? "Nothing readable was dropped. Drop a PDF, TXT or MD file." : "Drop a PDF, TXT or MD file here. Links and job text go in the role box.");
  }

  /** Live mode only runs from the visitor's own button press, never from samples or tool calls. */
  async function analyse(items: Resume[], role: string, wantLive = false): Promise<Analysis> {
    setError(""); setNotice("");
    if (!items.length || !role.trim()) throw new Error("Add at least one résumé and a target job description.");
    const run = ++runRef.current;
    setResumes(items); setJob(role);
    setHandoff("Safety check done. The readers are up next.");
    setHasResult(false);
    setAnalysis(sampleAnalysis);
    setStageAgents(emptyAgents); setActivities(emptyActivity);
    setProcessStep(0); setActiveAgent(0);
    setRanMode(wantLive ? "live" : "rules");
    setBusy(true);
    scrollToResults();
    try {
      const outcome: { result?: Analysis } = {};
      const consume = async (source: AsyncIterable<EngineEvent>) => {
      for await (const event of source) {
        await runGate.wait(); // Pause holds the run here, between events
        if (run !== runRef.current) throw new Error("Analysis cancelled.");
        if (event.type === "error") throw new Error(event.error);
        if (event.type === "notice") { setNotice(event.message); setRanMode("rules"); }
        if (event.type === "handoff") {
          setHandoff(event.message);
          setActiveAgent(READER_NAMES.indexOf(event.to as typeof READER_NAMES[number]));
        }
        if (event.type === "reasoning" && event.text) {
          const readerIndex = READER_NAMES.indexOf(event.agent);
          setStageAgents((current) => current.map((item, index) => index === readerIndex ? { role: event.agent, note: [item.note, event.text].filter(Boolean).join(" ") } : item));
        }
        if (event.type === "activity") setActivities((current) => applyActivity(current, event));
        if (event.type === "stage") {
          setStageAgents((current) => current.map((item, index) => index === event.index ? event.agent : item));
          setProcessStep(event.index + 1);
        }
        if (event.type === "complete") {
          outcome.result = event.result.analysis;
          setRanMode(event.mode === "live" ? "live" : "rules");
        }
      }
      };
      if (wantLive) {
        try { await consume(streamLive(items, role, keys)); }
        catch (cause) {
          if (run !== runRef.current) throw cause;
          // Any live failure finishes with the rules engine and says so.
          outcome.result = undefined;
          setNotice(cause instanceof LiveUnavailable ? cause.message + " This is the native scan result instead." : "The agents did not finish. This is the native scan result instead.");
          setRanMode("rules"); setMode("rules");
          setStageAgents(emptyAgents); setActivities(emptyActivity); setProcessStep(0); setActiveAgent(0);
        }
      }
      if (!outcome.result) await consume(runSimulatedEngine(items, role, { stepDelayMs: 320, paceMs: reducedMotion() ? 1500 : undefined }));
      const completed = outcome.result;
      if (!completed) throw new Error("The check ended before it had a result.");
      if (run === runRef.current) {
        setResumes(items); setJob(role); setAnalysis(completed);
        setHasResult(true); setProcessStep(4); setActiveAgent(-1);
      }
      return completed;
    } catch (cause) {
      if (run === runRef.current) setError(cause instanceof Error ? cause.message : "The check did not finish. Please try again.");
      throw cause;
    } finally { if (run === runRef.current) { setBusy(false); setActiveAgent(-1); } }
  }
  useEffect(() => { analyseRef.current = analyse; });

  return <>
    <a className="skip-link" href="#check">Skip to the check</a>
    <header className="site-header"><div className="wrap">
      <HeaderTabs><a className="brand" href="#top" aria-label="itsa10but home"><b>10</b><span>itsa10but<em>?</em></span></a></HeaderTabs>
      <ReaderSwitch mode={mode} onMode={setMode} keys={keys} onKeys={setKeys} status={modeStatus} disabled={busy} />
    </div></header>

    <main id="top">
      <section className="hero" aria-labelledby="hero-title">
        <div className="wrap-wide hero-grid">
          <div className="hero-text">
            <h1 id="hero-title">Your résumé is a <span className="hero-ten">10</span>!<br /><mark>But…</mark> it’s a…<span className="hero-q">?</span></h1>
            <p className="hero-lede"><Term id="itsa10but" /> is a free and open-source résumé enhancer tool that uses multi-agentic AI to analyse your résumé against a real job and <span className="nowrap"><Term id="how-it-helps" />.</span><br />Made for tech and tech-adjacent roles.</p>
            <div className="start-row">
              {!sampleRunning && <a className="btn primary start" href="#check"><Play size={16} aria-hidden="true" /> Press start</a>}
              <RunControls active={sampleRunning} paused={paused} onToggle={togglePause} onReset={startOver} />
              <SampleMenu onPick={(id) => void runExample(id)} disabled={locked} activeId={interest} />
            </div>
            <HeroAgents />
          </div>
          <div className="hero-card">
            <ol className="hero-points">
              {heroPoints.map((point, index) => <li key={point.icon}>
                {/* eslint-disable-next-line @next/next/no-img-element -- tiny static pixel SVG, nothing to optimise */}
                <img src={BASE_PATH + "/assets/icons/" + point.icon} alt="" aria-hidden="true" width={24} height={24} />
                <span className="hero-num" aria-hidden="true">{index + 1}</span>
                <p><strong>{point.lead}</strong> {point.text}</p>
              </li>)}
            </ol>
          </div>
        </div>
      </section>

      <div className="wrap-wide stage-rows">
        <div className="stage-row is-single">
          <section className="stage" id="check" aria-labelledby="check-title">
            <StageHeader {...header(0)} titleId="check-title" />
            <div className="stage-body"><div className="card game check-card">
              <div className="check-grid">
                <section className="check-pane" aria-labelledby="pane-role">
                  <h3 className="step-title" id="pane-role"><span className="step-num">1</span> The role</h3>
                  <div className="cl-item ck-lead"><p className="cl-text"><strong className="cl-lead">Paste the job</strong>Copy the <span className="hl">whole posting</span> with its requirements, or paste a LinkedIn link.</p></div>
                  <RoleInput value={job} onChange={setJob} typing={stage === "typing"} />
                </section>
                <section className="check-pane" aria-labelledby="pane-resume">
                  <h3 className="step-title" id="pane-resume"><span className="step-num">2</span> Your résumé</h3>
                  <div className="cl-item ck-lead"><p className="cl-text"><strong className="cl-lead">Drop one file</strong><span className="hl">PDF, TXT or MD</span>.</p></div>
                  <ResumeTips />
                  <input id="resume-files" ref={fileRef} type="file" accept=".txt,.md,.pdf" className="sr-only" onChange={(event) => void addFiles(event.target.files)} />
                  <div className={"dropzone" + (dz.over ? " is-over" : "") + (resumes.length ? " has-file" : "")} {...dz.props}>
                    {resumes.length === 0 ? <>
                      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static pixel SVG, nothing to optimise */}
                      <span className="dz-art" aria-hidden="true"><img src={`${BASE_PATH}/assets/icons/quests/write.svg`} alt="" width={40} height={40} /></span>
                      <p className="dz-title">Drop your résumé here or choose a file</p>
                      <p className="hint dz-hint"><b>PDFs need text you can select.</b> Scanned pages won&apos;t work.</p>
                      <div className="dz-actions">
                        <button type="button" className="btn primary" disabled={stage !== "idle"} onClick={() => fileRef.current?.click()}><Upload size={16} aria-hidden="true" /> Choose a file</button>
                        <PrivacyTip />
                      </div>
                    </> :<ul className="dz-files" aria-label="Résumé added">{resumes.map((resume) => <li key={resume.id} className={"file-in" + (stage === "reading" ? " reading" : "")}>
                      <FileText size={18} aria-hidden="true" /><span className="dz-name" title={resume.name}>{resume.name}</span>
                      {stage === "reading" && <><span className="file-status">Reading file…</span><i className="file-bar" aria-hidden="true" /></>}
                      <button type="button" className="btn quiet dz-btn" disabled={stage !== "idle"} onClick={() => fileRef.current?.click()}>Replace</button>
                      <button type="button" className="btn quiet dz-btn" aria-label={"Remove " + resume.name} disabled={stage !== "idle"} onClick={() => setResumes([])}><X size={14} aria-hidden="true" /> Remove</button>
                    </li>)}</ul>}
                    {resumes.length > 0 && <div className="dz-actions"><PrivacyTip /></div>}
                    <p className="dz-live" role="status" aria-live="polite">{dz.over ? "Drop your résumé to add it." : dropMsg}</p>
                  </div>
                  {resumes.length > 0 && stage !== "reading" && <div className="fade-in"><SafetyPanel report={safetyReport} /></div>}
                </section>
                <aside className="check-guide" aria-label="Reader's guide">
                  <SourcesPanel firecrawlKey={keys.firecrawl} />
                </aside>
              </div>
              <div className="actions">
                <button type="button" className="btn primary" aria-busy={locked} disabled={locked || !resumes.length} onClick={() => void analyse(resumes, job.trim() || sampleJob, mode === "live").catch(() => undefined)}>{locked ? <><LoaderCircle className="spin" size={16} aria-hidden="true" /> {busy ? "Reading…" : "Getting ready…"}</> : <><Play size={16} aria-hidden="true" /> {hasResult ? "Play again" : "Start the check"}</>}</button>
                <button type="button" className="btn quiet" onClick={startOver}><RotateCcw size={15} aria-hidden="true" /> Start over</button>
                <span className="act-hint" role="status">{stage !== "idle" ? STAGE_HINT[stage] : job.trim() ? "Role ready." : resumes.length ? "No role pasted, so the sample AI / Machine Learning Engineer role is used." : "Add a role and a résumé, or play a sample at the top."}</span>
              </div>
              {error && <p className="notice error" role="alert">{error}</p>}
            </div></div>
          </section>
        </div>

        {/* Rows 2 and 3 are one full-width panel each (is-single): each stage fills its columns inside, so neither runs two screens tall. */}
        <div className="stage-row is-single">
          <section className={"stage" + (busy || hasResult ? " run-live" : "")} id="readers" aria-labelledby="readers-title">
            <StageHeader {...header(1)} titleId="readers-title" />
            <div className="stage-body">
              <p className="progress rs-progress" role="status" aria-live="polite">{busy ? handoff : ""}</p>
              {notice && <p className="notice mode-notice" role="status">{notice}</p>}
              {shownMode === "live" && <p className="mode-note">{liveRunNote(hasResult ? analysis.run : undefined)}</p>}
              <ReaderCardsPanel agents={visibleAgents} active={busy ? activeAgent : -1} completed={visibleStep} activities={busy || hasResult ? activities : emptyActivity} mode={shownMode} model={chosenModel(keys)} />
              <SynthesisPanel analysis={analysis} hasResult={hasResult} busy={busy} madeUp={madeUp} flow={flow} />
            </div>
          </section>
        </div>

        <div className="stage-row is-single">
          <section className="stage" id="radar" aria-labelledby="map-title">
            <StageHeader {...header(2)} titleId="map-title" />
            <div className="stage-body">
              {busy
                ? <div className="cl-item"><span className="cl-icon" aria-hidden="true">⏳</span><p className="cl-text"><strong className="cl-lead">The radar draws when the readers finish</strong></p></div>
                : <div className={"radar-section" + (hasResult ? " reveal" : "")}><RadarTitle /><RadarPanelMemo skills={analysis.skills} matchPercent={analysis.matchPercent} /></div>}
            </div>
          </section>
        </div>

        <div className="stage-row is-single">
          {/* No stage banner: the Level up panel carries its own h2 with the full title. */}
          <section className="stage" id="level-up" aria-labelledby="level-up-title">
            <div className="stage-body"><LevelUpPanel /></div>
          </section>
        </div>

        <div className="stage-row is-single">
          <section className="stage" id="how-it-works" aria-labelledby="how-it-works-title">
            <div className="stage-body"><HowItWorksPanel /></div>
          </section>
        </div>
      </div>
    </main>

    <JourneyBarMemo busy={busy} hasResult={hasResult} hasInput={Boolean(job.trim() && resumes.length)} />

    <footer className="site-footer"><div className="wrap ft-grid">
      <div className="ft-text">
        <p>itsa10but is independent. LinkedIn and the listed employers don&apos;t endorse or sponsor it, and their names and logos belong to their owners. Job listings come from outside feeds, so check the original posting before you apply.</p>
        <p>The four agent characters are original, fictional illustrations made for this project. They don&apos;t depict any real person, company, brand or character.</p>
      </div>
      <div className="ft-meta">
        {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG, nothing to optimise */}
        <span className="ft-copy">© 2026 <a className="ft-author" href="https://sg.linkedin.com/in/ghernie" target="_blank" rel="noopener noreferrer"><img src={`${BASE_PATH}/assets/logos/linkedin-in.svg`} alt="" width="24" height="24" />Ghernie Encinas</a></span>
        <LicensePopup />
      </div>
    </div></footer>
  </>;
}

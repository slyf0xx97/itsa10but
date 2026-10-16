"use client";

import { CardCoins, RunTotal } from "@/components/career/usage-strip";
import type { UsageRow } from "@/lib/usage-coins";
import { BASE_PATH } from "@/lib/base-path";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { PromptPeek } from "@/components/career/prompt-peek";
import { Popup } from "@/components/popup";
import { PixelIcon } from "@/components/career/pixel-icons";
import type { AgentNote } from "@/lib/analysis-types";
import { abilitiesFor, AGENT_PROFILES, lanesFor, type Ability, type Mode } from "@/lib/agent-abilities";
import { AGENT_FACTS, hasWeb, type AgentFact } from "@/lib/agent-facts";
import type { ActivityState, AgentActivity } from "@/lib/activity-state";
import type { ReaderName } from "@/lib/simulated-engine";

export type { LaneState, ActivityState } from "@/lib/activity-state";

export type SpriteKind = "scout" | "finder" | "recruiter" | "coach";

// Order matters: this is the order the agents run and hand off in.
export const readers: { kind: SpriteKind; name: ReaderName; desc: string; alt: string }[] = [
  { kind: "scout", name: "Role Scout", desc: "Reads the job posting and lists the skills it asks for.", alt: "Teal pixel Role Scout holding binoculars" },
  { kind: "finder", name: "Experience Finder", desc: "Looks in your résumé for proof of each skill, scores it and flags weak proof.", alt: "Mint pixel Experience Finder holding a magnifying glass" },
  { kind: "recruiter", name: "Recruiter", desc: "Checks your résumé like hiring software (ATS) and lists the top fixes.", alt: "Coral pixel Recruiter checking a clipboard" },
  { kind: "coach", name: "Action Planner", desc: "Turns your biggest gap into one project you can show.", alt: "Yellow pixel Action Planner holding a checklist" },
];

// The bars in the details popup show each agent's limit against the biggest limit of the four.
const MAX_CALLS = Math.max(...AGENT_FACTS.map((fact) => fact.toolCalls));
const MAX_SECONDS = Math.max(...AGENT_FACTS.map((fact) => fact.seconds));

type State = "waiting" | "active" | "done";
const stateOf = (index: number, active: number, completed: number): State => active === index ? "active" : completed > index ? "done" : "waiting";

export function PixelAgent({ kind, small = false }: { kind: SpriteKind; small?: boolean }) {
  const reader = readers.find((item) => item.kind === kind) ?? readers[0];
  return <span className={"agent" + (small ? " small" : "")}><span className={"pixel-sprite sprite-" + kind} role="img" aria-label={reader.alt} /></span>;
}

const Icon = ({ src }: { src: string }) => <img className="rd-icon" src={src} alt="" aria-hidden="true" width={16} height={16} />; // eslint-disable-line @next/next/no-img-element

type LaneView = { id: string; label: string; progress: number | null; status: "idle" | "start" | "progress" | "done"; detail?: string };

/** Rules mode lists every text-rules lane from the start. Live mode lists only the tools the agent really called. */
function laneViews(name: ReaderName, shown: Mode, entry: AgentActivity | undefined): LaneView[] {
  if (shown === "live") return (entry?.order ?? []).map((id) => entry!.lanes[id]).map((lane) => ({ id: lane.lane, label: lane.label, progress: lane.progress, status: lane.status, detail: lane.detail }));
  return lanesFor(name, "rules").map((def) => {
    const lane = entry?.lanes[def.id];
    return lane ? { id: def.id, label: def.label, progress: lane.progress, status: lane.status, detail: lane.detail } : { id: def.id, label: def.label, progress: 0, status: "idle" };
  });
}

/** What a finished reader did, in a few short phrases taken from its own lanes. */
function summaryOf(shown: Mode, entry: AgentActivity | undefined): string[] {
  if (!entry) return [];
  // The wait for the model is not something the agent did, so it is left out of the summary.
  const done = entry.order.filter((id) => id !== "model").map((id) => entry.lanes[id]).filter((lane) => lane.status === "done");
  return shown === "live" ? done.map((lane) => (lane.calls > 1 ? `${lane.label} ×${lane.calls}` : lane.label)) : done.flatMap((lane) => (lane.detail ? [lane.detail] : []));
}

/** Seconds since this card became active; the parent keys it by reader so it restarts at each handoff. */
function Elapsed() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => { const id = window.setInterval(() => setSeconds((value) => value + 1), 1000); return () => window.clearInterval(id); }, []);
  return <span className="rd-elapsed">{seconds}s</span>;
}

// Spoken status for screen readers. Sighted users get the status from motion and card styling only.
const stateWord: Record<State, string> = { waiting: "Waiting", active: "Working", done: "Done" };

/**
 * The four readers as plain cards in run order (avatar, name and a status chip, one "what it does" line, three moves with a label and one line each, and a "Strengths, limits & tools" button that opens a popup with the bars, access and tools; from lib/agent-facts.ts). The cards share row lines (a CSS subgrid), so the header, line, each move and the button line up across all four. Status is a dot, a short word and the avatar's motion, plus text for screen readers. The panel shows the reader that is working; once the run is over no panel is
 * open until the visitor clicks a finished step (click it again to close). Under the steps and the panel an elbow connector starts:
 * one line down from each reader, joined by a bus line, then one arrow into the dashboard. activities is the latest state per
 * agent and lane (see applyActivity); mode picks which abilities to list until activity arrives. Both are optional.
 */
export function ReaderCards({ agents, active, completed, activities, mode = "rules", model, usage, handoff }: { agents: AgentNote[]; active: number; completed: number; activities?: ActivityState; mode?: Mode; model?: string; /** API boost spend per agent. Leave out for a Native scan: there is nothing to count. */ usage?: UsageRow[]; /** The latest handoff. When `n` changes, a sheet of paper flies from the `from` agent's avatar to the `to` agent's. */ handoff?: { from: string; to: string; n: number } }) {
  // A pick only holds while the same reader is running (or while nothing runs: during is -1), so the panel follows the run again at the next handoff. index -1 means closed.
  const [picked, setPicked] = useState<{ index: number; during: number } | null>(null);
  const panelId = useId();
  const [details, setDetails] = useState<number | null>(null);
  const stepsRef = useRef<HTMLOListElement>(null);
  const paperRef = useRef<HTMLSpanElement>(null);
  const handoffN = handoff?.n ?? 0, handoffFrom = handoff?.from, handoffTo = handoff?.to;
  // The handover: a sheet of paper flies from one agent's avatar to the next, and the receiving avatar catches it. Positions are measured, so it works in one column or four.
  useEffect(() => {
    const ol = stepsRef.current, paper = paperRef.current;
    if (!handoffN || !ol || !paper || !handoffFrom || !handoffTo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const avatar = (name: string) => { const kind = readers.find((item) => item.name === name)?.kind; return kind ? ol.querySelector<HTMLElement>(`.rd-step.${kind} .rd-ava`) : null; };
    const base = ol.getBoundingClientRect();
    const centre = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return [r.left - base.left + r.width / 2 - 17, r.top - base.top + r.height / 2 - 17] as const; };
    const fromEl = avatar(handoffFrom), toEl = avatar(handoffTo);
    const target = toEl ?? fromEl;
    if (!target) return;
    const [tx, ty] = centre(target);
    // From the table the sheet slides in from the left of the first card; to the table it leaves to the right.
    const [sx, sy] = fromEl ? centre(fromEl) : [tx - 110, ty - 14];
    const [ex, ey] = toEl ? [tx, ty] : [sx + 110, sy - 40];
    const mx = (sx + ex) / 2, my = Math.min(sy, ey) - 34;
    const flight = paper.animate([
      { transform: `translate(${sx}px, ${sy}px) scale(.6) rotate(-8deg)`, opacity: 0, easing: "steps(3)" },
      { transform: `translate(${sx}px, ${sy}px) scale(1) rotate(-8deg)`, opacity: 1, offset: .12, easing: "steps(8)" },
      { transform: `translate(${mx}px, ${my}px) scale(1.1) rotate(6deg)`, opacity: 1, offset: .55, easing: "steps(8)" },
      { transform: `translate(${ex}px, ${ey}px) scale(1) rotate(0deg)`, opacity: toEl ? 1 : 0, offset: .92 },
      { transform: `translate(${ex}px, ${ey}px) scale(.8) rotate(0deg)`, opacity: 0 },
    ], { duration: 1200, fill: "both" });
    const catchIt = toEl?.animate([{ transform: "scale(1)" }, { transform: "scale(1.22) rotate(-4deg)" }, { transform: "scale(1)" }], { duration: 420, delay: 1050, easing: "steps(4)" });
    return () => { flight.cancel(); catchIt?.cancel(); };
  }, [handoffN, handoffFrom, handoffTo]);
  const shownIndex = picked && picked.during === active ? picked.index : active;
  const reader = shownIndex >= 0 ? readers[shownIndex] : null;
  const profile = reader ? AGENT_PROFILES[reader.name] : null;
  const state = reader ? stateOf(shownIndex, active, completed) : "waiting";
  const entry = reader ? activities?.[reader.name] : undefined;
  const shown: Mode = entry?.mode ?? mode;
  const lanes = reader && state !== "waiting" ? laneViews(reader.name, shown, entry) : [];
  const summary = state === "done" ? summaryOf(shown, entry) : [];
  const note = reader ? agents[shownIndex]?.note : undefined;
  // Rules mode lists its fixed steps. Live mode lists only the tools the reader really called.
  const chips: Ability[] = reader && profile ? (shown === "live" ? (entry?.order ?? []).flatMap((id) => profile.abilities.filter((item) => item.id === id && item.kind !== "rules")) : abilitiesFor(reader.name, "rules")) : [];
  return <div className="rd">
    <div className="rd-flight">
    <ol className={"rd-steps" + (handoff ? " is-running" : "")} ref={stepsRef} aria-label="The four readers, in run order">
      {readers.map((item, index) => {
        const itemState = stateOf(index, active, completed);
        const open = index === shownIndex;
        const fact = AGENT_FACTS[index];
        const itemEntry = activities?.[item.name];
        const itemMode: Mode = itemEntry?.mode ?? mode;
        const body = <>
          <span className="rd-top">
            <span className="rd-ava"><PixelAgent kind={item.kind} /></span>
            <span className="rd-id">
              <span className="rd-name">{item.name}<span className="sr-only"> ({stateWord[itemState]})</span></span>
              {itemState !== "done" && <span className="rd-status" aria-hidden="true"><i className="rd-dot" />{stateWord[itemState]}{itemState === "active" && <span className="rd-dots"><i>.</i><i>.</i><i>.</i></span>}</span>}
            </span>
          </span>
          <span className="rd-tag">{fact.tagline.join("")}</span>
        </>;
        return <li key={item.kind} className={"rd-step " + item.kind + " " + itemState + (open ? " shown" : "")} data-mode={itemMode} data-state={itemState} aria-current={itemState === "active" ? "step" : undefined}>
          {itemState === "waiting" ? <div className="rd-btn">{body}</div>
            : <button type="button" className="rd-btn" aria-expanded={open} aria-controls={panelId} onClick={() => setPicked({ index: open ? -1 : index, during: active })}>{body}</button>}
          <ul className="rd-move-list" aria-label={item.name + " moves"}>
            {fact.moves.map((move) => <li key={move.label} className="rd-move">
              <span className="rd-mi"><Icon src={BASE_PATH + "/assets/icons/abilities/" + move.icon} /></span>
              <span className="rd-mt"><b className="rd-ml">{move.label}</b><span className="rd-md">{move.detail}</span></span>
            </li>)}
          </ul>
          {/* The details open as a panel over the page (top layer), on hover, focus or click, so a card never changes height. The prompt file peeks the same way. */}
          <div className="rd-foot">
          <button type="button" className="rd-more" aria-haspopup="dialog" onClick={() => setDetails(index)}>
            <span>Strengths, limits &amp; tools</span><span aria-hidden="true">→</span>
          </button>
          <PromptPeek name={item.name} model={model} />
          </div>
          {usage && <CardCoins row={usage.find((row) => row.agent === item.name)} working={itemState === "active"} />}
        </li>;
      })}
    </ol>
    <span className="rd-paper" ref={paperRef} aria-hidden="true"><PixelIcon name="report" size={22} /></span>
    </div>
    {details !== null && readers[details] && <Popup open onClose={() => setDetails(null)} title={readers[details].name + ": strengths, limits and tools"} icon={<PixelIcon name="report" size={22} />} wide>
      <AgentDetails name={readers[details].name} fact={AGENT_FACTS[details]} mode={activities?.[readers[details].name]?.mode ?? mode} />
    </Popup>}
    {usage && <RunTotal rows={usage} done={completed >= readers.length} />}
    {reader && profile && <div className={"rd-panel " + reader.kind} id={panelId} aria-live="polite" aria-atomic="false" aria-relevant="additions text">
      <h3>{reader.name}</h3>
      <p className="rd-job">{profile.job}</p>
      {chips.length > 0 && <ul className="rd-chips" aria-label={reader.name + " abilities"}>
        {chips.map((ability) => {
          const lane = entry?.lanes[ability.id];
          return <li key={ability.id} className={"rd-chip" + (lane ? (lane.status === "done" ? " used" : " using") : "")}>
            <Icon src={BASE_PATH + "/assets/icons/abilities/" + ability.iconFile} />
            <span>{ability.label}</span>
            {ability.kind === "web" && <span className="rd-web"><span className="sr-only">(from the web)</span></span>}
          </li>;
        })}
      </ul>}
      {lanes.length > 0 && <ul className="rd-lanes" aria-label={reader.name + " progress"}>
        {lanes.map((lane) => <li key={lane.id} className={"rd-lane " + lane.status + (lane.progress === null ? " unknown" : "")}>
          <span className="rd-lane-label">{lane.label}</span>
          <span className="rd-bar" role="progressbar" aria-label={lane.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={lane.progress ?? undefined} aria-valuetext={lane.detail}>
            <i style={{ width: (lane.progress ?? 18) + "%" }} />
          </span>
          {lane.detail && <span className="rd-lane-detail">{lane.detail}</span>}
        </li>)}
      </ul>}
      {state === "active" && entry && entry.log.length > 0 && <ol className="rd-log" aria-label={reader.name + " activity log"}>
        {entry.log.map((line) => <li key={line.id}>{line.text}</li>)}
      </ol>}
      {summary.length > 0 && <p className="rd-summary"><span>Summary:</span> {summary.join(", ")}</p>}
      <p className="rd-finding">{note ? note : state === "active" ? <>Working… <Elapsed key={shownIndex} /></> : "Waiting"}{state === "active" && note ? <span className="caret" aria-hidden="true">▌</span> : null}</p>
    </div>}
    <ResultFlow active={active} completed={completed} />
  </div>;
}

/** The hero-point pattern (icon, bold lead, one short line) from clarity.css. */
const Point = ({ icon, lead, text }: { icon: string; lead: string; text: string }) => <div className="cl-item">
  <span className="cl-icon" aria-hidden="true">{icon}</span>
  <p className="cl-text"><strong className="cl-lead">{lead}</strong>{text}</p>
</div>;

const Section = ({ title, tag, children }: { title: string; tag?: string; children: ReactNode }) => <section className="rdp-sec">
  <h3 className="rdp-h">{title}{tag ? <span className="rdp-use">{tag}</span> : null}</h3>
  {children}
</section>;

/** Everything about one agent that the card face leaves out, laid out in the popup. The "in use" tag follows the mode that ran (or will run). */
function AgentDetails({ name, fact, mode }: { name: ReaderName; fact: AgentFact; mode: Mode }) {
  const web = hasWeb(fact), resume = fact.resumeAccess;
  return <div className="rdp">
    <div className="rdp-two">
      <div className="rdp-box good"><Point icon="✓" lead="Strong at" text={fact.strongAt} /></div>
      <div className="rdp-box bad"><Point icon="✕" lead="Can't do" text={fact.cant} /></div>
    </div>
    <Section title="Limits">
      <ul className="rdp-limits" aria-label={name + " limits"}>
        <li><span className="rdp-k">Tool calls</span><span className="rd-meter" aria-hidden="true"><i style={{ "--v": fact.toolCalls / MAX_CALLS } as CSSProperties} /></span><span className="rdp-v">{fact.toolCalls ? "up to " + fact.toolCalls : "none"}</span></li>
        <li><span className="rdp-k">Time</span><span className="rd-meter" aria-hidden="true"><i style={{ "--v": fact.seconds / MAX_SECONDS } as CSSProperties} /></span><span className="rdp-v">{fact.seconds} s max</span></li>
        <li><span className="rdp-k">Access</span><span className="rdp-pips">
          <span className={"rd-pip " + (web ? "yes" : "no")}>Web {web ? "yes" : "no"}</span>
          <span className={"rd-pip " + (resume ? "yes" : "no")}>Résumé {resume ? "yes" : "no"}</span>
        </span></li>
      </ul>
    </Section>
    <Section title="Tools" tag={mode === "live" ? "in use" : undefined}>
      {fact.tools.length === 0 ? <p className="rdp-plain">No tools. It reads only the text it gets.</p> : <ul className="rdp-tools" aria-label={name + " API boost tools"}>
        {fact.tools.map((tool) => <li key={tool.name}>
          <span className="rd-api" aria-hidden="true">API</span>
          <span className="rdp-tool"><span className="rd-mono">{tool.name}{tool.cap ? <span className="rd-cap"> ×{tool.cap}</span> : null}</span><span>{tool.label}</span></span>
        </li>)}
      </ul>}
    </Section>
    <Section title="Native scan" tag={mode === "rules" ? "in use" : undefined}>
      <ol className="rdp-steps" aria-label={name + " native scan steps"}>{abilitiesFor(name, "rules").map((ability) => <li key={ability.id}>{ability.label}</li>)}</ol>
      <p className="rdp-plain">The same moves, done by built-in text matching. No API key needed.</p>
    </Section>
    <div className="rdp-two">
      <div className="rdp-box"><h3 className="rdp-h">Sees</h3><p className="rdp-plain">{fact.sees}</p></div>
      <div className="rdp-box"><h3 className="rdp-h">Returns</h3><p className="rdp-plain">{fact.returns}</p></div>
    </div>
  </div>;
}

const flowState: Record<State, string> = { waiting: "waiting", active: "working", done: "done" };

// Drawn in real pixels: FlowSvg measures its own size, so the arrows keep their shape at any width. Each reader gets its own straight pipe. The svg is half a card gap wider than the
// card row on each side, so a card's centre sits at an odd eighth of the svg width. The pipe runs in two pieces: "top" (a socket on each reader card and a short drop, drawn here) and
// "bottom" (the rest, behind the results headline, ending in an arrow on that reader's own result card, drawn by SynthesisDashboard).
const SOCKET_Y = 2, TOP_H = 30, ARROW_H = 15;
const FRACS = [1 / 8, 3 / 8, 5 / 8, 7 / 8];

/** One pipe: a white halo, the pale track, an inner shade, the core line, then the XP orbs (a dotted overlay that CSS slides along it). */
const Pipe = ({ d, state, delay }: { d: string; state: State; delay?: number }) => <g className={"rf-pipe " + flowState[state]} style={delay ? { "--d": delay + "s" } as CSSProperties : undefined}>
  <path className="rf-halo" d={d} />
  <path className="rf-edge" d={d} />
  <path className="rf-inner" d={d} />
  <path className="rf-core" d={d} />
  <path className="rf-orb-rim" d={d} />
  <path className="rf-orb" d={d} />
  <path className="rf-orb-core" d={d} />
</g>;

function FlowSvg({ states, kind }: { states: State[]; kind: "top" | "bottom" }) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 1200, h: kind === "top" ? TOP_H : 96 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width * 10) / 10, h = Math.round(entry.contentRect.height);
      if (w > 0 && h > 0) setSize((now) => now.w === w && now.h === h ? now : { w, h });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const { w, h } = size;
  const start = kind === "top" ? SOCKET_Y : 0, stop = kind === "bottom" ? h - ARROW_H : h;
  return <svg ref={ref} className={"rf-svg rf-" + kind} viewBox={"0 0 " + w + " " + h} focusable="false">
    {states.map((state, i) => {
      const x = FRACS[i] * w;
      return <g key={i}>
        <Pipe state={state} delay={-i * 0.37} d={"M" + x + " " + start + "V" + stop} />
        {kind === "top"
          ? <g className={"rf-node rf-socket " + flowState[state]}><circle className="rf-ring" cx={x} cy={SOCKET_Y} r={7.5} /><circle className="rf-dot" cx={x} cy={SOCKET_Y} r={3} /></g>
          : <g className={"rf-port " + flowState[state]}>
            <path className="rf-tri" d={"M" + (x - 12) + " " + (stop - 3) + "H" + (x + 12) + "L" + x + " " + (h - 1) + "Z"} />
            <path className="rf-chev" d={"M" + (x - 4.5) + " " + (stop + 1) + "L" + x + " " + (stop + 5.5) + "L" + (x + 4.5) + " " + (stop + 1)} />
          </g>}
      </g>;
    })}
  </svg>;
}

/**
 * Decorative "XP flowing" pipes, one per reader, drawn only where the four reader cards sit above the four result cards (four across). Each pipe is a pale track with a bright core.
 * A done reader streams lime XP orbs, a working one sends a slow single orb along a dimmer pipe, a waiting one is a dashed empty pipe with a hollow socket or arrow.
 * Motion is CSS only and off under reduced motion, where the orbs sit still. aria-hidden. "top" sits under the reader cards; SynthesisDashboard draws "bottom".
 */
export function ResultFlow({ active, completed, kind = "top" }: { active: number; completed: number; kind?: "top" | "bottom" }) {
  const states = readers.map((_, index) => stateOf(index, active, completed));
  return <div className={"rf rf-" + kind} aria-hidden="true"><FlowSvg states={states} kind={kind} /></div>;
}

"use client";

import { BASE_PATH } from "@/lib/base-path";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Popup } from "@/components/popup";
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
  const done = entry.order.map((id) => entry.lanes[id]).filter((lane) => lane.status === "done");
  return shown === "live" ? done.map((lane) => (lane.calls > 1 ? `${lane.label} ×${lane.calls}` : lane.label)) : done.flatMap((lane) => (lane.detail ? [lane.detail] : []));
}

// Spoken status for screen readers. Sighted users get the status from motion and card styling only.
const stateWord: Record<State, string> = { waiting: "Waiting", active: "Working", done: "Done" };

/**
 * The four readers as plain cards in run order (avatar, name and a status chip, one "what it does" line, three moves with a label and one line each, and a "Strengths, limits & tools" button that opens a popup with the bars, access and tools; from lib/agent-facts.ts). The cards share row lines (a CSS subgrid), so the header, line, each move and the button line up across all four. Status is a dot, a short word and the avatar's motion, plus text for screen readers. The panel shows the reader that is working; once the run is over no panel is
 * open until the visitor clicks a finished step (click it again to close). Under the steps and the panel an elbow connector starts:
 * one line down from each reader, joined by a bus line, then one arrow into the dashboard. activities is the latest state per
 * agent and lane (see applyActivity); mode picks which abilities to list until activity arrives. Both are optional.
 */
export function ReaderCards({ agents, active, completed, activities, mode = "rules" }: { agents: AgentNote[]; active: number; completed: number; activities?: ActivityState; mode?: Mode }) {
  // A pick only holds while the same reader is running (or while nothing runs: during is -1), so the panel follows the run again at the next handoff. index -1 means closed.
  const [picked, setPicked] = useState<{ index: number; during: number } | null>(null);
  const panelId = useId();
  // The details popup is a modal <dialog>, so opening it never changes the height of a card.
  const [detail, setDetail] = useState<number | null>(null);
  const closeDetail = useCallback(() => setDetail(null), []);
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
    <ol className="rd-steps" aria-label="The four readers, in run order">
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
              <span className="rd-status" aria-hidden="true"><i className="rd-dot" />{stateWord[itemState]}{itemState === "active" && <span className="rd-dots"><i>.</i><i>.</i><i>.</i></span>}</span>
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
          <button type="button" className="rd-more" aria-haspopup="dialog" onClick={() => setDetail(index)}>
            <span>Strengths, limits &amp; tools</span>
            <span aria-hidden="true">→</span>
          </button>
        </li>;
      })}
    </ol>
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
      <p className="rd-finding">{note ? note : state === "active" ? "Working…" : "Waiting"}{state === "active" && note ? <span className="caret" aria-hidden="true">▌</span> : null}</p>
    </div>}
    <ResultFlow active={active} completed={completed} />
    <Popup open={detail !== null} onClose={closeDetail} title={detail !== null ? readers[detail].name + ": strengths, limits and tools" : "Details"} wide>
      {detail !== null && <AgentDetails name={readers[detail].name} fact={AGENT_FACTS[detail]} mode={activities?.[readers[detail].name]?.mode ?? mode} />}
    </Popup>
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
    <Section title="Moves">
      <ul className="rdp-moves" aria-label={name + " moves"}>
        {fact.moves.map((move) => <li key={move.label}><b>{move.label}</b> {move.detail}</li>)}
      </ul>
    </Section>
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
const RANK: Record<State, number> = { waiting: 0, active: 1, done: 2 };

// Drawn in real pixels: FlowSvg measures its own width, so the elbows keep a true radius at any card width. Each leg starts at the centre of a card column (a fraction of the SVG width,
// since the SVG is half a card gap wider than the cards on each side). Socket on the card edge, leg down to the bus, bus to the junction at the middle, stem down to the arrow port.
const FLOW_H = 76, SOCKET_Y = 2, BUS = 28, BEND = 12, STEM_END = FLOW_H - 15;
// Four cards in a row: a leg under each. Cards in a 2x2 grid: only the bottom row (readers 3 and 4) sits above the connector. One column: only the last card (reader 4).
const ROW = { cls: "rf-row", from: 0, frac: [1 / 8, 3 / 8, 5 / 8, 7 / 8] };
const GRID = { cls: "rf-grid", from: 2, frac: [1 / 4, 3 / 4] };
const COL = { cls: "rf-col", from: 3, frac: [1 / 2] };

/** One pipe: a white halo, the pale track, an inner shade, the core line, then the XP orbs (a dotted overlay that CSS slides along it). */
const Pipe = ({ d, state, className, delay }: { d: string; state: State; className?: string; delay?: number }) => <g className={"rf-pipe " + flowState[state] + (className ? " " + className : "")} style={delay ? { "--d": delay + "s" } as CSSProperties : undefined}>
  <path className="rf-halo" d={d} />
  <path className="rf-edge" d={d} />
  <path className="rf-inner" d={d} />
  <path className="rf-core" d={d} />
  <path className="rf-orb-rim" d={d} />
  <path className="rf-orb" d={d} />
  <path className="rf-orb-core" d={d} />
  {className === "rf-stem" && <path className="rf-pulse" d={d} />}
</g>;

function FlowSvg({ cls, from, frac, states, stem }: { cls: string; from: number; frac: number[]; states: State[]; stem: State }) {
  const ref = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(1200);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => { const next = Math.round(entry.contentRect.width * 10) / 10; if (next > 0) setWidth(next); });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const mid = width / 2, single = frac.length === 1;
  const legs = frac.map((f, i) => ({ x: f * width, state: states[from + i], i })).sort((a, b) => RANK[a.state] - RANK[b.state]); // done legs paint last, on top of the shared bus
  const stemTop = single ? SOCKET_Y : BUS;
  const arrow = "M" + (mid - 12) + " " + (STEM_END - 3) + "H" + (mid + 12) + "L" + mid + " " + (FLOW_H - 1) + "Z";
  return <svg ref={ref} className={"rf-svg " + cls} viewBox={"0 0 " + width + " " + FLOW_H} focusable="false">
    {!single && legs.map(({ x, state, i }) => {
      const dir = x < mid ? 1 : -1;
      return <Pipe key={x} state={state} delay={-i * 0.37} d={"M" + x + " " + SOCKET_Y + "V" + (BUS - BEND) + "Q" + x + " " + BUS + " " + (x + dir * BEND) + " " + BUS + "H" + mid} />;
    })}
    <Pipe state={stem} className="rf-stem" d={"M" + mid + " " + stemTop + "V" + STEM_END} />
    {!single && <g className={"rf-node " + flowState[stem]}><circle className="rf-ring" cx={mid} cy={BUS} r={9} /><circle className="rf-dot" cx={mid} cy={BUS} r={4} /></g>}
    {frac.map((f, i) => <g key={f} className={"rf-node rf-socket " + flowState[states[from + i]]}><circle className="rf-ring" cx={f * width} cy={SOCKET_Y} r={7.5} /><circle className="rf-dot" cx={f * width} cy={SOCKET_Y} r={3} /></g>)}
    <g className={"rf-port " + flowState[stem]}>
      <path className="rf-tri" d={arrow} />
      <path className="rf-chev" d={"M" + (mid - 4.5) + " " + (STEM_END + 1) + "L" + mid + " " + (STEM_END + 5.5) + "L" + (mid + 4.5) + " " + (STEM_END + 1)} />
    </g>
  </svg>;
}

/**
 * Decorative "XP flowing" connector under the four cards: a socket on each card, a pipe down and across to a junction, one pipe down into an arrow port on the result card.
 * Each pipe is a pale track with a bright core. A done reader streams lime XP orbs, a working one sends a slow single orb along a dimmer pipe, a waiting one is a dashed empty pipe
 * and a hollow socket. The shared stem gets denser as more readers finish (data-lit). Motion is CSS only and off under reduced motion, where the orbs sit still. aria-hidden.
 */
export function ResultFlow({ active, completed }: { active: number; completed: number }) {
  const states = readers.map((_, index) => stateOf(index, active, completed));
  const lit = states.filter((state) => state === "done").length;
  const stem: State = lit > 0 ? "done" : states.includes("active") ? "active" : "waiting";
  return <div className={"rf " + flowState[stem]} data-lit={lit} aria-hidden="true">{[ROW, GRID, COL].map((layout) => <FlowSvg key={layout.cls} {...layout} states={states} stem={stem} />)}</div>;
}

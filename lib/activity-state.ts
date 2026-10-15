import type { Mode } from "./agent-abilities.ts";
import type { ActivityEvent, ReaderName } from "./simulated-engine.ts";

/** Latest state of one progress lane. progress is null while a live tool call is running and its length is unknown. */
export type LaneState = {
  lane: string;
  label: string;
  status: "start" | "progress" | "done";
  progress: number | null;
  detail?: string;
  /** How many times this lane started (a live tool can be called more than once). */
  calls: number;
  simulated: boolean;
};
export type LogLine = { id: number; text: string };
export type AgentActivity = { mode: Mode; lanes: Record<string, LaneState>; /** Lanes in the order they first appeared. */ order: string[]; log: LogLine[]; seq: number };
export type ActivityState = Partial<Record<ReaderName, AgentActivity>>;

export const emptyActivity: ActivityState = {};
export const LOG_LINES = 4;

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

/** Folds one activity event into the per-agent, per-lane state. Pure: returns a new state. A change of mode (a live run that fell back to rules) starts that agent's lanes afresh. */
export function applyActivity(state: ActivityState, event: ActivityEvent): ActivityState {
  const mode: Mode = event.mode ?? (event.simulated ? "rules" : "live");
  const before = state[event.agent];
  const current: AgentActivity = before && before.mode === mode ? before : { mode, lanes: {}, order: [], log: [], seq: 0 };
  const last = current.lanes[event.lane];
  const progress = event.status === "done" ? 100 : event.progress !== undefined ? clamp(event.progress) : event.status === "start" ? null : (last?.progress ?? null);
  const lane: LaneState = {
    lane: event.lane,
    label: event.label,
    status: event.status,
    progress,
    detail: event.detail ?? (event.status === "start" ? undefined : last?.detail),
    calls: (last?.calls ?? 0) + (event.status === "start" ? 1 : 0),
    simulated: event.simulated,
  };
  const text = event.detail ? `${event.label}: ${event.detail}` : event.status === "start" ? event.label : "";
  const seq = current.seq + (text ? 1 : 0);
  return {
    ...state,
    [event.agent]: {
      mode,
      lanes: { ...current.lanes, [event.lane]: lane },
      order: last ? current.order : [...current.order, event.lane],
      log: text ? [...current.log, { id: seq, text }].slice(-LOG_LINES) : current.log,
      seq,
    },
  };
}

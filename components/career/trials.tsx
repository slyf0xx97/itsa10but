"use client";

import { useSyncExternalStore } from "react";
import type { Quest } from "@/lib/analysis-types";
import { PLANNER_MAX } from "@/lib/dashboard-data";

// Done ticks are a per-viewer convenience: a string of 0/1 per quest, keyed by a hash of the titles. Storage can throw
// (private windows, blocked data), so a memory copy keeps the page working either way.
const memory = new Map<string, string>();
const listeners = new Set<() => void>();
const subscribe = (notify: () => void) => { listeners.add(notify); return () => { listeners.delete(notify); }; };

function readTicks(key: string): string {
  const held = memory.get(key);
  if (held !== undefined) return held;
  try { return localStorage.getItem(key) ?? ""; } catch { return ""; }
}

function writeTicks(key: string, value: string) {
  memory.set(key, value);
  try { localStorage.setItem(key, value); } catch { /* the memory copy still holds for this visit */ }
  listeners.forEach((notify) => notify());
}

function storageKey(titles: string[]): string {
  let hash = 5381;
  for (const char of titles.join("\n")) hash = ((hash * 33) ^ char.codePointAt(0)!) >>> 0;
  return "itsa10but:quests:" + hash.toString(16);
}

/** Done ticks for the first quests, shared by every component that reads the same titles. */
export function useQuestTicks(quests: Quest[]) {
  const stops = quests.slice(0, PLANNER_MAX);
  const key = storageKey(stops.map((quest) => quest.title));
  const ticks = useSyncExternalStore(subscribe, () => readTicks(key), () => "");
  const isDone = (index: number) => ticks[index] === "1";
  const toggle = (index: number) => writeTicks(key, stops.map((_, i) => (i === index ? !isDone(i) : isDone(i)) ? "1" : "0").join(""));
  return { isDone, toggle, doneCount: stops.filter((_, index) => isDone(index)).length };
}

/** Wraps the first of `terms` found in `text` (case-insensitive, longest first) in the highlighter. */
export function Marked({ text, terms }: { text: string; terms: string[] }) {
  const term = terms.filter(Boolean).sort((a, b) => b.length - a.length).find((t) => text.toLowerCase().includes(t.toLowerCase()));
  if (!term) return <>{text}</>;
  const at = text.toLowerCase().indexOf(term.toLowerCase());
  return <>{text.slice(0, at)}<span className="hl">{text.slice(at, at + term.length)}</span>{text.slice(at + term.length)}</>;
}

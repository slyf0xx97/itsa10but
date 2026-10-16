"use client";
import { useEffect, useState } from "react";
import { SNAPSHOT_CHECKED, latestAi } from "@/lib/sg-snapshot";
import { checkedLabel, loadSnapshot } from "@/lib/snapshot-client";

/** The day of the last check and the AI list: the Worker's daily result when it has one, else the built-in snapshot. */
export function useSnapshot() {
  const [doc, setDoc] = useState<Awaited<ReturnType<typeof loadSnapshot>>>(null);
  useEffect(() => { let alive = true; loadSnapshot().then((next) => { if (alive) setDoc(next); }); return () => { alive = false; }; }, []);
  return { checked: checkedLabel(doc, SNAPSHOT_CHECKED), ai: doc?.ai.length ? doc.ai : latestAi };
}

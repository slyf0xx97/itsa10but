"use client";

import { useEffect, useState } from "react";
import { loadDemand, payLine } from "@/lib/demand-client";
import type { DemandTable } from "@/lib/edge/demand";

/**
 * What Singapore employers advertise for this role: a pay range from recent MyCareersFuture postings. It is context beside the result and never changes a score.
 * Shows nothing until the table has loaded, and nothing for a role it doesn't track.
 */
export function MarketNote({ roleTitle }: { roleTitle: string }) {
  const [table, setTable] = useState<DemandTable | null>(null);
  useEffect(() => {
    let live = true;
    void loadDemand().then((loaded) => { if (live) setTable(loaded); });
    return () => { live = false; };
  }, []);
  const line = payLine(table, roleTitle);
  if (!line) return null;
  return <section className="dp-sec" aria-label="What the role pays">
    <h5 className="dp-h">What it pays</h5>
    <p className="mkt-note"><span className="mkt-tag">Singapore</span>{line}</p>
  </section>;
}

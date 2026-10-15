"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { loadSkillNews, type SkillNewsResult } from "@/lib/skill-news-client";
import { catalogSkill } from "@/lib/skill-news";

type State = { kind: "loading" } | { kind: "ok"; result: SkillNewsResult } | { kind: "error"; message: string };

const clock = (iso: string) => { const date = new Date(iso); return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit" }); };

/**
 * Under a tip, behind a closed disclosure: the latest articles on the skill from our own feed reader. They load when this mounts, which is when the visitor
 * opens the disclosure, and again on Refresh. Only the skill name is sent. The free lessons for a skill are the resource cards in the tip itself.
 */
export function SkillRefs({ skill }: { skill: string }) {
  const id = useId();
  const name = catalogSkill(skill);
  const [state, setState] = useState<State>({ kind: "loading" });
  const latest = useRef(0);
  const gone = useRef(false);

  // A newer request, or closing the tip, makes an older answer a no-op.
  const fetchLatest = useCallback((force: boolean) => {
    const ticket = ++latest.current;
    loadSkillNews(skill, force).then(
      (result) => { if (!gone.current && ticket === latest.current) setState({ kind: "ok", result }); },
      (error: unknown) => { if (!gone.current && ticket === latest.current) setState({ kind: "error", message: error instanceof Error ? error.message : "The article lookup didn't work this time." }); },
    );
  }, [skill]);
  useEffect(() => { gone.current = false; if (name) fetchLatest(false); return () => { gone.current = true; }; }, [name, fetchLatest]);

  if (!name) return null;
  const loading = state.kind === "loading";
  const items = state.kind === "ok" ? state.result.items : [];
  const at = state.kind === "ok" ? clock(state.result.fetchedAt) : "";
  const status = loading ? `Looking for recent articles on ${name}…`
    : state.kind === "error" ? state.message
    : items.length ? `${items.length} recent ${items.length === 1 ? "article" : "articles"} found.${at ? ` Checked ${at}.` : ""}`
    : `No recent articles on ${name} in our feeds right now.`;

  return <div className="pl-refs">
    <div className="pl-refs-block">
      <div className="pl-refs-bar">
        <p className="pl-refs-h" id={id + "-latest"}>Latest on {name}</p>
        {/* aria-disabled, not disabled, so keyboard focus stays on the button while it works. */}
        <button type="button" className="btn quiet small" aria-disabled={loading} aria-label={`Refresh the latest articles on ${name}`} onClick={() => { if (!loading) { setState({ kind: "loading" }); fetchLatest(true); } }}>
          {loading ? <LoaderCircle className="spin" size={15} aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />} {loading ? "Refreshing…" : state.kind === "error" ? "Try again" : "Refresh"}
        </button>
      </div>
      <p className={"pl-refs-status" + (state.kind === "error" ? " is-problem" : "")} role="status" aria-live="polite">{status}</p>
      {items.length > 0 && <ul className="pl-refs-list" aria-labelledby={id + "-latest"}>
        {items.map((item) => <li key={item.url}>
          <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}<span className="sr-only"> (opens in a new tab)</span></a>
          <span className="pl-refs-meta">{[item.source, item.date].filter(Boolean).join(", ")}</span>
        </li>)}
      </ul>}
      <p className="pl-refs-note">Found with our own feed reader. No key was used.{state.kind === "ok" && state.result.cached ? " Reused from a lookup in the last 15 minutes." : ""}</p>
    </div>
  </div>;
}

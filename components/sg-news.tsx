"use client";
import { BASE_PATH } from "@/lib/base-path";
import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { allowedUrl, type NewsItem, type NewsMethod } from "@/lib/signals-news";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; items: NewsItem[]; fetchedAt: string; cached: boolean; method: NewsMethod; note: string }
  | { kind: "error"; message: string };

const METHOD_TEXT: Record<NewsMethod, string> = {
  native: "Found with our own feed reader. No key was used.",
  "native+firecrawl": "Found with our own feed reader plus a Firecrawl search.",
  firecrawl: "Found with a Firecrawl search.",
};
const when = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "just now" : date.toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short" });
};

/** Refresh button and the latest headlines. Headlines, dates and snippets are the sources' own words: nothing is summarised or turned into numbers. */
export function SgNews({ firecrawlKey = "" }: { firecrawlKey?: string }) {
  const id = useId();
  const [state, setState] = useState<State>({ kind: "idle" });
  const run = useRef<AbortController | null>(null);
  useEffect(() => () => run.current?.abort(), []);

  async function refresh() {
    run.current?.abort();
    const controller = new AbortController();
    run.current = controller;
    const timer = setTimeout(() => controller.abort(), 25000);
    setState({ kind: "loading" });
    try {
      const key = firecrawlKey.trim();
      const response = await fetch(BASE_PATH + "/api/signals", { method: "POST", cache: "no-store", signal: controller.signal, headers: key ? { "x-firecrawl-key": key } : {} });
      const data = (await response.json().catch(() => ({}))) as { items?: unknown; fetchedAt?: unknown; cached?: unknown; error?: unknown; method?: unknown; note?: unknown };
      if (!response.ok || !Array.isArray(data.items)) return setState({ kind: "error", message: typeof data.error === "string" ? data.error : "The news lookup didn't work this time. Try again in a few minutes." });
      // The server already filters to the allowlist. Check again before anything becomes a link.
      const items = (data.items as NewsItem[]).filter((item) => allowedUrl(item?.url) && typeof item.title === "string");
      const method = data.method === "native+firecrawl" || data.method === "firecrawl" ? data.method : "native";
      setState({ kind: "ok", items, method, fetchedAt: typeof data.fetchedAt === "string" ? data.fetchedAt : new Date().toISOString(), cached: data.cached === true, note: typeof data.note === "string" ? data.note : "" });
    } catch {
      if (run.current === controller) setState({ kind: "error", message: "The news lookup took too long or couldn't connect. Try again in a few minutes." });
    } finally {
      clearTimeout(timer);
    }
  }

  const loading = state.kind === "loading";
  const status = loading ? "Looking for newer headlines…"
    : state.kind === "ok" ? (state.items.length ? `${state.items.length} headline${state.items.length === 1 ? "" : "s"} found.` : "No matching headlines found.")
    : state.kind === "error" ? state.message
    : "";

  return <section className="sgs-news" aria-labelledby={id + "-h"}>
    <div className="sgs-news-bar">
      <h3 id={id + "-h"}>Latest news</h3>
      {/* aria-disabled, not disabled, so keyboard focus stays on the button while it works. */}
      <button type="button" className="btn quiet small" onClick={() => { if (!loading) void refresh(); }} aria-disabled={loading} aria-describedby={id + "-hint"}>
        {loading ? <LoaderCircle className="spin" size={15} aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />} {loading ? "Refreshing…" : state.kind === "error" ? "Try again" : "Refresh news"}
      </button>
    </div>
    <p id={id + "-hint"} className="sgs-note">Reads the feeds of the sites tagged In Refresh below. No key needed. A Firecrawl key in Agent power adds search results.</p>
    <p className={"sgs-status" + (state.kind === "error" ? " is-problem" : "")} role="status" aria-live="polite">{status}</p>
    {state.kind === "ok" && <div>
      <h4>Latest news, fetched {when(state.fetchedAt)}</h4>
      <p className="sgs-note">{METHOD_TEXT[state.method]}{state.cached ? " Reused from a lookup in the last 10 minutes." : ""}{state.note ? " " + state.note : ""}</p>
      {state.items.length === 0
        ? <p className="sgs-note">None of these sites had a matching story in the past month.</p>
        : <ul className="sgs-headlines">
          {state.items.map((item) => <li key={item.url}>
            <a href={allowedUrl(item.url)} target="_blank" rel="noopener noreferrer" aria-label={item.title + " (opens in a new tab)"}>{item.title}</a>
            <span className="sgs-meta"><span>{item.source}</span><span>{item.date || "Date not given"}</span></span>
            {item.snippet && <p>{item.snippet}</p>}
          </li>)}
        </ul>}
      <p className="sgs-note">These are the sources&apos; own headlines and snippets. We don&apos;t summarise them or pull numbers out of them.</p>
    </div>}
  </section>;
}

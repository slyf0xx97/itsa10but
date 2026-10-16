"use client";
import { BASE_PATH } from "@/lib/base-path";
import { useEffect, useId, useRef, useState } from "react";
import { allowedUrl, type NewsItem, type NewsMethod } from "@/lib/signals-news";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; items: NewsItem[]; fetchedAt: string; cached: boolean; method: NewsMethod; note: string }
  | { kind: "error"; message: string };

const when = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "just now" : date.toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short" });
};

/** The latest headlines, loaded once when the panel opens. The server keeps one shared copy for eight hours, so the list is as fresh as the last of about three daily reads. Headlines, dates and snippets are the sources' own words: nothing is summarised or turned into numbers. */
export function SgNews() {
  const id = useId();
  const [state, setState] = useState<State>({ kind: "loading" });
  const run = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    run.current = controller;
    const timer = setTimeout(() => controller.abort(), 25000);
    (async () => {
      try {
        const response = await fetch(BASE_PATH + "/api/signals", { signal: controller.signal });
        const data = (await response.json().catch(() => ({}))) as { items?: unknown; fetchedAt?: unknown; cached?: unknown; error?: unknown; method?: unknown; note?: unknown };
        if (!response.ok || !Array.isArray(data.items)) return setState({ kind: "error", message: typeof data.error === "string" ? data.error : "The news lookup didn't work this time. Try again later." });
        // The server already filters to the allowlist. Check again before anything becomes a link.
        const items = (data.items as NewsItem[]).filter((item) => allowedUrl(item?.url) && typeof item.title === "string");
        setState({ kind: "ok", items, method: "native", fetchedAt: typeof data.fetchedAt === "string" ? data.fetchedAt : new Date().toISOString(), cached: data.cached === true, note: typeof data.note === "string" ? data.note : "" });
      } catch {
        if (!controller.signal.aborted || run.current === controller) setState({ kind: "error", message: "The news lookup took too long or couldn't connect. Try again later." });
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => controller.abort();
  }, []);

  const status = state.kind === "loading" ? "Loading the latest headlines…"
    : state.kind === "ok" ? (state.items.length ? `${state.items.length} headline${state.items.length === 1 ? "" : "s"} found.` : "No matching headlines found.")
    : state.kind === "error" ? state.message
    : "";

  return <section className="sgs-news" aria-labelledby={id + "-h"}>
    <div className="sgs-news-bar"><h3 id={id + "-h"}>Latest news</h3></div>
    <p className={"sgs-status" + (state.kind === "error" ? " is-problem" : "")} role="status" aria-live="polite">{status}</p>
    {state.kind === "ok" && <div>
      <h4>Updated {when(state.fetchedAt)}</h4>
      <p className="sgs-note">Read from the sites&apos; own feeds about three times a day. No key was used.{state.note ? " " + state.note : ""}</p>
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

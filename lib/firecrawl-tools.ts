import { edgeCall, type Edge } from "./edge-client.ts";
import { safeJobUrl } from "./job-types.ts";

/**
 * Firecrawl over its REST API (KTD14 fallback: no MCP client dependency).
 * Every query and URL is validated before it is sent, page size and time are
 * capped, and failures come back as short error results that never carry the
 * request or response body.
 */
export type ToolResult = { ok: true; data: unknown } | { ok: false; error: string };
/** Optional narrowing for one search: hostnames to keep, a recency filter (for example "qdr:m") and a result count (1 to 20, default 5). */
export type SearchExtra = { includeDomains?: string[]; tbs?: string; limit?: number };
export type WebTools = {
  search(query: unknown, extra?: SearchExtra): Promise<ToolResult>;
  scrape(url: unknown): Promise<ToolResult>;
  /** Links this agent's own searches returned. */
  seen: Set<string>;
};

export const MAX_PAGE_CHARS = 6000;
const API = "https://api.firecrawl.dev/v2";
const text = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** With `edge`, lookups go through the Worker (native Wikipedia and direct page reads first, Firecrawl as its fallback, all cached). Without it they call Firecrawl directly. */
export function createWebTools(options: { apiKey?: string; allowScrape: boolean; fetchImpl?: typeof fetch; timeoutMs?: number; edge?: Edge }): WebTools {
  const seen = new Set<string>();
  const doFetch = options.fetchImpl ?? fetch;
  const post = async (path: string, body: unknown): Promise<{ ok: true; json: unknown } | { ok: false; error: string }> => {
    if (!options.apiKey) return { ok: false, error: "Web lookup is not available." };
    try {
      const response = await doFetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${options.apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
        cache: "no-store",
      });
      if (!response.ok) return { ok: false, error: `Web lookup failed (${response.status}).` };
      return { ok: true, json: await response.json() };
    } catch {
      return { ok: false, error: "Web lookup failed." };
    }
  };

  return {
    seen,
    async search(query, extra) {
      const q = text(query, 200);
      if (q.length < 3 || /https?:\/\//i.test(q)) return { ok: false, error: "Use a short plain search query." };
      const limit = Math.min(20, Math.max(1, Math.trunc(extra?.limit ?? 5) || 5));
      const hosts = (extra?.includeDomains ?? []).filter((host) => /^[a-z0-9.-]{3,100}$/.test(host)).slice(0, 12);
      const tbs = /^qdr:[hdwmy]$/.test(extra?.tbs ?? "") ? extra?.tbs : undefined;
      if (options.edge) {
        const answer = await edgeCall<{ ok?: boolean; results?: { title?: unknown; url?: unknown; snippet?: unknown }[] }>(options.edge, "/search", { q, limit }, { firecrawlKey: options.apiKey });
        if (!answer?.ok) return { ok: false, error: "Web lookup failed." };
        const results = (answer.results ?? []).flatMap((row) => {
          const url = safeJobUrl(row?.url);
          return url ? [{ title: text(row.title, 200), url, snippet: text(row.snippet, 300) }] : [];
        }).slice(0, limit);
        for (const result of results) seen.add(result.url);
        return { ok: true, data: { results } };
      }
      const response = await post("/search", { query: q, limit, ...(hosts.length ? { includeDomains: hosts } : {}), ...(tbs ? { tbs } : {}) });
      if (!response.ok) return response;
      const root = (response.json as { data?: unknown } | null)?.data;
      const rows = Array.isArray(root) ? root : (root as { web?: unknown } | null)?.web;
      type Row = { title?: unknown; url?: unknown; description?: unknown; snippet?: unknown };
      const results = (Array.isArray(rows) ? (rows as Row[]) : []).flatMap((row) => {
        const url = safeJobUrl(row?.url);
        return url ? [{ title: text(row.title, 200), url, snippet: text(row.description ?? row.snippet, 300) }] : [];
      }).slice(0, limit);
      for (const result of results) seen.add(result.url);
      return { ok: true, data: { results } };
    },
    async scrape(input) {
      if (!options.allowScrape) return { ok: false, error: "This tool is not available to you." };
      const url = safeJobUrl(input);
      if (!url || !seen.has(url)) return { ok: false, error: "Only a link from your own search results can be opened." };
      if (options.edge) {
        const answer = await edgeCall<{ ok?: boolean; title?: unknown; text?: unknown }>(options.edge, "/scrape", { url }, { firecrawlKey: options.apiKey, timeoutMs: 15000 });
        const body = typeof answer?.text === "string" ? answer.text.slice(0, MAX_PAGE_CHARS) : "";
        return answer?.ok && body ? { ok: true, data: { url, title: text(answer.title, 200), text: body } } : { ok: false, error: "The page had no readable text." };
      }
      const response = await post("/scrape", { url, formats: ["markdown"], onlyMainContent: true, timeout: 7000 });
      if (!response.ok) return response;
      const data = (response.json as { data?: { markdown?: unknown; metadata?: { title?: unknown } } } | null)?.data;
      const page = typeof data?.markdown === "string" ? data.markdown.slice(0, MAX_PAGE_CHARS) : "";
      if (!page) return { ok: false, error: "The page had no readable text." };
      return { ok: true, data: { url, title: text(data?.metadata?.title, 200), text: page } };
    },
  };
}

import { createWebTools, type WebTools } from "./firecrawl-tools.ts";
import { plainJobText, safeJobUrl } from "./job-types.ts";
import { createLimiter } from "./rate-limit.ts";
import { scrubKeys, type VisitorKeys } from "./visitor-keys.ts";

/**
 * Latest Singapore tech hiring headlines for the Refresh button and the MCP tool.
 * Two methods: our own feed reader (lib/native-scraper.ts, no key) and an optional Firecrawl search that adds results.
 * Fixed allowlist of hosts, plain text only. No model reads or rewrites anything:
 * a headline, its date, its source and the source's own snippet are shown as found.
 * This file stays free of Node-only imports because the browser uses allowedUrl and NEWS_SOURCES.
 */
export const NEWS_SOURCES = [
  { host: "imda.gov.sg", name: "IMDA" },
  { host: "mom.gov.sg", name: "MOM" },
  { host: "skillsfuture.gov.sg", name: "SkillsFuture Singapore" },
  { host: "jobsandskills.swda.gov.sg", name: "Jobs-Skills Portal" },
  { host: "straitstimes.com", name: "The Straits Times" },
  { host: "businesstimes.com.sg", name: "The Business Times" },
  { host: "channelnewsasia.com", name: "CNA" },
  { host: "hiringlab.indeed.com", name: "Indeed Hiring Lab" },
  { host: "vulcanpost.com", name: "Vulcan Post" },
  { host: "e27.co", name: "e27" },
] as const;
export const NEWS_HOSTS: string[] = NEWS_SOURCES.map((entry) => entry.host);
export const NEWS_QUERY = "Singapore tech hiring AI skills jobs";
export const NEWS_MAX_ITEMS = 8;
export const NEWS_TTL_MS = 10 * 60 * 1000;

export type NewsItem = { title: string; source: string; url: string; date: string; snippet: string };

/** The allowlist entry for a URL's host (exact host or a subdomain of it), or undefined. */
export function sourceFor(url: string) {
  let host = "";
  try { host = new URL(url).hostname.toLowerCase(); } catch { return undefined; }
  return NEWS_SOURCES.find((entry) => host === entry.host || host.endsWith("." + entry.host));
}

/** An https link on an allowlisted host with no login part and no fragment, else "". */
export function allowedUrl(value: unknown): string {
  const safe = safeJobUrl(value);
  if (!safe || !sourceFor(safe)) return "";
  const url = new URL(safe);
  url.hash = "";
  return url.toString();
}

/** Plain text only: tags, markdown links and control characters are removed, spaces collapsed, length capped. */
export function plainText(value: unknown, max: number): string {
  return plainJobText(value)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\p{Cc}+/gu, " ")
    .replace(/\s+/g, " ").trim().slice(0, max);
}

const DATE_PREFIX = /^((?:\d{1,2}|an?) (?:minute|hour|day|week|month|year)s? ago|[A-Z][a-z]{2} \d{1,2}, \d{4}|\d{1,2} [A-Z][a-z]{2} \d{4})\s*[·|:]\s*/;

/** Search snippets often start with the source's own date ("3 days ago · ..."). Split it off. */
export function splitDate(snippet: string): { date: string; rest: string } {
  const match = DATE_PREFIX.exec(snippet);
  return match ? { date: match[1], rest: snippet.slice(match[0].length) } : { date: "", rest: snippet };
}

/** Shapes raw search rows into display items: allowlisted links only, one per link, plain text, capped. */
export function shapeNewsItems(rows: unknown, max = NEWS_MAX_ITEMS): NewsItem[] {
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  const items: NewsItem[] = [];
  for (const row of rows as { title?: unknown; url?: unknown; snippet?: unknown }[]) {
    const url = allowedUrl(row?.url);
    const title = plainText(row?.title, 160);
    if (!url || !title || seen.has(url)) continue;
    seen.add(url);
    const { date, rest } = splitDate(plainText(row?.snippet, 300));
    items.push({ title, source: sourceFor(url)?.name ?? "", url, date: date.slice(0, 30), snippet: rest.slice(0, 240) });
    if (items.length >= max) break;
  }
  return items;
}

export async function fetchNews(tools: Pick<WebTools, "search">): Promise<{ ok: true; items: NewsItem[] } | { ok: false }> {
  const result = await tools.search(NEWS_QUERY, { includeDomains: NEWS_HOSTS, tbs: "qdr:m", limit: 12 });
  if (!result.ok) return { ok: false };
  return { ok: true, items: shapeNewsItems((result.data as { results?: unknown } | null)?.results) };
}

export function createNewsCache(ttlMs = NEWS_TTL_MS, now: () => number = Date.now) {
  let entry: { at: number; items: NewsItem[] } | undefined;
  return {
    get: () => (entry && now() - entry.at < ttlMs ? entry : undefined),
    set: (items: NewsItem[]) => (entry = { at: now(), items }),
  };
}

// Visitor-key refreshes spend the visitor's Firecrawl credits. Site-key refreshes spend the site's, so they get a daily cap.
const makeOwn = () => createLimiter({ perVisitorMax: 10, perVisitorWindowMs: 60 * 60 * 1000, dailyCap: Number.POSITIVE_INFINITY });
const makeSite = () => createLimiter({ perVisitorMax: 4, perVisitorWindowMs: 60 * 60 * 1000, dailyCap: 60 });
// The native reader costs no key, only a few requests to public feeds, so it gets a looser per-visitor limit and no daily cap. The cache absorbs repeats.
const makeNative = () => createLimiter({ perVisitorMax: 12, perVisitorWindowMs: 60 * 60 * 1000, dailyCap: Number.POSITIVE_INFINITY });
let sharedLimits: { own: ReturnType<typeof makeOwn>; site: ReturnType<typeof makeSite>; native: ReturnType<typeof makeNative> } | undefined;
let sharedCache: ReturnType<typeof createNewsCache> | undefined;
let sharedNativeCache: ReturnType<typeof createNewsCache> | undefined;

export const NEWS_MERGED_MAX = 12;
export type NewsMethod = "native" | "native+firecrawl" | "firecrawl";
/** Reads the feeds. `ok` is how many answered. Passed in by the route so this file stays browser-safe. */
export type NativeReader = (max: number) => Promise<{ items: NewsItem[]; ok: number; total: number }>;

type Take = { take(visitor: string): ReturnType<ReturnType<typeof makeOwn>["take"]> };
export type RefreshInput = {
  keys: VisitorKeys;
  env: Record<string, string | undefined>;
  /** From visitorKey(headers): the platform client address, never a client-set header. */
  visitor: string;
  fetchImpl?: typeof fetch;
  /** Our own feed reader. Without it only the Firecrawl search can run. */
  native?: NativeReader;
  limits?: { own: Take; site: Take; native?: Take };
  /** Cache for the Firecrawl search. */
  cache?: ReturnType<typeof createNewsCache>;
  nativeCache?: ReturnType<typeof createNewsCache>;
};
export type RefreshOutput = { status: number; body: Record<string, unknown> };

const limitMessage = (reason: string) => (reason === "daily" ? "Today's live news lookups are used up. Try again tomorrow." : "You have refreshed a lot. Try again in a little while.");

/**
 * One refresh, shared by POST /api/signals and the MCP tool. Order: the native feed reader (no key,
 * short cache, per-visitor limit), then a Firecrawl search only when the visitor supplied their own key. Firecrawl results are added to the native ones. Bodies carry no key and no error text from the web.
 */
export async function refreshNews(input: RefreshInput): Promise<RefreshOutput> {
  const { keys, visitor } = input;
  // The site's own Firecrawl key is never used for news: only a visitor's own key can add a Firecrawl search.
  const apiKey = keys.firecrawl;
  if (!apiKey && !input.native) return { status: 403, body: { needsKey: true, error: "Add a Firecrawl key in Agent power to fetch live news." } };

  const limits = input.limits ?? (sharedLimits ??= { own: makeOwn(), site: makeSite(), native: makeNative() });
  let native: { items: NewsItem[]; at: number } | undefined;
  let nativeCached = false;
  let nativeProblem = "";
  if (input.native) {
    const cache = input.nativeCache ?? (sharedNativeCache ??= createNewsCache());
    const hit = cache.get();
    if (hit) { native = hit; nativeCached = true; }
    else {
      const taken = (limits.native ?? { take: () => ({ ok: true as const }) }).take(visitor);
      if (!taken.ok && !apiKey) return { status: 429, body: { error: limitMessage(taken.reason) } };
      if (taken.ok) {
        const read = await input.native(NEWS_MAX_ITEMS).catch(() => ({ items: [] as NewsItem[], ok: 0, total: 0 }));
        if (read.ok > 0) native = cache.set(read.items);
        else if (!apiKey) return { status: 502, body: { error: "The news lookup didn't work this time. Try again in a few minutes." } };
        else nativeProblem = "Our own feed reader got no answer this time.";
      }
    }
  }

  let boost: { items: NewsItem[]; at: number } | undefined;
  let boostCached = false;
  let boostProblem = "";
  if (apiKey) {
    const cache = input.cache ?? (sharedCache ??= createNewsCache());
    const hit = cache.get();
    if (hit) { boost = hit; boostCached = true; }
    else {
      const taken = (keys.firecrawl ? limits.own : limits.site).take(visitor);
      if (!taken.ok) boostProblem = limitMessage(taken.reason);
      else {
        const found = await fetchNews(createWebTools({ apiKey, allowScrape: false, fetchImpl: input.fetchImpl, timeoutMs: 8000 }));
        if (found.ok) boost = cache.set(found.items); else boostProblem = "The Firecrawl search didn't work this time.";
      }
    }
  }

  if (!native && !boost) {
    return boostProblem.startsWith("The Firecrawl") ? { status: 502, body: { error: "The news lookup didn't work this time. Try again in a few minutes." } } : { status: 429, body: { error: boostProblem } };
  }
  const seen = new Set<string>();
  const items = [...(native?.items ?? []), ...(boost?.items ?? [])].filter((item) => !seen.has(item.url) && !!seen.add(item.url)).slice(0, NEWS_MERGED_MAX);
  const method: NewsMethod = native && boost ? "native+firecrawl" : native ? "native" : "firecrawl";
  const at = Math.min(native?.at ?? Infinity, boost?.at ?? Infinity);
  const out = {
    items, method, fetchedAt: new Date(at).toISOString(),
    cached: (!native || nativeCached) && (!boost || boostCached),
    ...(native && boostProblem ? { note: boostProblem } : boost && nativeProblem ? { note: nativeProblem } : {}),
  };
  // Defence in depth: a supplied key can never appear in the reply.
  return { status: 200, body: JSON.parse(scrubKeys(JSON.stringify(out), keys)) };
}

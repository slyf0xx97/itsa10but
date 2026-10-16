import { catalog, hasTerm } from "./preview-analysis.ts";
import { createLimiter } from "./rate-limit.ts";
import { safeJobUrl } from "./job-types.ts";

/**
 * Recent articles for one skill, shown under each tip. They come from our own feed reader (lib/native-scraper.ts, no key,
 * no model) reading the tech and AI sites listed in lib/news-sites.ts. The request carries skill names only, checked against the
 * skill catalog, so no résumé or role text can travel with it. This file stays free of Node-only imports because the page
 * uses techUrl and the skill list.
 */
export type TechSource = { site: string; host: string; feed: string };
/** Each `site` and `host` must match a site in the "Tech and AI news feeds" group of lib/news-sites.ts (skill-news.test.ts checks it). */
export const TECH_SOURCES: readonly TechSource[] = [
  { site: "Hugging Face Blog", host: "huggingface.co", feed: "https://huggingface.co/blog/feed.xml" },
  { site: "Simon Willison's Weblog", host: "simonwillison.net", feed: "https://simonwillison.net/atom/everything/" },
  { site: "The Verge AI", host: "theverge.com", feed: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" },
  { site: "MIT Technology Review AI", host: "technologyreview.com", feed: "https://www.technologyreview.com/topic/artificial-intelligence/feed" },
  { site: "Import AI", host: "importai.substack.com", feed: "https://importai.substack.com/feed" },
  { site: "The Pragmatic Engineer", host: "newsletter.pragmaticengineer.com", feed: "https://newsletter.pragmaticengineer.com/feed" },
  { site: "Latent Space", host: "latent.space", feed: "https://www.latent.space/feed" },
];
/** The only hosts the tech reader will connect to. */
export const TECH_FEED_HOSTS: string[] = [...new Set(TECH_SOURCES.map((source) => new URL(source.feed).hostname))];

export const SKILL_NEWS_MAX = 3;
export const SKILL_NEWS_TTL_MS = 15 * 60 * 1000;
export const SKILL_NEWS_WINDOW_DAYS = 60;
export const SKILL_NEWS_MAX_BODY = 600;

/** The source row for a link: its host or a subdomain of it, else undefined. */
export function techSourceFor(url: string): TechSource | undefined {
  let host = "";
  try { host = new URL(url).hostname.toLowerCase(); } catch { return undefined; }
  return TECH_SOURCES.find((source) => host === source.host || host.endsWith("." + source.host));
}

/** An https link on a tech source's host with no login part and no fragment, else "". */
export function techUrl(value: unknown): string {
  const safe = safeJobUrl(value);
  if (!safe || !techSourceFor(safe)) return "";
  const url = new URL(safe);
  url.hash = "";
  return url.toString();
}

export type SkillArticle = { title: string; source: string; url: string; date: string };
/** A feed entry kept in the server cache. `snippet` is only used for matching and never sent to the page. */
export type TechEntry = { title: string; url: string; source: string; time: number; snippet: string };

export const SKILL_NAMES: string[] = catalog.map((seed) => seed.name);
/** The catalog's own spelling for a name, or undefined. Case and outer spaces are ignored. */
export const catalogSkill = (name: unknown): string | undefined =>
  typeof name === "string" ? SKILL_NAMES.find((known) => known.toLowerCase() === name.trim().toLowerCase()) : undefined;

// Some catalog terms are fine for reading a résumé but match everyday words in news ("react to", "the rest of", "present").
// They are dropped for article matching, and a few skills get extra terms in their place.
const NOISY = new Set(["react", "rest", "present", "report", "documentation", "writing", "network", "shell", "qa", "soc", "prediction", "exploratory", "incident", "triage", "sprint", "probability", "prototype", "usability", "vulnerability", "spreadsheet", "encryption", "firewall", "git", "java", "spark"]);
const EXTRA: Record<string, string[]> = { React: ["reactjs", "react.js", "react native"], "Incident response": ["incident response"] };

// Some catalog terms are résumé phrases ("served the model", "analysed * data"). They help read a résumé and mean nothing in a headline.
const SENTENCE = /\*|\b(?:the|a)\b/;

/** The catalog terms used to find articles for a skill. Empty for an unknown skill. */
export function skillTerms(skill: string): string[] {
  const seed = catalog.find((item) => item.name === skill);
  return seed ? [...seed.terms.filter((term) => !NOISY.has(term) && !SENTENCE.test(term)), ...(EXTRA[skill] ?? [])] : [];
}

/** How well an entry fits a skill: 2 for each term in the title, 1 for each term in the snippet. 0 means no match. */
export function skillScore(entry: Pick<TechEntry, "title" | "snippet">, skill: string): number {
  return skillTerms(skill).reduce((total, term) => total + (hasTerm(entry.title, term) ? 2 : hasTerm(entry.snippet, term) ? 1 : 0), 0);
}

/** An article must name the skill in its title, or use two different catalog terms in its text. One passing mention doesn't count. */
export const MIN_FIT = 2;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (time: number) => { const date = new Date(time); return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`; };

/** Up to `max` articles for a skill: best fit first, then newest. One per link. */
export function pickForSkill(entries: TechEntry[], skill: string, max = SKILL_NEWS_MAX): SkillArticle[] {
  const seen = new Set<string>();
  return entries
    .map((entry) => ({ entry, score: skillScore(entry, skill) }))
    .filter((row) => row.score >= MIN_FIT)
    .sort((a, b) => b.score - a.score || b.entry.time - a.entry.time)
    .filter(({ entry }) => !seen.has(entry.url) && !!seen.add(entry.url))
    .slice(0, max)
    .map(({ entry }) => ({ title: entry.title, source: entry.source, url: entry.url, date: day(entry.time) }));
}

export type SkillNewsBody = { ok: true; skills: string[] } | { ok: false; error: string };

/**
 * The request body must be JSON with one key, `skills`: 1 to 3 names from the skill catalog. Anything else is refused, so
 * nothing else can ride along with the request. Names come back in the catalog's own spelling, once each.
 */
export function parseSkillNewsBody(text: string): SkillNewsBody {
  const bad = (error: string): SkillNewsBody => ({ ok: false, error });
  if (text.length > SKILL_NEWS_MAX_BODY) return bad("That request is too large.");
  let body: unknown;
  try { body = JSON.parse(text); } catch { return bad("Send JSON with a skills list."); }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => key !== "skills")) return bad("Send only a skills list.");
  const skills = (body as { skills?: unknown }).skills;
  if (!Array.isArray(skills) || skills.length < 1 || skills.length > SKILL_NEWS_MAX) return bad(`Send 1 to ${SKILL_NEWS_MAX} skills.`);
  const known = skills.map(catalogSkill);
  if (known.some((name) => !name)) return bad("One of those skills isn't one we list.");
  return { ok: true, skills: [...new Set(known as string[])] };
}

export type TechRead = { entries: TechEntry[]; ok: number; total: number };
type Take = { take(visitor: string): { ok: true } | { ok: false; reason: string } };
type Cache = { at: number; read: TechRead } | undefined;

/** Per-visitor limit for article lookups. They cost no key and the cache absorbs repeats, so the limit is loose and has no daily cap. */
export const makeSkillNewsLimiter = () => createLimiter({ perVisitorMax: 20, perVisitorWindowMs: 60 * 60 * 1000, dailyCap: Number.POSITIVE_INFINITY });
let sharedLimit: ReturnType<typeof makeSkillNewsLimiter> | undefined;

export function createTechCache(ttlMs = SKILL_NEWS_TTL_MS, now: () => number = Date.now) {
  let entry: Cache;
  let inflight: Promise<TechRead> | undefined;
  return {
    /** The cached read, or one shared read in progress, or a new read from `load`. A read that reached no feed is not kept. */
    async get(load: () => Promise<TechRead>): Promise<{ read: TechRead; at: number; cached: boolean }> {
      if (entry && now() - entry.at < ttlMs) return { read: entry.read, at: entry.at, cached: true };
      inflight ??= load().finally(() => { inflight = undefined; });
      const read = await inflight;
      if (read.ok > 0 && entry?.read !== read) entry = { at: now(), read };
      return { read, at: entry?.read === read ? entry.at : now(), cached: false };
    },
  };
}
let sharedCache: ReturnType<typeof createTechCache> | undefined;

export type SkillNewsInput = {
  /** The raw request body text. */
  bodyText: string;
  /** From visitorKey(headers): the platform client address, never a client-set header. */
  visitor: string;
  /** Our own feed reader. Passed in by the route so this file stays browser-safe. */
  read: () => Promise<TechRead>;
  cache?: ReturnType<typeof createTechCache>;
  limit?: Take;
};
export type SkillNewsOutput = { status: number; body: Record<string, unknown> };

/**
 * One lookup for POST /api/skill-news. Order: request check (skill names only), per-visitor limit, then the cached
 * read of the tech feeds (one shared read every 15 minutes), then the per-skill filter. Replies hold titles, sources, dates and
 * links on the allowlisted hosts. No key is read, no model runs, and the web's error text never reaches the reply.
 */
export async function answerSkillNews(input: SkillNewsInput): Promise<SkillNewsOutput> {
  const parsed = parseSkillNewsBody(input.bodyText);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
  const taken = (input.limit ?? (sharedLimit ??= makeSkillNewsLimiter())).take(input.visitor);
  if (!taken.ok) return { status: 429, body: { error: "You have looked up a lot of articles. Try again in a little while." } };
  const cache = input.cache ?? (sharedCache ??= createTechCache());
  const got = await cache.get(() => input.read().catch(() => ({ entries: [], ok: 0, total: TECH_SOURCES.length }))).catch(() => undefined);
  if (!got || got.read.ok === 0) return { status: 502, body: { error: "The article lookup didn't work this time. Try Refresh in a few minutes." } };
  return {
    status: 200,
    body: {
      method: "native",
      fetchedAt: new Date(got.at).toISOString(),
      cached: got.cached,
      feeds: { ok: got.read.ok, total: got.read.total },
      results: Object.fromEntries(parsed.skills.map((skill) => [skill, pickForSkill(got.read.entries, skill)])),
    },
  };
}

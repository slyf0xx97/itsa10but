import { allowedUrl, plainText, sourceFor, type NewsItem } from "./signals-news.ts";
import { SKILL_NEWS_WINDOW_DAYS, TECH_FEED_HOSTS, TECH_SOURCES, techSourceFor, techUrl, type TechEntry, type TechRead } from "./skill-news.ts";

/**
 * Our own news reader. It needs no key. It fetches a fixed list of published RSS feeds (plus one public press-release
 * page), reads titles, links, dates and descriptions, and returns plain text. Server only: routes pass it in.
 *
 * Safety: https only, exact hosts from FEEDS, every redirect hop re-checked, a resolved address that is private,
 * loopback or link-local is refused, 6 second timeout, 1.5 MB read cap, content-type check, no cookies, and the
 * output holds no markup. Items link only to hosts in NEWS_SOURCES.
 * shortcut: the address is checked before fetch() resolves the name again, so DNS rebinding is not closed.
 * The hosts are fixed public publishers and the platform has no private network to reach. Pin the address with undici if that changes.
 */
export const USER_AGENT = "Itsa10but-news-reader/1.0 (career workspace; reads published RSS feeds; https://github.com/slyf0xx97/itsa10but)";
export const FETCH_TIMEOUT_MS = 6000;
export const MAX_BYTES = 1_500_000;
export const MAX_REDIRECTS = 3;
export const WINDOW_DAYS = 30;
export const PER_SOURCE_MAX = 3;

type Need = "both" | "work";
export type FeedSource = { url: string; kind: "rss" | "html"; need: Need; mustMention?: RegExp };

export const FEEDS: FeedSource[] = [
  { url: "https://www.straitstimes.com/news/singapore/rss.xml", kind: "rss", need: "both" },
  { url: "https://www.straitstimes.com/news/business/rss.xml", kind: "rss", need: "both" },
  { url: "https://www.channelnewsasia.com/rssfeeds/8395986", kind: "rss", need: "both" },
  { url: "https://www.channelnewsasia.com/rssfeeds/8395954", kind: "rss", need: "both" },
  { url: "https://www.businesstimes.com.sg/rss/singapore", kind: "rss", need: "both" },
  { url: "https://vulcanpost.com/feed/", kind: "rss", need: "both" },
  { url: "https://e27.co/index_wp.php/feed/", kind: "rss", need: "both" },
  { url: "https://hiringlab.indeed.com/feed/", kind: "rss", need: "work", mustMention: /singapore/i },
  { url: "https://www.mom.gov.sg/newsroom/press-releases", kind: "html", need: "work" },
];
/** The only hosts this module will connect to. */
export const FETCH_HOSTS: string[] = [...new Set(FEEDS.map((feed) => new URL(feed.url).hostname))];

/** True for an https URL with no login part and no custom port, on an exact host of `hosts` (FETCH_HOSTS unless the caller passes its own list). */
export function isFetchableUrl(value: string, hosts: string[] = FETCH_HOSTS): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && (url.port === "" || url.port === "443") && hosts.includes(url.hostname.toLowerCase());
  } catch { return false; }
}

/** Private, loopback, link-local, multicast, reserved or unparseable addresses. Anything we cannot read counts as private. */
export function isPrivateIp(address: string): boolean {
  const value = address.trim().toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value);
  if (v4) {
    const [a, b, c, d] = v4.slice(1).map(Number);
    if ([a, b, c, d].some((n) => n > 255)) return true;
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0 && c === 0) || (a === 198 && (b === 18 || b === 19));
  }
  if (!value.includes(":")) return true;
  const mappedDotted = /^(?:0{0,4}:){0,5}:?ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(value);
  if (mappedDotted) return isPrivateIp(mappedDotted[1]);
  const mappedHex = /^(?:0{0,4}:){0,5}:?ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(value);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16), lo = parseInt(mappedHex[2], 16);
    return isPrivateIp(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  if (value === "::" || value === "::1") return true;
  const first = (value.split(":")[0] || "0").padStart(4, "0");
  return /^f[cd]/.test(first) || /^fe[89ab]/.test(first) || first.startsWith("ff") || first === "0064" || (first === "2001" && /^2001:0?db8:/.test(value));
}

async function defaultResolve(host: string): Promise<string[]> {
  const { lookup } = await import("node:dns/promises");
  return (await lookup(host, { all: true })).map((entry) => entry.address);
}

export type ScraperDeps = { fetchImpl?: typeof fetch; resolve?: (host: string) => Promise<string[]>; now?: () => number; /** Hosts this call may connect to. Defaults to FETCH_HOSTS. */ hosts?: string[] };

async function readCapped(response: Response, max: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return (await response.text()).slice(0, max);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < max) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, max));
}

/** One guarded GET. Returns the body text, or null for anything unsafe or unusable. Never throws. */
export async function safeGet(start: string, kind: "rss" | "html", deps: ScraperDeps = {}): Promise<string | null> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const resolve = deps.resolve ?? defaultResolve;
  try {
    let current = start;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!isFetchableUrl(current, deps.hosts)) return null;
      const addresses = await resolve(new URL(current).hostname);
      if (!addresses.length || addresses.some(isPrivateIp)) return null;
      const response = await fetchImpl(current, {
        redirect: "manual", cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { "User-Agent": USER_AGENT, Accept: kind === "rss" ? "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9" : "text/html" },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel().catch(() => {});
        if (!location) return null;
        current = new URL(location, current).toString();
        continue;
      }
      const type = (response.headers.get("content-type") ?? "").toLowerCase();
      const typeOk = kind === "rss" ? /xml|rss|atom/.test(type) : type.includes("text/html");
      if (!response.ok || !typeOk) { await response.body?.cancel().catch(() => {}); return null; }
      return await readCapped(response, MAX_BYTES);
    }
    return null;
  } catch { return null; }
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—" };
function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : " ";
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });
}
/** A feed field as plain text: CDATA unwrapped or entities decoded, then all markup removed. */
function fieldText(raw: string | undefined, max: number): string {
  if (!raw) return "";
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(raw);
  const text = plainText(cdata ? cdata[1] : decodeEntities(raw), max * 2);
  return plainText(decodeEntities(text), max).replace(/[<>]/g, "");
}
const tagBody = (block: string, name: string) => new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(block)?.[1];

export type RawEntry = { title: string; url: string; time: number; snippet: string };

/** RSS 2.0 items and Atom entries. Anything that is not a feed gives []. */
export function parseFeed(xml: string): RawEntry[] {
  const entries: RawEntry[] = [];
  for (const match of xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const block = match[2];
    const atomLink = /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i.exec(block)?.[1];
    const link = fieldText(tagBody(block, "link"), 500) || (atomLink ? decodeEntities(atomLink) : "");
    const date = fieldText(tagBody(block, "pubDate") ?? tagBody(block, "dc:date") ?? tagBody(block, "published") ?? tagBody(block, "updated"), 60);
    entries.push({
      title: fieldText(tagBody(block, "title"), 160),
      url: link,
      time: Date.parse(date),
      snippet: fieldText(tagBody(block, "description") ?? tagBody(block, "summary") ?? tagBody(block, "content:encoded"), 300),
    });
  }
  return entries;
}

/** The MOM press-release list: each title link is followed by a <time datetime>. Other pages give []. */
export function parsePressList(html: string, base: string): RawEntry[] {
  const entries: RawEntry[] = [];
  for (const match of html.matchAll(/<h3[^>]*class="item-title"[^>]*>\s*<a[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,600}?<time[^>]*\bdatetime="([^"]+)"/gi)) {
    let url = "";
    try { url = new URL(decodeEntities(match[1]), base).toString(); } catch { /* skip the row */ }
    entries.push({ title: fieldText(match[2], 160), url, time: Date.parse(match[3]), snippet: "" });
  }
  return entries;
}

const WORK = /\b(jobs?|hiring|hires?|hired|talent|workforce|employ\w*|workers?|skills?|upskill\w*|reskill\w*|salar(?:y|ies)|wages?|layoffs?|lay-offs?|retrench\w*|recruit\w*|vacanc\w*|careers?|labou?r|graduates?|interns?\w*|manpower|job-?seekers?)\b/i;
const TECH = /\b(artificial intelligence|gen(?:erative)? ?ai|tech|technology|digital|software|data|cyber\w*|cloud|engineers?|developers?|machine learning|automation|startups?|semiconductors?)\b/i;
const TECH_CAPS = /\b(AI|IT)\b/;

/** Is this story about work, and about tech unless the source is already a labour source? */
export function isRelevant(text: string, need: Need): boolean {
  return WORK.test(text) && (need === "work" || TECH.test(text) || TECH_CAPS.test(text));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function formatDay(time: number): string {
  const date = new Date(time);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Cuts at a word boundary and adds an ellipsis when the text is longer than max. */
function clip(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

/** Filters, de-duplicates, orders newest first, caps each source and the total, and shapes the NewsItem rows. */
export function shapeEntries(groups: { source: FeedSource; entries: RawEntry[] }[], now: number, max: number): NewsItem[] {
  const oldest = now - WINDOW_DAYS * 86_400_000;
  const seen = new Set<string>();
  const found: (NewsItem & { time: number })[] = [];
  for (const { source, entries } of groups) {
    let kept = 0;
    for (const entry of [...entries].sort((a, b) => (b.time || 0) - (a.time || 0))) {
      const url = allowedUrl(entry.url);
      const haystack = entry.title + " " + entry.snippet;
      if (kept >= PER_SOURCE_MAX || !url || !entry.title || seen.has(url)) continue;
      if (!Number.isFinite(entry.time) || entry.time < oldest || entry.time > now + 86_400_000) continue;
      if (!isRelevant(haystack, source.need) || (source.mustMention && !source.mustMention.test(haystack))) continue;
      seen.add(url);
      kept += 1;
      found.push({ title: entry.title, source: sourceFor(url)?.name ?? "", url, date: formatDay(entry.time), snippet: clip(entry.snippet, 240), time: entry.time });
    }
  }
  return found.sort((a, b) => b.time - a.time).slice(0, max).map(({ time, ...item }) => { void time; return item; });
}

/** Reads every feed in parallel. `ok` is how many answered with something readable. */
export async function fetchNativeNews(max: number, deps: ScraperDeps = {}): Promise<{ items: NewsItem[]; ok: number; total: number }> {
  const now = (deps.now ?? Date.now)();
  const groups = await Promise.all(FEEDS.map(async (source) => {
    const body = await safeGet(source.url, source.kind, deps);
    const entries = body === null ? null : source.kind === "rss" ? parseFeed(body) : parsePressList(body, source.url);
    return { source, entries };
  }));
  const answered = groups.filter((group): group is { source: FeedSource; entries: RawEntry[] } => group.entries !== null && group.entries.length > 0);
  return { items: shapeEntries(answered, now, max), ok: answered.length, total: FEEDS.length };
}

export const TECH_PER_SOURCE_MAX = 40;

/** Turns one tech feed into cache entries: allowlisted https links, recent dates, newest first, capped. Matching happens later, per skill. */
export function shapeTechEntries(site: string, entries: RawEntry[], now: number): TechEntry[] {
  const oldest = now - SKILL_NEWS_WINDOW_DAYS * 86_400_000;
  const seen = new Set<string>();
  const kept: TechEntry[] = [];
  for (const entry of [...entries].sort((a, b) => (b.time || 0) - (a.time || 0))) {
    const url = techUrl(entry.url);
    if (!url || !entry.title || seen.has(url) || !Number.isFinite(entry.time) || entry.time < oldest || entry.time > now + 86_400_000) continue;
    seen.add(url);
    kept.push({ title: entry.title, url, source: techSourceFor(url)?.site ?? site, time: entry.time, snippet: entry.snippet });
    if (kept.length >= TECH_PER_SOURCE_MAX) break;
  }
  return kept;
}

/** Reads the tech and AI feeds in TECH_SOURCES in parallel. `ok` is how many answered with something readable. */
export async function fetchTechEntries(deps: ScraperDeps = {}): Promise<TechRead> {
  const now = (deps.now ?? Date.now)();
  const groups = await Promise.all(TECH_SOURCES.map(async (source) => {
    const body = await safeGet(source.feed, "rss", { ...deps, hosts: TECH_FEED_HOSTS });
    return { source, raw: body === null ? [] : parseFeed(body) };
  }));
  const answered = groups.filter((group) => group.raw.length > 0);
  return { entries: answered.flatMap((group) => shapeTechEntries(group.source.site, group.raw, now)), ok: answered.length, total: TECH_SOURCES.length };
}

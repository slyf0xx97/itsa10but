import type { WebTools } from "./firecrawl-tools.ts";

/**
 * Company research done by the runner itself, before the Role Scout starts, so the company part of a run no longer depends on a small model
 * deciding to search. The runner reads the employer's name from the posting, looks the company up (Wikipedia and Wikidata through the edge
 * Worker, Firecrawl for the rest), reads the best one or two pages on the company's own site and hands the excerpts to the Scout as
 * untrusted web data. Every page and link here came from the Scout's own search tool, so the existing source check still applies.
 */

export type IntelPage = { url: string; title: string; text: string };
export type IntelHit = { title: string; url: string; snippet: string };
export type CompanyIntel = {
  name: string;
  /** What the company does, from its Wikipedia summary. */
  about?: string;
  /** The pages read, then the other links found, for the Sources list. */
  sources: { label: string; url: string }[];
  pages: IntelPage[];
  /** What other sites say about working there (links and snippets only, from the second search). */
  reputation: IntelHit[];
};

const SUFFIX = /[\s,]+(?:pte\.?\s*ltd\.?|private limited|limited|ltd\.?|inc\.?|llc|llp|corp(?:oration)?\.?|co\.?|gmbh|plc|s\.?a\.?)\s*$/i;
const NOT_A_NAME = new Set(["we", "our", "the", "this", "that", "you", "your", "role", "team", "job", "about", "join", "company", "position", "responsibilities", "requirements", "overview", "description", "singapore", "apply", "benefits", "what", "who", "why"]);
const PLACE = /,|singapore|remote|hybrid|on-?site|malaysia|hong kong|india|united|kingdom|australia|apac|asia|japan|china|indonesia|thailand|vietnam|philippines|\bsg\b/i;

const tidy = (value: string) => value.replace(/\([^)]*\)/g, " ").replace(SUFFIX, "").replace(/\s+/g, " ").trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}.&'-]+$/gu, "");
const plausible = (name: string) => name.length >= 2 && name.length <= 50 && name.split(" ").length <= 5 && !NOT_A_NAME.has(name.toLowerCase()) && /\p{L}/u.test(name);

/**
 * The employer's name in a posting, or undefined. A LinkedIn import puts it on the second line (title, company, place). Pasted text is searched
 * for "Company: X", "About X", "Join X" and "X is hiring". The guess only feeds a search, and the Scout still has to find the name in the text.
 */
export function guessCompanyName(roleText: string): string | undefined {
  const lines = roleText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const second = lines[1];
  if (second && lines[2] && second.length <= 60 && !/[.:;!?]/.test(second) && plausible(tidy(second)) && PLACE.test(lines[2]) && lines[2].length <= 70) return tidy(second);
  const head = roleText.slice(0, 4000);
  const cap = "[A-Z][\\w&.'-]*(?:[ \\t]+(?:[A-Z][\\w&.'-]*|&|of|and|the)){0,4}";
  const patterns = [
    new RegExp(`\\b(?:Company|Employer|Organi[sz]ation)\\s*:\\s*(${cap})`),
    new RegExp(`\\bAbout\\s+(?:the\\s+company,?\\s+)?(${cap})`),
    new RegExp(`\\bJoin\\s+(${cap})`),
    new RegExp(`\\bAt\\s+(${cap}),\\s+(?:we|you|our)\\b`),
    new RegExp(`\\b(${cap})\\s+is\\s+(?:hiring|looking for|seeking|a\\s+(?:leading|global|fast|growing))`),
  ];
  for (const pattern of patterns) {
    const found = pattern.exec(head)?.[1];
    const name = found ? tidy(found.replace(/\s+(?:is|are|was|and|of|the)$/i, "")) : "";
    if (plausible(name)) return name;
  }
  return undefined;
}

const COMPANY_PAGE = /(about|value|culture|career|purpose|principle|who-we|our-story|mission|people|life-at|join)/i;
const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } };
const isWiki = (url: string) => /(^|\.)wikipedia\.org$|(^|\.)wikidata\.org$/.test(hostOf(url));

/** The pages worth reading: on the company's own site (the first non-Wikipedia hit's host), culture-style pages first. */
export function pickPages(hits: IntelHit[], limit = 2): IntelHit[] {
  const candidates = hits.filter((hit) => !isWiki(hit.url));
  const own = candidates.find((hit) => /official website/i.test(hit.title))?.url ?? candidates[0]?.url;
  const host = own ? hostOf(own) : "";
  const rank = (hit: IntelHit) => (hostOf(hit.url) === host ? 0 : 2) + (COMPANY_PAGE.test(hit.url + " " + hit.title) ? 0 : 1);
  return [...candidates].sort((a, b) => rank(a) - rank(b)).slice(0, limit + 3);
}

type Results = { results?: IntelHit[] };
const resultsOf = (answer: { ok: boolean; data?: unknown }): IntelHit[] => (answer.ok ? (((answer.data as Results | undefined)?.results) ?? []) : []);

/**
 * Looks the company up. One search for the company itself, then up to two page reads (a page that cannot be read does not count), then
 * one search for what people say about working there. Failures return what was found so far, never throw.
 */
export async function gatherCompany(name: string, web: Pick<WebTools, "search" | "scrape">): Promise<CompanyIntel> {
  const intel: CompanyIntel = { name, sources: [], pages: [], reputation: [] };
  const first = resultsOf(await web.search(`${name} company values culture careers`, { limit: 6 }).catch(() => ({ ok: false } as const)));
  const wiki = first.find((hit) => /\(Wikipedia\)$/.test(hit.title));
  if (wiki?.snippet) intel.about = wiki.snippet.slice(0, 300);
  let tried = 0;
  for (const hit of pickPages(first)) {
    if (intel.pages.length >= 2 || tried >= 4) break;
    tried += 1;
    const page = await web.scrape(hit.url).catch(() => ({ ok: false } as const));
    const data = page.ok ? (page.data as { title?: string; text?: string }) : undefined;
    if (data?.text && data.text.length >= 200) intel.pages.push({ url: hit.url, title: (data.title || hit.title).slice(0, 120), text: data.text.slice(0, 1400) });
  }
  const second = resultsOf(await web.search(`${name} working at employees culture reviews`, { limit: 5 }).catch(() => ({ ok: false } as const)));
  const own = new Set(intel.pages.map((page) => hostOf(page.url)));
  intel.reputation = second.filter((hit) => !isWiki(hit.url) && !own.has(hostOf(hit.url))).slice(0, 3);
  const seen = new Set<string>();
  for (const item of [...(wiki ? [wiki] : []), ...intel.pages.map((page) => ({ title: page.title, url: page.url })), ...intel.reputation]) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    intel.sources.push({ label: item.title.slice(0, 80) || item.url, url: item.url });
  }
  return intel;
}

/** The untrusted block the Scout reads: what the company does, page excerpts, and what other sites say. Empty when nothing was found. */
export function intelData(intel: CompanyIntel): string {
  if (!intel.about && !intel.pages.length && !intel.reputation.length) return "";
  return JSON.stringify({
    company: intel.name,
    about: intel.about ?? null,
    pages: intel.pages.map((page) => ({ url: page.url, title: page.title, excerpt: page.text })),
    others: intel.reputation.map((hit) => ({ url: hit.url, title: hit.title, snippet: hit.snippet })),
  });
}

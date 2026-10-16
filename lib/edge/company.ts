import { publicHttpsUrl } from "./html.ts";

/**
 * Native company lookup for the edge Worker: Wikipedia finds the page, Wikidata gives the official website, and the site's own
 * careers and about pages are offered as candidate links. No key, no model. Nothing here fetches an address the caller typed:
 * only wikipedia.org and wikidata.org, then the website Wikidata names (https, public host).
 */
export type SearchHit = { title: string; url: string; snippet: string };

const clean = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

type Fetcher = (url: string) => Promise<unknown | null>;

/** Hits for a company name, best first: its Wikipedia page, its official website, and that site's careers and about pages. */
export async function companyHits(name: string, getJson: Fetcher): Promise<SearchHit[]> {
  const query = clean(name, 80);
  if (query.length < 2) return [];
  const search = (await getJson(`https://en.wikipedia.org/w/api.php?action=opensearch&format=json&limit=1&namespace=0&search=${encodeURIComponent(query)}`)) as [string, string[], string[], string[]] | null;
  const title = search?.[1]?.[0];
  if (!title) return [];
  const hits: SearchHit[] = [];
  const summary = (await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)) as { extract?: string; content_urls?: { desktop?: { page?: string } }; wikibase_item?: string; type?: string } | null;
  const pageUrl = publicHttpsUrl(summary?.content_urls?.desktop?.page ?? search?.[3]?.[0]);
  if (pageUrl && summary?.type !== "disambiguation") hits.push({ title: `${title} (Wikipedia)`, url: pageUrl, snippet: clean(summary?.extract, 300) });
  const item = summary?.wikibase_item;
  if (item && /^Q\d{1,12}$/.test(item)) {
    const entity = (await getJson(`https://www.wikidata.org/wiki/Special:EntityData/${item}.json`)) as { entities?: Record<string, { claims?: { P856?: { mainsnak?: { datavalue?: { value?: unknown } } }[] } }> } | null;
    const site = publicHttpsUrl(entity?.entities?.[item]?.claims?.P856?.[0]?.mainsnak?.datavalue?.value);
    if (site) {
      const origin = new URL(site).origin;
      hits.push({ title: `${title} official website`, url: site, snippet: "The company's own site." });
      for (const path of ["/careers", "/about"]) hits.push({ title: `${title} ${path.slice(1)} page`, url: origin + path, snippet: "Candidate page on the company's own site; it may not exist." });
    }
  }
  return hits;
}

const INTENT = /\b(values?|principles?|culture|careers?|jobs?|hiring|about|mission|vision|employer|reviews?|expectations?)\b/i;
const FILLER = /\b(company|at|of|the|and|a|an|for|working|work|life|what|is|like|its|our|us|we)\b/gi;

/** The company name inside a company-style query ("Acme Robotics values careers"), or null when the query is something else. */
export function companyFromQuery(query: string): string | null {
  if (!INTENT.test(query)) return null;
  const name = query.replace(new RegExp(INTENT.source, "gi"), " ").replace(FILLER, " ").replace(/\s+/g, " ").trim();
  return name.length >= 2 && name.length <= 60 && name.split(" ").length <= 4 ? name : null;
}

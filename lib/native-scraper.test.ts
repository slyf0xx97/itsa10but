import test from "node:test";
import assert from "node:assert/strict";
import { FEEDS, FETCH_HOSTS, MAX_BYTES, MAX_REDIRECTS, fetchNativeNews, isFetchableUrl, isPrivateIp, isRelevant, parseFeed, parsePressList, safeGet, shapeEntries, type RawEntry } from "./native-scraper.ts";
import { NEWS_SOURCES, refreshNews, createNewsCache } from "./signals-news.ts";
import { createLimiter } from "./rate-limit.ts";

const NOW = Date.parse("2026-10-15T10:00:00Z");
const PUBLIC = async () => ["93.184.216.34"];
const xml = (body: string, type = "application/rss+xml; charset=utf-8", status = 200, headers: Record<string, string> = {}) => new Response(body, { status, headers: { "content-type": type, ...headers } });

test("only https URLs on the exact feed hosts can be fetched", () => {
  assert.ok(isFetchableUrl("https://www.straitstimes.com/news/singapore/rss.xml"));
  for (const bad of ["http://www.straitstimes.com/x", "https://straitstimes.com.evil.example/x", "https://evil.example/", "https://user:pw@www.mom.gov.sg/", "https://www.mom.gov.sg:8443/", "https://127.0.0.1/", "https://[::1]/", "ftp://www.mom.gov.sg/", "not a url", "https://sub.vulcanpost.com/feed/"]) assert.equal(isFetchableUrl(bad), false, bad);
});

test("every feed host is also a host the page may link to", () => {
  for (const host of FETCH_HOSTS) assert.ok(NEWS_SOURCES.some((entry) => host === entry.host || host.endsWith("." + entry.host)), host);
  assert.ok(FEEDS.every((feed) => feed.url.startsWith("https://")));
});

test("private, loopback, link-local and unreadable addresses are refused", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255", "::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:a00:1", "2001:db8::1", "999.1.1.1", "nonsense"]) assert.equal(isPrivateIp(ip), true, ip);
  for (const ip of ["93.184.216.34", "8.8.8.8", "172.32.0.1", "2606:4700::6810:85e5", "::ffff:8.8.8.8"]) assert.equal(isPrivateIp(ip), false, ip);
});

test("a host that resolves to a private address is never fetched", async () => {
  let calls = 0;
  const fetchImpl = (async () => { calls += 1; return xml("<rss/>"); }) as unknown as typeof fetch;
  assert.equal(await safeGet("https://www.mom.gov.sg/", "html", { fetchImpl, resolve: async () => ["10.0.0.5"] }), null);
  assert.equal(await safeGet("https://www.mom.gov.sg/", "html", { fetchImpl, resolve: async () => ["93.184.216.34", "127.0.0.1"] }), null);
  assert.equal(await safeGet("https://www.mom.gov.sg/", "html", { fetchImpl, resolve: async () => [] }), null);
  assert.equal(calls, 0);
});

test("redirects stay on the list, are capped, and each hop is checked", async () => {
  const seen: string[] = [];
  const hop = (location: string) => new Response(null, { status: 302, headers: { location } });
  const route = (map: Record<string, Response>) => (async (url: string) => { seen.push(url); return map[url] ?? new Response("", { status: 404 }); }) as unknown as typeof fetch;
  const ok = await safeGet("https://www.hiringlab.example/", "rss", { fetchImpl: route({}), resolve: PUBLIC });
  assert.equal(ok, null);
  assert.deepEqual(seen, []);
  const a = "https://vulcanpost.com/feed/", b = "https://e27.co/feed/";
  assert.equal(await safeGet(a, "rss", { fetchImpl: route({ [a]: hop(b), [b]: xml("<rss>ok</rss>") }), resolve: PUBLIC }), "<rss>ok</rss>");
  assert.equal(await safeGet(a, "rss", { fetchImpl: route({ [a]: hop("https://evil.example/x") }), resolve: PUBLIC }), null);
  assert.equal(await safeGet(a, "rss", { fetchImpl: route({ [a]: hop("http://e27.co/feed/") }), resolve: PUBLIC }), null);
  assert.equal(await safeGet(a, "rss", { fetchImpl: route({ [a]: hop("https://e27.co/") , "https://e27.co/": hop(a) }), resolve: PUBLIC }), null);
  assert.equal(MAX_REDIRECTS, 3);
});

test("the content type must match, a failed status gives null, and the body is capped", async () => {
  const url = "https://vulcanpost.com/feed/";
  const get = (response: Response, kind: "rss" | "html" = "rss") => safeGet(url, kind, { fetchImpl: (async () => response) as unknown as typeof fetch, resolve: PUBLIC });
  assert.equal(await get(xml("<rss/>", "text/html")), null);
  assert.equal(await get(xml("<html/>", "application/json"), "html"), null);
  assert.equal(await get(xml("<html>x</html>", "text/html; charset=utf-8"), "html"), "<html>x</html>");
  assert.equal(await get(xml("<rss/>", "application/rss+xml", 500)), null);
  const big = await get(xml("a".repeat(MAX_BYTES + 5000)));
  assert.equal(big?.length, MAX_BYTES);
  const asked: Record<string, string>[] = [];
  await safeGet(url, "rss", { fetchImpl: (async (_u: string, init: RequestInit) => { asked.push({ ...(init.headers as Record<string, string>), redirect: String(init.redirect) }); return xml("<rss/>"); }) as unknown as typeof fetch, resolve: PUBLIC });
  assert.match(asked[0]["User-Agent"], /^Itsa10but-news-reader\/1\.0/);
  assert.equal(asked[0].redirect, "manual");
});

test("a thrown fetch gives null instead of an error", async () => {
  const boom = (async () => { throw new Error("secret detail"); }) as unknown as typeof fetch;
  assert.equal(await safeGet("https://vulcanpost.com/feed/", "rss", { fetchImpl: boom, resolve: PUBLIC }), null);
});

const RSS = `<?xml version="1.0"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>Feed title</title>
<item><title><![CDATA[Banks in Singapore hire more <b>AI</b> engineers &amp; analysts]]></title><link>https://www.businesstimes.com.sg/a?utm=1#top</link><pubDate>Wed, 14 Oct 2026 23:00:00 +0000</pubDate><description>&lt;p&gt;Hiring is up.&lt;/p&gt;&lt;script&gt;alert(1)&lt;/script&gt; &amp;#8216;Quoted&amp;#8217;</description></item>
<item><title>Second</title><link>https://www.straitstimes.com/b</link><dc:date>2026-10-13T08:00:00+08:00</dc:date><description><![CDATA[<p>Plain <a href="https://evil.example">link</a> text</p><img src=x onerror=alert(1)>]]></description></item>
</channel></rss>`;
const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom story</title><link rel="alternate" href="https://e27.co/atom-story/"/><updated>2026-10-12T00:00:00Z</updated><summary>Short &lt;em&gt;summary&lt;/em&gt;</summary></entry></feed>`;

test("RSS items give plain text titles, links, dates and snippets with no markup", () => {
  const [first, second] = parseFeed(RSS);
  assert.equal(first.title, "Banks in Singapore hire more AI engineers & analysts");
  assert.equal(first.url, "https://www.businesstimes.com.sg/a?utm=1#top");
  assert.equal(first.time, Date.parse("2026-10-14T23:00:00Z"));
  assert.equal(first.snippet, "Hiring is up. ‘Quoted’");
  assert.equal(second.time, Date.parse("2026-10-13T00:00:00Z"));
  assert.equal(second.snippet, "Plain link text");
  for (const entry of [first, second]) assert.ok(!/[<>]|script|onerror/i.test(entry.title + entry.snippet), entry.title);
});

test("Atom entries use the link href and the summary", () => {
  const [entry] = parseFeed(ATOM);
  assert.deepEqual(entry, { title: "Atom story", url: "https://e27.co/atom-story/", time: Date.parse("2026-10-12T00:00:00Z"), snippet: "Short summary" });
});

test("text that is not a feed gives no entries", () => {
  assert.deepEqual(parseFeed("<html><body>Not a feed</body></html>"), []);
  assert.deepEqual(parseFeed(""), []);
});

test("the MOM press-release list is read from its title links and dates", () => {
  const html = `<article><h3 class="item-title"><a id="x" href="/newsroom/press-releases/2026/0921-labour-market-report---second-quarter-2026">Labour Market Report - Second Quarter 2026</a><span class="item-file-size"></span></h3><div class="article-meta"><time datetime="2026-09-21">21 September 2026</time></div></article>`;
  assert.deepEqual(parsePressList(html, "https://www.mom.gov.sg/newsroom/press-releases"), [{ title: "Labour Market Report - Second Quarter 2026", url: "https://www.mom.gov.sg/newsroom/press-releases/2026/0921-labour-market-report---second-quarter-2026", time: Date.parse("2026-09-21"), snippet: "" }]);
  assert.deepEqual(parsePressList("<p>nothing</p>", "https://www.mom.gov.sg/"), []);
});

test("a story counts when it is about work and about tech, or about work for a labour source", () => {
  assert.equal(isRelevant("Banks hire more AI engineers", "both"), true);
  assert.equal(isRelevant("Tech layoffs hit Singapore studio", "both"), true);
  assert.equal(isRelevant("Man jailed for bribe", "both"), false);
  assert.equal(isRelevant("Hawker stall hiring cooks", "both"), false);
  assert.equal(isRelevant("Tech conference opens", "both"), false);
  assert.equal(isRelevant("Labour Market Report - Second Quarter 2026", "work"), true);
  assert.equal(isRelevant("Said it was fine", "both"), false);
});

const source = (over: Partial<(typeof FEEDS)[number]> = {}) => ({ ...FEEDS[0], ...over });
const entry = (over: Partial<RawEntry>): RawEntry => ({ title: "Tech hiring up in Singapore", url: "https://www.straitstimes.com/a", time: NOW - 86_400_000, snippet: "", ...over });

test("items keep allowed links, recent dates and relevant stories, newest first, capped per source and in total", () => {
  const day = 86_400_000;
  const entries = [
    entry({ url: "https://www.straitstimes.com/old", time: NOW - 40 * day }),
    entry({ url: "https://www.straitstimes.com/future", time: NOW + 5 * day }),
    entry({ url: "https://www.straitstimes.com/nodate", time: NaN }),
    entry({ url: "https://evil.example/x" }),
    entry({ url: "https://www.straitstimes.com/off", title: "Cat show opens" }),
    entry({ url: "https://www.straitstimes.com/1", time: NOW - 3 * day }),
    entry({ url: "https://www.straitstimes.com/2", time: NOW - 1 * day }),
    entry({ url: "https://www.straitstimes.com/2", time: NOW - 1 * day, title: "Duplicate link, tech hiring" }),
    entry({ url: "https://www.straitstimes.com/3", time: NOW - 2 * day }),
    entry({ url: "https://www.straitstimes.com/4", time: NOW - 4 * day }),
  ];
  const items = shapeEntries([{ source: source(), entries }], NOW, 8);
  assert.deepEqual(items.map((item) => item.url), ["https://www.straitstimes.com/2", "https://www.straitstimes.com/3", "https://www.straitstimes.com/1"]);
  assert.deepEqual(items[0], { title: "Tech hiring up in Singapore", source: "The Straits Times", url: "https://www.straitstimes.com/2", date: "14 Oct 2026", snippet: "" });
  const many = Array.from({ length: 4 }, (_, i) => ({ source: source(), entries: [entry({ url: `https://www.straitstimes.com/m${i}a` }), entry({ url: `https://www.straitstimes.com/m${i}b` })] }));
  assert.equal(shapeEntries(many, NOW, 5).length, 5);
  const long = shapeEntries([{ source: source(), entries: [entry({ snippet: "word ".repeat(100) })] }], NOW, 8)[0].snippet;
  assert.ok(long.length <= 241 && long.endsWith("word…"), long);
});

test("a source can require a word, such as Singapore for Hiring Lab", () => {
  const hl = source({ need: "work", mustMention: /singapore/i });
  const items = shapeEntries([{ source: hl, entries: [entry({ title: "US jobs report", url: "https://hiringlab.indeed.com/a" }), entry({ title: "Singapore jobs report", url: "https://hiringlab.indeed.com/b" })] }], NOW, 8);
  assert.deepEqual(items.map((item) => [item.url, item.source]), [["https://hiringlab.indeed.com/b", "Indeed Hiring Lab"]]);
});

const feedFetch = (async (url: string) => {
  if (url.includes("vulcanpost")) return xml(RSS.replace(/businesstimes\.com\.sg/, "vulcanpost.com"));
  if (url.includes("mom.gov.sg")) return xml("<html></html>", "text/html");
  return new Response("nope", { status: 503 });
}) as unknown as typeof fetch;

test("fetchNativeNews reads what answers and counts the rest as failed, with no network", async () => {
  const out = await fetchNativeNews(8, { fetchImpl: feedFetch, resolve: PUBLIC, now: () => NOW });
  assert.equal(out.total, FEEDS.length);
  assert.equal(out.ok, 1);
  assert.deepEqual(out.items.map((item) => item.source), ["Vulcan Post"]);
  assert.equal((await fetchNativeNews(8, { fetchImpl: feedFetch, resolve: async () => ["10.0.0.1"], now: () => NOW })).ok, 0);
});

const limits = () => ({ own: createLimiter({ perVisitorMax: 5, perVisitorWindowMs: 60_000, dailyCap: Infinity }), site: createLimiter({ perVisitorMax: 5, perVisitorWindowMs: 60_000, dailyCap: 5 }), native: createLimiter({ perVisitorMax: 1, perVisitorWindowMs: 60_000, dailyCap: Infinity }) });

test("refresh works with no key through the native reader, labels the method and caches", async () => {
  let reads = 0;
  const native = async () => { reads += 1; return { items: [{ title: "T", source: "e27", url: "https://e27.co/a", date: "1 Oct 2026", snippet: "" }], ok: 3, total: 9 }; };
  const nativeCache = createNewsCache();
  const run = (visitor = "v") => refreshNews({ keys: {}, env: {}, visitor, native, nativeCache, cache: createNewsCache(), limits: limits() });
  const first = await run();
  assert.equal(first.status, 200);
  assert.equal(first.body.method, "native");
  assert.equal(first.body.cached, false);
  const again = await run();
  assert.equal(again.body.cached, true);
  assert.equal(reads, 1);
});

test("the native reader has its own per-visitor limit, and an empty answer is an error", async () => {
  const ok = async () => ({ items: [], ok: 1, total: 9 });
  const lim = limits();
  assert.equal((await refreshNews({ keys: {}, env: {}, visitor: "v", native: ok, nativeCache: createNewsCache(), limits: lim })).status, 200);
  assert.equal((await refreshNews({ keys: {}, env: {}, visitor: "v", native: ok, nativeCache: createNewsCache(), limits: lim })).status, 429);
  const dead = async () => ({ items: [], ok: 0, total: 9 });
  assert.equal((await refreshNews({ keys: {}, env: {}, visitor: "w", native: dead, nativeCache: createNewsCache(), limits: limits() })).status, 502);
  const throws = async () => { throw new Error("secret"); };
  const out = await refreshNews({ keys: {}, env: {}, visitor: "x", native: throws, nativeCache: createNewsCache(), limits: limits() });
  assert.equal(out.status, 502);
  assert.ok(!JSON.stringify(out.body).includes("secret"));
});

test("a Firecrawl key adds results to the native ones without repeating a link", async () => {
  const native = async () => ({ items: [{ title: "Native", source: "e27", url: "https://e27.co/a", date: "1 Oct 2026", snippet: "" }], ok: 2, total: 9 });
  const search = (async () => new Response(JSON.stringify({ data: { web: [{ title: "Native again", url: "https://e27.co/a", description: "x" }, { title: "Boost", url: "https://www.channelnewsasia.com/b", description: "2 days ago · Snippet" }] } }), { status: 200 })) as unknown as typeof fetch;
  const out = await refreshNews({ keys: { firecrawl: "fc-visitor-key" }, env: {}, visitor: "v", native, fetchImpl: search, nativeCache: createNewsCache(), cache: createNewsCache(), limits: limits() });
  assert.equal(out.status, 200);
  assert.equal(out.body.method, "native+firecrawl");
  assert.deepEqual((out.body.items as { url: string }[]).map((item) => item.url), ["https://e27.co/a", "https://www.channelnewsasia.com/b"]);
  assert.ok(!JSON.stringify(out.body).includes("fc-visitor-key"));
  const failing = (async () => new Response("x", { status: 500 })) as unknown as typeof fetch;
  const partial = await refreshNews({ keys: { firecrawl: "fc-visitor-key" }, env: {}, visitor: "v2", native, fetchImpl: failing, nativeCache: createNewsCache(), cache: createNewsCache(), limits: limits() });
  assert.equal(partial.status, 200);
  assert.equal(partial.body.method, "native");
  assert.match(String(partial.body.note), /Firecrawl search didn't work/);
});

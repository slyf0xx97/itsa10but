import test from "node:test";
import assert from "node:assert/strict";
import { allowedUrl, createNewsCache, plainText, refreshNews, shapeNewsItems, sourceFor, splitDate, NEWS_HOSTS, NEWS_MAX_ITEMS } from "./signals-news.ts";
import { createLimiter } from "./rate-limit.ts";

test("only https links on the allowlist pass, subdomains included, and fragments are dropped", () => {
  assert.equal(allowedUrl("https://www.straitstimes.com/business/x#top"), "https://www.straitstimes.com/business/x");
  assert.equal(allowedUrl("https://sg.channelnewsasia.com/a"), "https://sg.channelnewsasia.com/a");
  for (const bad of ["http://www.straitstimes.com/x", "https://evil.example/", "https://straitstimes.com.evil.example/", "https://user:pw@www.mom.gov.sg/a", "javascript:alert(1)", "", 42, null]) assert.equal(allowedUrl(bad), "");
  assert.equal(sourceFor("https://www.mom.gov.sg/a")?.name, "MOM");
  assert.equal(sourceFor("https://notmom.gov.sg/a"), undefined);
});

test("plain text drops tags, markdown links, entities and control characters", () => {
  assert.equal(plainText("<b>Hi</b> [there](https://evil.example) &amp; <script>alert(1)</script>you\u0000  now", 100), "Hi there & you now");
  assert.equal(plainText("x".repeat(500), 20).length, 20);
  assert.equal(plainText(undefined, 20), "");
});

test("the source's own date prefix is split off the snippet", () => {
  assert.deepEqual(splitDate("3 days ago · UOB plans to hire"), { date: "3 days ago", rest: "UOB plans to hire" });
  assert.deepEqual(splitDate("Oct 6, 2025 · IMDA says"), { date: "Oct 6, 2025", rest: "IMDA says" });
  assert.deepEqual(splitDate("No date here"), { date: "", rest: "No date here" });
});

test("items keep allowlisted links only, once each, in order, capped", () => {
  const rows = [
    { title: "Good <i>one</i>", url: "https://www.businesstimes.com.sg/a", snippet: "7 days ago · A snippet" },
    { title: "Same link", url: "https://www.businesstimes.com.sg/a", snippet: "dupe" },
    { title: "Off list", url: "https://evil.example/x", snippet: "no" },
    { title: "", url: "https://www.mom.gov.sg/b", snippet: "no title" },
    ...Array.from({ length: 20 }, (_, i) => ({ title: "T" + i, url: "https://www.straitstimes.com/p" + i, snippet: "" })),
  ];
  const items = shapeNewsItems(rows);
  assert.equal(items.length, NEWS_MAX_ITEMS);
  assert.deepEqual(items[0], { title: "Good one", source: "The Business Times", url: "https://www.businesstimes.com.sg/a", date: "7 days ago", snippet: "A snippet" });
  assert.ok(items.every((item) => NEWS_HOSTS.some((host) => new URL(item.url).hostname.endsWith(host))));
  assert.deepEqual(shapeNewsItems("nope"), []);
});

test("the cache returns a fresh entry and lets it expire", () => {
  let t = 0;
  const cache = createNewsCache(1000, () => t);
  assert.equal(cache.get(), undefined);
  cache.set([]);
  t = 999; assert.ok(cache.get());
  t = 1000; assert.equal(cache.get(), undefined);
});

const fakeFetch = (calls: { body: Record<string, unknown>; auth: string }[]) => (async (_url: string, init: RequestInit) => {
  calls.push({ body: JSON.parse(String(init.body)), auth: (init.headers as Record<string, string>).Authorization });
  return new Response(JSON.stringify({ data: { web: [{ title: "AI hiring up", url: "https://www.channelnewsasia.com/a", description: "2 days ago · Snippet text" }, { title: "Ad", url: "https://evil.example/", description: "x" }] } }), { status: 200 });
}) as unknown as typeof fetch;
const limits = () => ({ own: createLimiter({ perVisitorMax: 2, perVisitorWindowMs: 60_000, dailyCap: Infinity }), site: createLimiter({ perVisitorMax: 1, perVisitorWindowMs: 60_000, dailyCap: 5 }) });

test("no key means a plain needs-key reply and nothing is fetched", async () => {
  const calls: { body: Record<string, unknown>; auth: string }[] = [];
  for (const env of [{}, { FIRECRAWL_API_KEY: "site-key-12345", LIVE_AGENTS_ENABLED: "false" }]) {
    const out = await refreshNews({ keys: {}, env, visitor: "1.2.3.4", fetchImpl: fakeFetch(calls), limits: limits(), cache: createNewsCache() });
    assert.equal(out.status, 403);
    assert.equal(out.body.needsKey, true);
    assert.match(String(out.body.error), /Firecrawl key/);
  }
  assert.equal(calls.length, 0);
});

test("a visitor key fetches allowlisted items, sends the allowlist and never echoes the key", async () => {
  const calls: { body: Record<string, unknown>; auth: string }[] = [];
  const out = await refreshNews({ keys: { firecrawl: "fc-visitor-key" }, env: {}, visitor: "1.2.3.4", fetchImpl: fakeFetch(calls), limits: limits(), cache: createNewsCache() });
  assert.equal(out.status, 200);
  assert.deepEqual((out.body.items as { url: string; date: string }[]).map((i) => [i.url, i.date]), [["https://www.channelnewsasia.com/a", "2 days ago"]]);
  assert.equal(calls[0].auth, "Bearer fc-visitor-key");
  assert.deepEqual(calls[0].body.includeDomains, NEWS_HOSTS);
  assert.ok(!JSON.stringify(out.body).includes("fc-visitor-key"));
});

test("the site key is used only when the live switch is on", async () => {
  const calls: { body: Record<string, unknown>; auth: string }[] = [];
  const out = await refreshNews({ keys: {}, env: { FIRECRAWL_API_KEY: "site-key-12345", LIVE_AGENTS_ENABLED: "true" }, visitor: "v", fetchImpl: fakeFetch(calls), limits: limits(), cache: createNewsCache() });
  assert.equal(out.status, 200);
  assert.equal(calls[0].auth, "Bearer site-key-12345");
});

test("the per-visitor limit applies, but a cached answer costs nothing", async () => {
  const calls: { body: Record<string, unknown>; auth: string }[] = [];
  const lim = limits();
  const run = (cache = createNewsCache()) => refreshNews({ keys: { firecrawl: "fc-visitor-key" }, env: {}, visitor: "v", fetchImpl: fakeFetch(calls), limits: lim, cache });
  const first = createNewsCache();
  assert.equal((await run(first)).status, 200);
  const again = await run(first);
  assert.equal(again.status, 200);
  assert.equal(again.body.cached, true);
  assert.equal(calls.length, 1);
  assert.equal((await run()).status, 200);
  assert.equal((await run()).status, 429);
});

test("a failed lookup gives a fixed message", async () => {
  const failing = (async () => new Response("secret body", { status: 500 })) as unknown as typeof fetch;
  const out = await refreshNews({ keys: { firecrawl: "fc-visitor-key" }, env: {}, visitor: "v", fetchImpl: failing, limits: limits(), cache: createNewsCache() });
  assert.equal(out.status, 502);
  assert.ok(!JSON.stringify(out.body).includes("secret"));
});

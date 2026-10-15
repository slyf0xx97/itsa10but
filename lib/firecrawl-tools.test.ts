import test from "node:test";
import assert from "node:assert/strict";
import { createWebTools, MAX_PAGE_CHARS } from "./firecrawl-tools.ts";

type Call = { url: string; body: Record<string, unknown>; auth: string };
function fakeFetch(handler: (url: string, body: Record<string, unknown>) => { status?: number; json: unknown }) {
  const calls: Call[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    calls.push({ url, body, auth: (init.headers as Record<string, string>).Authorization });
    const out = handler(url, body);
    return new Response(JSON.stringify(out.json), { status: out.status ?? 200 });
  }) as unknown as typeof fetch;
  return { impl, calls };
}
const searchReply = { json: { data: { web: [
  { title: "Good", url: "https://example.com/a", description: "snippet" },
  { title: "Bad", url: "javascript:alert(1)", description: "x" },
  { title: "Plain http", url: "http://example.com/b", description: "x" },
] } } };

test("search keeps only https links, remembers them and sends the key", async () => {
  const { impl, calls } = fakeFetch(() => searchReply);
  const tools = createWebTools({ apiKey: "fc-key", allowScrape: true, fetchImpl: impl });
  const result = await tools.search("junior soc analyst skills");
  assert.ok(result.ok);
  assert.deepEqual((result.data as { results: { url: string }[] }).results.map((r) => r.url), ["https://example.com/a"]);
  assert.equal(calls[0].auth, "Bearer fc-key");
  assert.ok(tools.seen.has("https://example.com/a"));
});

test("search passes a valid host list, recency filter and result count, and drops bad ones", async () => {
  const { impl, calls } = fakeFetch(() => searchReply);
  const tools = createWebTools({ apiKey: "k", allowScrape: false, fetchImpl: impl });
  await tools.search("singapore tech hiring", { includeDomains: ["mom.gov.sg", "bad host!"], tbs: "qdr:m", limit: 12 });
  assert.deepEqual(calls[0].body, { query: "singapore tech hiring", limit: 12, includeDomains: ["mom.gov.sg"], tbs: "qdr:m" });
  await tools.search("singapore tech hiring", { tbs: "evil", limit: 99 });
  assert.deepEqual(calls[1].body, { query: "singapore tech hiring", limit: 20 });
  await tools.search("singapore tech hiring");
  assert.equal(calls[2].body.limit, 5);
});

test("a scout may scrape only a link its own search returned", async () => {
  const { impl, calls } = fakeFetch((url) => url.endsWith("/search") ? searchReply : { json: { data: { markdown: "x".repeat(MAX_PAGE_CHARS * 2), metadata: { title: "T" } } } });
  const tools = createWebTools({ apiKey: "k", allowScrape: true, fetchImpl: impl });
  assert.equal((await tools.scrape("https://example.com/a")).ok, false);
  await tools.search("soc analyst");
  const page = await tools.scrape("https://example.com/a");
  assert.ok(page.ok);
  assert.equal((page.data as { text: string }).text.length, MAX_PAGE_CHARS);
  assert.equal((await tools.scrape("https://evil.example/")).ok, false);
  assert.equal(calls.filter((c) => c.url.endsWith("/scrape")).length, 1);
});

test("a planner cannot scrape at all", async () => {
  const { impl, calls } = fakeFetch(() => searchReply);
  const tools = createWebTools({ apiKey: "k", allowScrape: false, fetchImpl: impl });
  await tools.search("sql course");
  assert.equal((await tools.scrape("https://example.com/a")).ok, false);
  assert.equal(calls.length, 1);
});

test("bad queries are refused before anything is sent", async () => {
  const { impl, calls } = fakeFetch(() => searchReply);
  const tools = createWebTools({ apiKey: "k", allowScrape: true, fetchImpl: impl });
  for (const q of ["", "ab", "see https://evil.example/x", 42]) assert.equal((await tools.search(q)).ok, false);
  assert.equal(calls.length, 0);
});

test("failures return a short error without bodies, and a missing key is an error result", async () => {
  const failing = fakeFetch(() => ({ status: 500, json: { secret: "résumé text here" } }));
  const tools = createWebTools({ apiKey: "k", allowScrape: true, fetchImpl: failing.impl });
  assert.deepEqual(await tools.search("soc analyst"), { ok: false, error: "Web lookup failed (500)." });
  const throwing = createWebTools({ apiKey: "k", allowScrape: true, fetchImpl: (async () => { throw new Error("boom résumé"); }) as unknown as typeof fetch });
  assert.deepEqual(await throwing.search("soc analyst"), { ok: false, error: "Web lookup failed." });
  const keyless = createWebTools({ allowScrape: true });
  assert.equal((await keyless.search("soc analyst")).ok, false);
});

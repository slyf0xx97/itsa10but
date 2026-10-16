import assert from "node:assert/strict";
import { test } from "node:test";
import { edgeFromEnv, type Edge } from "./edge-client.ts";
import { createWebTools } from "./firecrawl-tools.ts";
import { takeRun } from "./rate-limit.ts";

type Seen = { path: string; body: Record<string, unknown>; headers: Record<string, string> };
function edgeWith(handler: (path: string, body: Record<string, unknown>) => unknown | null) {
  const seen: Seen[] = [];
  const edge: Edge = {
    url: "https://edge.example.com",
    secret: "s3cret",
    fetchImpl: (async (url: string, init: RequestInit) => {
      const path = new URL(url).pathname;
      const body = JSON.parse(String(init.body));
      seen.push({ path, body, headers: init.headers as Record<string, string> });
      const out = handler(path, body);
      return out === null ? new Response("no", { status: 500 }) : new Response(JSON.stringify(out));
    }) as unknown as typeof fetch,
  };
  return { edge, seen };
}
const memory = (ok: boolean) => ({ take: () => (ok ? ({ ok: true } as const) : ({ ok: false, reason: "visitor" } as const)) });

test("the edge is used only when both its address (https) and secret are set", () => {
  assert.equal(edgeFromEnv({}), undefined);
  assert.equal(edgeFromEnv({ EDGE_URL: "https://edge.example.com/", EDGE_SECRET: "x" })?.url, "https://edge.example.com");
  assert.equal(edgeFromEnv({ EDGE_URL: "http://edge.example.com", EDGE_SECRET: "x" }), undefined);
  assert.equal(edgeFromEnv({ EDGE_URL: "https://edge.example.com" }), undefined);
  assert.equal(edgeFromEnv({ EDGE_URL: "http://127.0.0.1:8787", EDGE_SECRET: "x" })?.url, "http://127.0.0.1:8787");
  assert.equal(edgeFromEnv({ EDGE_URL: "http://127.0.0.1.evil.com", EDGE_SECRET: "x" }), undefined);
});

test("web tools go through the edge, send the secret and a visitor key, and remember only returned links", async () => {
  const { edge, seen } = edgeWith((path) => (path === "/search" ? { ok: true, results: [{ title: "Acme", url: "https://acme.example.com/careers", snippet: "s" }, { title: "Bad", url: "http://acme.example.com", snippet: "s" }] } : { ok: true, title: "Careers", text: "We value kindness." }));
  const tools = createWebTools({ apiKey: "fc-visitor", allowScrape: true, edge });
  const found = await tools.search("Acme company values careers");
  assert.deepEqual((found as { data: { results: { url: string }[] } }).data.results.map((row) => row.url), ["https://acme.example.com/careers"]);
  assert.equal(seen[0].headers["x-edge-secret"], "s3cret");
  assert.equal(seen[0].headers["x-firecrawl-key"], "fc-visitor");
  assert.equal((await tools.scrape("https://other.example.com/")).ok, false, "a link its own search did not return");
  const page = await tools.scrape("https://acme.example.com/careers");
  assert.ok(page.ok && (page.data as { text: string }).text === "We value kindness.");
});

test("an edge failure is a short error, not a throw", async () => {
  const { edge } = edgeWith(() => null);
  const result = await createWebTools({ allowScrape: true, edge }).search("Acme company values");
  assert.deepEqual(result, { ok: false, error: "Web lookup failed." });
});

test("shared counters decide when the edge answers; the daily cap is checked first", async () => {
  const calls: string[] = [];
  const { edge } = edgeWith((_path, body) => { calls.push(String(body.bucket)); return { ok: body.bucket !== "site-day", count: 1 }; });
  const taken = await takeRun({ edge, ownKey: false, visitor: "1.2.3.4", env: {}, fallback: memory(true) });
  assert.deepEqual(taken, { ok: false, reason: "daily" });
  assert.deepEqual(calls, ["site-day"]);
});

test("an own-key run is limited per visitor per hour", async () => {
  const { edge, seen } = edgeWith(() => ({ ok: false, count: 11 }));
  const taken = await takeRun({ edge, ownKey: true, visitor: "1.2.3.4", env: {}, fallback: memory(true) });
  assert.deepEqual(taken, { ok: false, reason: "visitor" });
  assert.deepEqual([seen[0].body.bucket, seen[0].body.window, seen[0].body.max], ["own", "hour", 10]);
});

test("when the edge is down or absent, this instance's own limiter decides", async () => {
  const { edge } = edgeWith(() => null);
  assert.deepEqual(await takeRun({ edge, ownKey: false, visitor: "x", env: {}, fallback: memory(false) }), { ok: false, reason: "visitor" });
  assert.deepEqual(await takeRun({ ownKey: true, visitor: "x", env: {}, fallback: memory(true) }), { ok: true });
});

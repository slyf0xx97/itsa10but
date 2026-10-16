/**
 * itsa10but edge: a small Cloudflare Worker that the Vercel app calls server-to-server (never the browser).
 *   POST /search  company-style queries read Wikipedia and Wikidata first; anything else goes to Firecrawl
 *   POST /scrape  direct fetch of an https page first, Firecrawl only when the page is empty or blocked
 *   POST /limit   shared run counters in D1 (the day rolls over at midnight in Singapore)
 *   POST /usage   one row per agent per run: counts and timings only
 *   GET  /usage/summary  totals by day and model (admin secret)
 * Lookups are cached in KV. Request bodies, page text, keys and visitor addresses are never logged or stored in D1.
 */
import { companyFromQuery, companyHits, type SearchHit } from "../../lib/edge/company.ts";
import { firecrawlBudgetId, firecrawlDailyCap, needsWeb } from "../../lib/edge/budget.ts";
import { cacheKey, htmlToText, publicHttpsUrl, sgtDay, sgtHour } from "../../lib/edge/html.ts";

type Kv = { get(key: string, type: "json"): Promise<unknown>; put(key: string, value: string, options?: { expirationTtl: number }): Promise<void> };
type Stmt = { bind(...values: unknown[]): Stmt; run(): Promise<unknown>; first<T>(): Promise<T | null>; all<T>(): Promise<{ results: T[] }> };
type Db = { prepare(sql: string): Stmt };
type Env = { CACHE: Kv; DB: Db; EDGE_SECRET: string; ADMIN_SECRET?: string; FIRECRAWL_API_KEY?: string; FIRECRAWL_DAILY?: string };

const DAY = 86_400;
const FIRECRAWL = "https://api.firecrawl.dev/v2";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const text = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

function same(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function getJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, { headers: { "User-Agent": "Itsa10but-edge/1.0 (+https://ghernie.com/projects/itsa10but)", Accept: "application/json" }, signal: AbortSignal.timeout(5000) });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}

/**
 * Calls Firecrawl. A visitor's own key (the x-firecrawl-key header) is used freely, on their credits. The site's own key is limited to
 * FIRECRAWL_DAILY calls a day, counted in D1; past that, or with no key, this returns null and the caller keeps its free results.
 */
async function firecrawl(env: Env, path: string, body: unknown, visitorKey: string | null): Promise<unknown | null> {
  const own = visitorKey?.trim();
  const key = own || env.FIRECRAWL_API_KEY;
  if (!key) return null;
  if (!own) {
    const cap = firecrawlDailyCap(env.FIRECRAWL_DAILY);
    if (cap === 0) return null;
    const id = firecrawlBudgetId(Date.now());
    const row = await env.DB.prepare("INSERT INTO limits (id, span, count) VALUES (?, ?, 1) ON CONFLICT(id) DO UPDATE SET count = count + 1 RETURNING count").bind(id, id.slice(10)).first<{ count: number }>();
    if ((row?.count ?? 1) > cap) return null;
  }
  try {
    const response = await fetch(FIRECRAWL + path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}

async function search(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { q?: unknown; limit?: unknown } | null;
  const q = text(body?.q, 200);
  if (q.length < 3 || /https?:\/\//i.test(q)) return json({ ok: false, error: "Use a short plain search query." }, 400);
  const limit = Math.min(20, Math.max(1, Math.trunc(Number(body?.limit)) || 4));
  const key = await cacheKey("s", `${q}|${limit}`);
  const cached = (await env.CACHE.get(key, "json")) as { results: SearchHit[]; source: string } | null;
  if (cached) return json({ ok: true, ...cached, cached: true });

  // Free first: a company-style query reads Wikipedia and Wikidata. Firecrawl then adds the pages Wikipedia can't give (values pages, news),
  // when a key is available; with none, the native hits stand alone. Everything is cached, so a repeat lookup costs no credits.
  let results: SearchHit[] = [];
  let source = "native";
  const name = companyFromQuery(q);
  const native = name ? await companyHits(name, getJson) : [];
  if (needsWeb(Boolean(name), native.length)) {
    const data = (await firecrawl(env, "/search", { query: q, limit }, request.headers.get("x-firecrawl-key"))) as { data?: unknown } | null;
    const rows = Array.isArray(data?.data) ? data.data : (data?.data as { web?: unknown } | undefined)?.web;
    type Row = { title?: unknown; url?: unknown; description?: unknown; snippet?: unknown };
    const web = (Array.isArray(rows) ? (rows as Row[]) : []).flatMap((row) => {
      const url = publicHttpsUrl(row?.url);
      return url ? [{ title: text(row.title, 120), url, snippet: text(row.description ?? row.snippet, 160) }] : [];
    });
    // The guessed /careers and /about pages are dropped once real search results exist.
    const kept = web.length ? native.filter((hit) => !/ (careers|about) page$/.test(hit.title)) : native;
    results = [...kept, ...web.filter((hit) => !kept.some((own) => own.url === hit.url))].slice(0, limit);
    source = web.length ? (kept.length ? "native+firecrawl" : "firecrawl") : "native";
  } else results = native.slice(0, limit);
  if (results.length) await env.CACHE.put(key, JSON.stringify({ results, source }), { expirationTtl: DAY });
  return json({ ok: true, results, source });
}

/** Fetches one https page, following up to three redirects and re-checking every hop; reads at most 1.5 MB. */
async function fetchPage(start: string): Promise<string | null> {
  let url: string | null = start;
  for (let hop = 0; hop <= 3 && url; hop++) {
    let response: Response;
    try { response = await fetch(url, { redirect: "manual", headers: { "User-Agent": "Itsa10but-edge/1.0 (+https://ghernie.com/projects/itsa10but)", Accept: "text/html,text/plain" }, signal: AbortSignal.timeout(8000) }); } catch { return null; }
    if (response.status >= 300 && response.status < 400) { url = publicHttpsUrl(new URL(response.headers.get("location") ?? "", url).toString()); continue; }
    if (!response.ok || !/^(text\/html|text\/plain|application\/xhtml)/i.test(response.headers.get("content-type") ?? "") || !response.body) return null;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < 1_500_000) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value); size += value.length;
    }
    void reader.cancel().catch(() => undefined);
    const bytes = new Uint8Array(size);
    let at = 0;
    for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.length; }
    return new TextDecoder().decode(bytes);
  }
  return null;
}

async function scrape(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const url = publicHttpsUrl(body?.url);
  if (!url) return json({ ok: false, error: "Only a public https link can be opened." }, 400);
  const key = await cacheKey("p", url);
  const cached = (await env.CACHE.get(key, "json")) as { title: string; text: string; source: string } | null;
  if (cached) return json({ ok: true, ...cached, cached: true });

  const html = await fetchPage(url);
  let page = html ? htmlToText(html, 2500) : "";
  let source = "direct";
  let title = html ? text(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1], 200) : "";
  if (page.length < 300) {
    const data = (await firecrawl(env, "/scrape", { url, formats: ["markdown"], onlyMainContent: true, timeout: 7000 }, request.headers.get("x-firecrawl-key"))) as { data?: { markdown?: unknown; metadata?: { title?: unknown } } } | null;
    const markdown = typeof data?.data?.markdown === "string" ? data.data.markdown.slice(0, 2500) : "";
    if (markdown.length > page.length) { page = markdown; source = "firecrawl"; title = text(data?.data?.metadata?.title, 200) || title; }
  }
  if (!page) return json({ ok: false, error: "The page had no readable text." }, 404);
  await env.CACHE.put(key, JSON.stringify({ title, text: page, source }), { expirationTtl: DAY });
  return json({ ok: true, title, text: page, source });
}

async function limit(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { bucket?: unknown; visitor?: unknown; max?: unknown; window?: unknown } | null;
  const bucket = /^[a-z-]{1,24}$/.test(String(body?.bucket)) ? String(body?.bucket) : "";
  const visitor = /^[0-9a-f:.]{3,45}$|^unknown$/i.test(String(body?.visitor)) ? String(body?.visitor) : "unknown";
  const max = Math.trunc(Number(body?.max));
  if (!bucket || !(max >= 1 && max <= 100_000) || (body?.window !== "day" && body?.window !== "hour")) return json({ ok: false, error: "Bad limit request." }, 400);
  const now = Date.now();
  const span = body.window === "day" ? sgtDay(now) : sgtHour(now);
  // The visitor address only ever lives in this counter row, keyed by an hour; it is not logged.
  const id = body.window === "day" ? `${bucket}|${span}` : `${bucket}|${span}|${await cacheKey("v", visitor)}`;
  const row = await env.DB.prepare("INSERT INTO limits (id, span, count) VALUES (?, ?, 1) ON CONFLICT(id) DO UPDATE SET count = count + 1 RETURNING count").bind(id, span).first<{ count: number }>();
  const count = row?.count ?? 1;
  return json({ ok: count <= max, count });
}

async function usage(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { runId?: unknown; rows?: unknown } | null;
  const runId = /^[A-Za-z0-9-]{1,40}$/.test(String(body?.runId)) ? String(body?.runId) : "";
  const rows = Array.isArray(body?.rows) ? body.rows.slice(0, 8) : [];
  if (!runId || !rows.length) return json({ ok: false, error: "Bad usage request." }, 400);
  const day = sgtDay(Date.now());
  const int = (value: unknown) => Math.max(0, Math.min(10_000_000, Math.trunc(Number(value)) || 0));
  for (const raw of rows as Record<string, unknown>[]) {
    await env.DB.prepare("INSERT INTO usage (day, run_id, agent, model, provider, in_tokens, out_tokens, ms, fallback) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(day, runId, text(raw.agent, 40), text(raw.model, 80), text(raw.provider, 20), int(raw.inputTokens), int(raw.outputTokens), int(raw.ms), raw.fallback ? 1 : 0).run();
  }
  return json({ ok: true });
}

async function summary(env: Env): Promise<Response> {
  const days = await env.DB.prepare("SELECT day, model, COUNT(DISTINCT run_id) AS runs, SUM(in_tokens) AS in_tokens, SUM(out_tokens) AS out_tokens, SUM(ms) AS ms FROM usage GROUP BY day, model ORDER BY day DESC LIMIT 120").bind().all();
  const all = await env.DB.prepare("SELECT COUNT(DISTINCT run_id) AS runs, SUM(in_tokens) AS in_tokens, SUM(out_tokens) AS out_tokens FROM usage").bind().first();
  return json({ ok: true, allTime: all, byDay: days.results });
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === "/usage/summary" && request.method === "GET") return same(request.headers.get("x-admin-secret") ?? "", env.ADMIN_SECRET ?? "") ? summary(env) : json({ ok: false }, 401);
    if (request.method !== "POST") return json({ ok: false }, 405);
    if (!same(request.headers.get("x-edge-secret") ?? "", env.EDGE_SECRET ?? "")) return json({ ok: false }, 401);
    try {
      if (path === "/search") return await search(request, env);
      if (path === "/scrape") return await scrape(request, env);
      if (path === "/limit") return await limit(request, env);
      if (path === "/usage") return await usage(request, env);
    } catch { return json({ ok: false, error: "The edge could not finish that." }, 500); }
    return json({ ok: false }, 404);
  },
};

/** Nightly (see "triggers" in wrangler.jsonc): drop counters older than 3 days and usage rows older than 90 days. Day and hour spans both start with the SGT date, so a string compare works. */
const clean = async (env: Env): Promise<void> => {
  const now = Date.now();
  await env.DB.prepare("DELETE FROM limits WHERE span < ?").bind(sgtDay(now - 3 * 86_400_000)).run();
  await env.DB.prepare("DELETE FROM usage WHERE day < ?").bind(sgtDay(now - 90 * 86_400_000)).run();
};

const edge = { ...worker, scheduled: (_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) => ctx.waitUntil(clean(env)) };
export default edge;

/**
 * itsa10but edge: a small Cloudflare Worker that the Vercel app calls server-to-server (never the browser).
 *   POST /search  company-style queries read Wikipedia and Wikidata first; anything else goes to Firecrawl
 *   POST /scrape  direct fetch of an https page first, Firecrawl only when the page is empty or blocked
 *   POST /limit   shared run counters in D1 (the day rolls over at midnight in Singapore)
 *   POST /usage   one row per agent per run: counts and timings only
 *   GET  /usage/summary  totals by day and model (admin secret)
 *   GET  /itsa10but  (on admin.ghernie.com, the shared admin host) the owner's usage page: counters, token totals and Firecrawl credits. Cloudflare Access signs the owner in; the Worker checks the Access token again (lib/edge/access.ts)
 *   POST /role-skills  Workers AI reads the role text only (never a résumé) and names skills it asks for; cached, and capped per day in D1
 *   GET  /demand  the market-demand table: for each tracked role, the share of recent public postings that name each skill
 * An hourly cron refreshes one role of that table from the free Himalayas and Jobicy feeds; it uses no key and no Firecrawl credit.
 * Lookups are cached in KV. Request bodies, page text, keys and visitor addresses are never logged or stored in D1.
 */
import { companyFromQuery, companyHits, type SearchHit } from "../../lib/edge/company.ts";
import { firecrawlBudgetId, firecrawlDailyCap, needsWeb } from "../../lib/edge/budget.ts";
import { cacheKey, htmlToText, publicHttpsUrl, sgtDay, sgtHour } from "../../lib/edge/html.ts";
import { ROLE_AI_MODEL, ROLE_MIN, pickSkills, roleAiDailyCap, rolePrompt } from "../../lib/edge/role-skills.ts";
import { MCF_URL, jobsFromMcf, mcfBody } from "../../lib/edge/mcf.ts";
import { catalog } from "../../lib/catalog.ts";
import { cleanCredits, countersByDay, type LimitRow } from "../../lib/edge/stats.ts";
import { verifyAccess, type AccessKey } from "../../lib/edge/access.ts";
import { renderAdmin, type AdminStats } from "../../lib/edge/admin-html.ts";
import { aiPicks, cleanSnapshot } from "../../lib/edge/snapshot.ts";
import { MIN_SAMPLE, cleanTable, countDemand, feedUrls, postingsFromFeeds, roleToRefresh, type DemandJob } from "../../lib/edge/demand.ts";

type Kv = { get(key: string, type: "json"): Promise<unknown>; put(key: string, value: string, options?: { expirationTtl: number }): Promise<void> };
type Stmt = { bind(...values: unknown[]): Stmt; run(): Promise<unknown>; first<T>(): Promise<T | null>; all<T>(): Promise<{ results: T[] }> };
type Db = { prepare(sql: string): Stmt };
type Env = { CACHE: Kv; DB: Db; EDGE_SECRET: string; ADMIN_SECRET?: string; FIRECRAWL_API_KEY?: string; FIRECRAWL_DAILY?: string; AI?: { run(model: string, input: unknown): Promise<unknown> }; ROLE_AI_DAILY?: string; ACCESS_TEAM?: string; ACCESS_AUD?: string; ADMIN_EMAIL?: string };

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
  let fc = 0, credits = 0; // Firecrawl calls this answer really cost, and the credits it reported
  const name = companyFromQuery(q);
  const native = name ? await companyHits(name, getJson) : [];
  if (needsWeb(Boolean(name), native.length)) {
    const data = (await firecrawl(env, "/search", { query: q, limit }, request.headers.get("x-firecrawl-key"))) as { data?: unknown } | null;
    if (data) { fc = 1; credits = Number((data as { creditsUsed?: unknown }).creditsUsed) || 0; }
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
  return json({ ok: true, results, source, fc, credits });
}

/** Fetches one https page, following up to three redirects and re-checking every hop; reads at most 1.5 MB. */
async function fetchPage(start: string): Promise<string | null | 404> {
  let url: string | null = start;
  for (let hop = 0; hop <= 3 && url; hop++) {
    let response: Response;
    try { response = await fetch(url, { redirect: "manual", headers: { "User-Agent": "Itsa10but-edge/1.0 (+https://ghernie.com/projects/itsa10but)", Accept: "text/html,text/plain" }, signal: AbortSignal.timeout(8000) }); } catch { return null; }
    if (response.status >= 300 && response.status < 400) { url = publicHttpsUrl(new URL(response.headers.get("location") ?? "", url).toString()); continue; }
    if (response.status === 404 || response.status === 410) return 404;
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

  const fetched = await fetchPage(url);
  // A page that is gone costs nothing more: no Firecrawl call on a 404.
  if (fetched === 404) return json({ ok: false, error: "That page does not exist." }, 404);
  const html = fetched;
  let page = html ? htmlToText(html, 2500) : "";
  let source = "direct";
  let fc = 0, credits = 0;
  let title = html ? text(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1], 200) : "";
  if (page.length < 300) {
    const data = (await firecrawl(env, "/scrape", { url, formats: ["markdown"], onlyMainContent: true, timeout: 7000 }, request.headers.get("x-firecrawl-key"))) as { data?: { markdown?: unknown; metadata?: { title?: unknown } } } | null;
    if (data) { fc = 1; credits = Number((data.data?.metadata as { creditsUsed?: unknown } | undefined)?.creditsUsed) || 0; }
    const markdown = typeof data?.data?.markdown === "string" ? data.data.markdown.slice(0, 2500) : "";
    if (markdown.length > page.length) { page = markdown; source = "firecrawl"; title = text(data?.data?.metadata?.title, 200) || title; }
  }
  if (!page) return json({ ok: false, error: "The page had no readable text." }, 404);
  await env.CACHE.put(key, JSON.stringify({ title, text: page, source }), { expirationTtl: DAY });
  return json({ ok: true, title, text: page, source, fc, credits });
}

/** Skills named in a posting, by a small Workers AI model. Free allocation only: past ROLE_AI_DAILY real calls a day, or on any error, the answer is an empty list. */
async function roleSkills(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { job?: unknown } | null;
  const job = typeof body?.job === "string" ? body.job.trim().slice(0, 15_000) : "";
  if (job.length < ROLE_MIN) return json({ ok: false, error: "Add the role text first." }, 400);
  const key = await cacheKey("r", job);
  const cached = (await env.CACHE.get(key, "json")) as { skills: string[] } | null;
  if (cached) return json({ ok: true, skills: pickSkills(cached.skills, job), cached: true });
  const cap = roleAiDailyCap(env.ROLE_AI_DAILY);
  if (!env.AI || cap === 0) return json({ ok: true, skills: [], off: true });
  const id = `roleai|${sgtDay(Date.now())}`;
  const row = await env.DB.prepare("INSERT INTO limits (id, span, count) VALUES (?, ?, 1) ON CONFLICT(id) DO UPDATE SET count = count + 1 RETURNING count").bind(id, id.slice(7)).first<{ count: number }>();
  if ((row?.count ?? 1) > cap) return json({ ok: true, skills: [], off: true });
  let skills: string[] = [];
  try { skills = pickSkills(await env.AI.run(ROLE_AI_MODEL, rolePrompt(job)), job); } catch { return json({ ok: true, skills: [] }); }
  await env.CACHE.put(key, JSON.stringify({ skills }), { expirationTtl: 7 * DAY });
  return json({ ok: true, skills });
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

/** What the admin page shows: counters per day, token totals by model, and the site Firecrawl key's credits. Counts and totals only. */
async function gatherStats(env: Env): Promise<AdminStats> {
  const since = sgtDay(Date.now() - 30 * 86_400_000);
  const limits = await env.DB.prepare("SELECT id, span, count FROM limits").bind().all<LimitRow>();
  const byModel = await env.DB.prepare("SELECT day, model, provider, COUNT(DISTINCT run_id) AS runs, SUM(in_tokens) AS in_tokens, SUM(out_tokens) AS out_tokens, SUM(ms) AS ms, SUM(fallback) AS fallbacks FROM usage WHERE day >= ? GROUP BY day, model, provider ORDER BY day DESC LIMIT 400").bind(since).all<AdminStats["usage"]["byModel"][number]>();
  const all = await env.DB.prepare("SELECT COUNT(DISTINCT run_id) AS runs, SUM(in_tokens) AS in_tokens, SUM(out_tokens) AS out_tokens FROM usage").bind().first<{ runs: number; in_tokens: number; out_tokens: number }>();
  let credits = null;
  if (env.FIRECRAWL_API_KEY) {
    try {
      const response = await fetch(FIRECRAWL + "/team/credit-usage", { headers: { Authorization: `Bearer ${env.FIRECRAWL_API_KEY}` }, signal: AbortSignal.timeout(6000) });
      credits = response.ok ? cleanCredits(await response.json()) : null;
    } catch { credits = null; }
  }
  return { today: sgtDay(Date.now()), counters: countersByDay(limits.results), usage: { allTime: all, byModel: byModel.results }, firecrawl: { keySet: Boolean(env.FIRECRAWL_API_KEY), dailyCap: firecrawlDailyCap(env.FIRECRAWL_DAILY), credits }, workersAi: { dailyCap: roleAiDailyCap(env.ROLE_AI_DAILY) } };
}

let accessKeys: { at: number; keys: AccessKey[] } | null = null;

/** Cloudflare Access's public signing keys for this team, kept for an hour. */
async function keysFor(team: string): Promise<AccessKey[]> {
  if (accessKeys && Date.now() - accessKeys.at < 3_600_000) return accessKeys.keys;
  const response = await fetch(`https://${team}/cdn-cgi/access/certs`, { signal: AbortSignal.timeout(5000) });
  const body = (await response.json()) as { keys?: AccessKey[] };
  accessKeys = { at: Date.now(), keys: Array.isArray(body.keys) ? body.keys : [] };
  return accessKeys.keys;
}

const page = (html: string, status = 200) => new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" } });

/** The owner's usage page. Access has already asked for a sign-in on edge.ghernie.com; this checks the token it issued, so the workers.dev address (which Access does not guard) shows nothing. */
async function admin(request: Request, env: Env): Promise<Response> {
  if (!env.ACCESS_TEAM || !env.ACCESS_AUD || !env.ADMIN_EMAIL) return page("<p>The admin page is not set up.</p>", 503);
  const token = request.headers.get("cf-access-jwt-assertion") ?? "";
  let who: { email: string } | null = null;
  try { who = token ? await verifyAccess(token, { team: env.ACCESS_TEAM, aud: env.ACCESS_AUD, email: env.ADMIN_EMAIL }, await keysFor(env.ACCESS_TEAM), Date.now()) : null; } catch { who = null; }
  if (!who) return page("<p>Sign in through Cloudflare Access to see this page.</p>", 401);
  return page(renderAdmin(await gatherStats(env), who.email));
}

/** Public postings for a role from the two free feeds. */
async function postings(role: string): Promise<DemandJob[]> {
  const urls = feedUrls(role);
  const [himalayas, jobicy] = await Promise.all([getJson(urls.himalayas), getJson(urls.jobicy)]);
  return postingsFromFeeds(himalayas, jobicy);
}

/** Singapore postings for a role from MyCareersFuture: the title and the skills each employer tagged, plus the advertised pay. */
async function sgPostings(role: string): Promise<ReturnType<typeof jobsFromMcf>> {
  try {
    const response = await fetch(MCF_URL, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "Itsa10but-edge/1.0 (+https://ghernie.com/projects/itsa10but)" }, body: mcfBody(role), signal: AbortSignal.timeout(6000) });
    return jobsFromMcf(response.ok ? await response.json() : null, role);
  } catch { return { jobs: [], pay: undefined }; }
}

/** Refreshes the next role in turn, from the remote feeds and from MyCareersFuture. A sample under MIN_SAMPLE postings is too small, so the older row stays. A failed run changes nothing. */
async function refreshDemand(env: Env): Promise<void> {
  const role = roleToRefresh(Date.now());
  const [jobs, sg] = await Promise.all([postings(role), sgPostings(role)]);
  const table = cleanTable(await env.CACHE.get("demand:all", "json"));
  const day = sgtDay(Date.now());
  let changed = false;
  if (jobs.length >= MIN_SAMPLE) { table.roles[role] = countDemand(role, jobs, day); changed = true; }
  if (sg.jobs.length >= MIN_SAMPLE) { table.sg[role] = countDemand(role, sg.jobs, day, catalog, sg.pay); changed = true; }
  if (changed) await env.CACHE.put("demand:all", JSON.stringify(table));
}

/** Once a day: one Firecrawl search on the site key for this week's AI news, kept with the day it was read. Fewer than two usable results change nothing, so the date never moves without a real check. */
async function refreshSnapshot(env: Env): Promise<void> {
  if (!env.FIRECRAWL_API_KEY) return;
  const response = await fetch(FIRECRAWL + "/search", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.FIRECRAWL_API_KEY}` }, body: JSON.stringify({ query: "new AI model release OR AI research results announced", sources: ["news"], tbs: "qdr:w", limit: 8 }), signal: AbortSignal.timeout(20_000) });
  const ai = response.ok ? aiPicks(await response.json(), 4) : [];
  if (ai.length >= 2) await env.CACHE.put("snapshot:latest", JSON.stringify({ checked: new Date().toISOString(), ai }));
}

/** The hourly run also catches up: when the stored check is missing or more than 20 hours old (a missed night, or a first deploy), it runs the refresh now. */
async function ensureSnapshot(env: Env): Promise<void> {
  const stored = cleanSnapshot(await env.CACHE.get("snapshot:latest", "json"));
  if (!stored || Date.now() - Date.parse(stored.checked) > 20 * 3_600_000) await refreshSnapshot(env);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === "/demand" && request.method === "GET") return same(request.headers.get("x-edge-secret") ?? "", env.EDGE_SECRET ?? "") ? json({ ok: true, ...cleanTable(await env.CACHE.get("demand:all", "json")) }) : json({ ok: false }, 401);
    if (path === "/snapshot" && request.method === "GET") return same(request.headers.get("x-edge-secret") ?? "", env.EDGE_SECRET ?? "") ? json({ ok: true, snapshot: cleanSnapshot(await env.CACHE.get("snapshot:latest", "json")) }) : json({ ok: false }, 401);
    if (path === "/usage/summary" && request.method === "GET") return same(request.headers.get("x-admin-secret") ?? "", env.ADMIN_SECRET ?? "") ? summary(env) : json({ ok: false }, 401);
    if ((path === "/itsa10but" || path === "/itsa10but/") && request.method === "GET") return await admin(request, env).catch(() => page("<p>The admin page could not load.</p>", 500));
    if (request.method !== "POST") return json({ ok: false }, 405);
    if (!same(request.headers.get("x-edge-secret") ?? "", env.EDGE_SECRET ?? "")) return json({ ok: false }, 401);
    try {
      if (path === "/search") return await search(request, env);
      if (path === "/scrape") return await scrape(request, env);
      if (path === "/role-skills") return await roleSkills(request, env);
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

// Two crons (wrangler.jsonc): the nightly clean-up, and the hourly demand refresh.
const edge = { ...worker, scheduled: (event: { cron?: string }, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) => ctx.waitUntil((event.cron === "30 18 * * *" ? Promise.all([clean(env), refreshSnapshot(env)]) : Promise.all([refreshDemand(env), ensureSnapshot(env)])).catch(() => undefined)) };
export default edge;

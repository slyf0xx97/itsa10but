import test from "node:test";
import assert from "node:assert/strict";
import { MIN_FIT, SKILL_NAMES, SKILL_NEWS_MAX, SKILL_NEWS_MAX_BODY, TECH_FEED_HOSTS, TECH_SOURCES, answerSkillNews, catalogSkill, createTechCache, parseSkillNewsBody, pickForSkill, skillScore, skillTerms, techUrl, type TechEntry } from "./skill-news.ts";
import { fetchTechEntries, isFetchableUrl, safeGet, shapeTechEntries } from "./native-scraper.ts";
import { newsSiteGroups } from "./news-sites.ts";
import { createLimiter } from "./rate-limit.ts";

const NOW = Date.parse("2026-10-15T10:00:00Z");
const DAY = 86_400_000;
const PUBLIC = async () => ["93.184.216.34"];
const entry = (over: Partial<TechEntry> = {}): TechEntry => ({ title: "Plain title", url: "https://huggingface.co/blog/a", source: "Hugging Face Blog", time: NOW - DAY, snippet: "", ...over });

test("every tech feed belongs to a site in the Tech and AI news feeds group of news-sites.ts", () => {
  const sites = newsSiteGroups.find((group) => group.id === "tech")?.sites ?? [];
  for (const source of TECH_SOURCES) {
    const site = sites.find((item) => item.name === source.site);
    assert.ok(site, source.site);
    const siteHost = new URL(site.href).hostname;
    assert.ok(siteHost === source.host || siteHost.endsWith("." + source.host), `${source.site}: ${siteHost}`);
    assert.ok(source.feed.startsWith("https://"), source.feed);
    assert.ok(TECH_FEED_HOSTS.includes(new URL(source.feed).hostname));
  }
});

test("a skill request names 1 to 3 catalog skills and nothing else", () => {
  assert.deepEqual(parseSkillNewsBody(JSON.stringify({ skills: [" mlops ", "SQL", "mlops"] })), { ok: true, skills: ["MLOps", "SQL"] });
  assert.deepEqual(parseSkillNewsBody('{"skills":["Cloud"]}'), { ok: true, skills: ["Cloud"] });
  const refused = (text: string) => assert.equal(parseSkillNewsBody(text).ok, false, text.slice(0, 60));
  refused("");
  refused("not json");
  refused("[]");
  refused("null");
  refused('{"skills":[]}');
  refused('{"skills":["Python","SQL","Cloud","Linux"]}');
  refused('{"skills":["Underwater basket weaving"]}');
  refused('{"skills":[1]}');
  refused('{"skills":"Python"}');
  refused('{"skills":["Python"],"resume":"Alex Tan, alex@example.com"}');
  refused('{"skills":["Python"],"role":"Machine learning engineer"}');
  refused(JSON.stringify({ skills: ["Python"], pad: "x".repeat(SKILL_NEWS_MAX_BODY) }));
  assert.equal(SKILL_NEWS_MAX, 3);
  assert.equal(MIN_FIT, 2);
});

test("a skill name must be one of the catalog's own, whatever the case", () => {
  assert.equal(catalogSkill("deep LEARNING"), "Deep learning");
  assert.equal(catalogSkill("Role-specific evidence"), undefined);
  assert.equal(catalogSkill(undefined), undefined);
  assert.ok(SKILL_NAMES.length >= 17);
});

test("article terms come from the catalog, without words that match everyday news", () => {
  assert.deepEqual(skillTerms("MLOps"), ["mlops", "mlflow", "model deployment", "model serving", "kubeflow", "model monitoring", "deployed models", "deploying models", "deploy models"]);
  assert.ok(skillTerms("Deep learning").includes("pytorch"));
  assert.ok(!skillTerms("React").includes("react"));
  assert.ok(skillTerms("Cloud").includes("docker") && skillTerms("Cloud").includes("kubernetes"), "container tools belong to Cloud now");
  assert.ok(skillTerms("React").includes("reactjs"));
  assert.ok(!skillTerms("APIs").includes("rest"));
  assert.ok(skillTerms("Incident response").includes("incident response"));
  assert.deepEqual(skillTerms("Not a skill"), []);
});

test("an article fits a skill by a whole-word catalog term, and a title hit counts double", () => {
  assert.equal(skillScore({ title: "PyTorch 3 ships", snippet: "" }, "Deep learning"), 2);
  assert.equal(skillScore({ title: "A release", snippet: "Faster PyTorch kernels" }, "Deep learning"), 1);
  assert.equal(skillScore({ title: "Docker and Kubernetes at scale", snippet: "" }, "Cloud"), 4);
  assert.equal(skillScore({ title: "Why we use AWS", snippet: "" }, "SQL"), 0);
  assert.equal(skillScore({ title: "Investors react to the news", snippet: "The rest of the report is due" }, "React"), 0);
  assert.equal(skillScore({ title: "Investors react to the news", snippet: "The rest of the report is due" }, "APIs"), 0);
  assert.equal(skillScore({ title: "Postgres 18 is out", snippet: "" }, "SQL"), 2);
  assert.equal(skillScore({ title: "Spigot is not SQLite", snippet: "" }, "SQL"), 2);
  assert.equal(skillScore({ title: "Overpytorched", snippet: "" }, "Deep learning"), 0);
});

test("up to three articles per skill, best fit first, then newest, one per link", () => {
  const entries = [
    entry({ title: "Docker tips", url: "https://huggingface.co/blog/1", time: NOW - 5 * DAY }),
    entry({ title: "Docker and Kubernetes", url: "https://huggingface.co/blog/2", time: NOW - 9 * DAY }),
    entry({ title: "Docker news", url: "https://huggingface.co/blog/3", time: NOW - 1 * DAY }),
    entry({ title: "Docker news again", url: "https://huggingface.co/blog/3", time: NOW - 1 * DAY }),
    entry({ title: "Docker older", url: "https://huggingface.co/blog/4", time: NOW - 20 * DAY }),
    entry({ title: "Unrelated", url: "https://huggingface.co/blog/5" }),
  ];
  const picked = pickForSkill(entries, "Cloud");
  assert.deepEqual(picked.map((item) => item.url), ["https://huggingface.co/blog/2", "https://huggingface.co/blog/3", "https://huggingface.co/blog/1"]);
  assert.deepEqual(picked[1], { title: "Docker news", source: "Hugging Face Blog", url: "https://huggingface.co/blog/3", date: "14 Oct 2026" });
  assert.deepEqual(pickForSkill(entries, "Communication"), []);
  // One passing mention in the text is not enough. A title hit or two different terms is.
  const passing = [entry({ title: "A quote", snippet: "He mentioned machine learning once", url: "https://huggingface.co/blog/q" }), entry({ title: "Weekly notes", snippet: "Docker and Kubernetes came up", url: "https://huggingface.co/blog/w" })];
  assert.deepEqual(pickForSkill(passing, "Machine learning"), []);
  assert.deepEqual(pickForSkill(passing, "Cloud").map((row) => row.url), ["https://huggingface.co/blog/w"]);
  assert.deepEqual(pickForSkill([], "Cloud"), []);
  assert.equal(pickForSkill(entries, "Cloud", 1).length, 1);
});

test("links are https on a tech source host, with no login part and no fragment", () => {
  assert.equal(techUrl("https://huggingface.co/blog/a#top"), "https://huggingface.co/blog/a");
  assert.equal(techUrl("https://www.theverge.com/ai/1"), "https://www.theverge.com/ai/1");
  assert.equal(techUrl("https://importai.substack.com/p/x"), "https://importai.substack.com/p/x");
  for (const bad of ["http://huggingface.co/a", "https://evil.example/a", "https://huggingface.co.evil.example/a", "https://user:pw@huggingface.co/a", "javascript:alert(1)", "https://substack.com/p/x", "", null, 5]) assert.equal(techUrl(bad), "", String(bad));
});

const RSS = (items: string) => `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>${items}</channel></rss>`;
const item = (title: string, link: string, date: string, description = "") => `<item><title>${title}</title><link>${link}</link><pubDate>${date}</pubDate><description>${description}</description></item>`;
const xml = (body: string, status = 200, type = "application/rss+xml") => new Response(body, { status, headers: { "content-type": type } });

test("feed entries keep allowlisted links, recent dates and plain text, newest first and capped", () => {
  const raw = [
    { title: "New", url: "https://huggingface.co/blog/new", time: NOW - DAY, snippet: "s" },
    { title: "Old", url: "https://huggingface.co/blog/old", time: NOW - 90 * DAY, snippet: "" },
    { title: "Future", url: "https://huggingface.co/blog/future", time: NOW + 5 * DAY, snippet: "" },
    { title: "No date", url: "https://huggingface.co/blog/nodate", time: NaN, snippet: "" },
    { title: "Elsewhere", url: "https://evil.example/x", time: NOW - DAY, snippet: "" },
    { title: "", url: "https://huggingface.co/blog/untitled", time: NOW - DAY, snippet: "" },
    { title: "Copy", url: "https://huggingface.co/blog/new#again", time: NOW - 2 * DAY, snippet: "" },
  ];
  assert.deepEqual(shapeTechEntries("Hugging Face Blog", raw, NOW).map((row) => row.url), ["https://huggingface.co/blog/new"]);
  const many = Array.from({ length: 60 }, (_, i) => ({ title: "T" + i, url: `https://huggingface.co/blog/${i}`, time: NOW - (i + 1) * 60_000, snippet: "" }));
  assert.equal(shapeTechEntries("Hugging Face Blog", many, NOW).length, 40);
});

test("the tech reader connects only to its own feed hosts and refuses private addresses", async () => {
  assert.equal(isFetchableUrl("https://huggingface.co/blog/feed.xml"), false);
  assert.equal(isFetchableUrl("https://huggingface.co/blog/feed.xml", TECH_FEED_HOSTS), true);
  assert.equal(isFetchableUrl("https://www.straitstimes.com/news/singapore/rss.xml", TECH_FEED_HOSTS), false);
  assert.equal(isFetchableUrl("https://huggingface.co.evil.example/", TECH_FEED_HOSTS), false);
  let calls = 0;
  const fetchImpl = (async () => { calls += 1; return xml("<rss/>"); }) as unknown as typeof fetch;
  assert.equal(await safeGet("https://huggingface.co/blog/feed.xml", "rss", { fetchImpl, resolve: PUBLIC, hosts: TECH_FEED_HOSTS }), "<rss/>");
  assert.equal(await safeGet("https://huggingface.co/blog/feed.xml", "rss", { fetchImpl, resolve: async () => ["10.0.0.1"], hosts: TECH_FEED_HOSTS }), null);
  const hop = (async () => new Response(null, { status: 302, headers: { location: "https://evil.example/feed" } })) as unknown as typeof fetch;
  assert.equal(await safeGet("https://huggingface.co/blog/feed.xml", "rss", { fetchImpl: hop, resolve: PUBLIC, hosts: TECH_FEED_HOSTS }), null);
  assert.equal(calls, 1);
});

test("fetchTechEntries reads what answers, drops markup and off-list links, and counts the rest as failed", async () => {
  const feedFetch = (async (url: string) => {
    if (url.includes("huggingface")) return xml(RSS(
      item("Serving models with <b>Docker</b>", "https://huggingface.co/blog/docker", "Wed, 14 Oct 2026 08:00:00 +0000", "&lt;script&gt;alert(1)&lt;/script&gt;Containers for MLOps")
      + item("Off list", "https://evil.example/x", "Wed, 14 Oct 2026 08:00:00 +0000")));
    if (url.includes("theverge")) return xml("nope", 503);
    return new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } });
  }) as unknown as typeof fetch;
  const out = await fetchTechEntries({ fetchImpl: feedFetch, resolve: PUBLIC, now: () => NOW });
  assert.equal(out.total, TECH_SOURCES.length);
  assert.equal(out.ok, 1);
  assert.equal(out.entries.length, 1);
  assert.equal(out.entries[0].title, "Serving models with Docker");
  assert.equal(out.entries[0].source, "Hugging Face Blog");
  assert.ok(!/[<>]|script/i.test(out.entries[0].title + out.entries[0].snippet));
  assert.deepEqual(pickForSkill(out.entries, "Cloud").map((row) => row.url), ["https://huggingface.co/blog/docker"]);
  assert.equal((await fetchTechEntries({ fetchImpl: feedFetch, resolve: async () => ["127.0.0.1"], now: () => NOW })).ok, 0);
});

const limit = (max = 20) => createLimiter({ perVisitorMax: max, perVisitorWindowMs: 60_000, dailyCap: Infinity });
const good = (entries: TechEntry[] = [entry({ title: "Docker in production", url: "https://huggingface.co/blog/d" })]) => async () => ({ entries, ok: 3, total: 7 });

test("a lookup returns articles for each requested skill, labelled as our own reader with no key", async () => {
  const out = await answerSkillNews({ bodyText: '{"skills":["Cloud","Communication"]}', visitor: "v", read: good(), cache: createTechCache(), limit: limit() });
  assert.equal(out.status, 200);
  assert.equal(out.body.method, "native");
  assert.deepEqual(out.body.feeds, { ok: 3, total: 7 });
  assert.equal(out.body.cached, false);
  assert.match(String(out.body.fetchedAt), /^\d{4}-\d\d-\d\dT/);
  const results = out.body.results as Record<string, { url: string }[]>;
  assert.deepEqual(Object.keys(results), ["Cloud", "Communication"]);
  assert.equal(results.Cloud.length, 1);
  assert.deepEqual(results.Communication, []);
  assert.ok(!JSON.stringify(out.body).includes("snippet"));
});

test("a bad request is refused before any feed is read or any limit is spent", async () => {
  let reads = 0;
  const read = async () => { reads += 1; return { entries: [], ok: 1, total: 7 }; };
  const lim = limit(1);
  for (const bodyText of ["", '{"skills":["Python"],"resume":"my résumé"}', '{"skills":["Nope"]}']) {
    assert.equal((await answerSkillNews({ bodyText, visitor: "v", read, cache: createTechCache(), limit: lim })).status, 400, bodyText);
  }
  assert.equal(reads, 0);
  assert.equal((await answerSkillNews({ bodyText: '{"skills":["Python"]}', visitor: "v", read, cache: createTechCache(), limit: lim })).status, 200);
});

test("each visitor has a limit on lookups", async () => {
  const lim = limit(2);
  const ask = (visitor: string) => answerSkillNews({ bodyText: '{"skills":["Python"]}', visitor, read: good(), cache: createTechCache(), limit: lim });
  assert.equal((await ask("a")).status, 200);
  assert.equal((await ask("a")).status, 200);
  const blocked = await ask("a");
  assert.equal(blocked.status, 429);
  assert.match(String(blocked.body.error), /Try again in a little while/);
  assert.equal((await ask("b")).status, 200);
});

test("the feeds are read once and reused, also when several lookups arrive together", async () => {
  let reads = 0;
  const read = async () => { reads += 1; await new Promise((resolve) => setTimeout(resolve, 5)); return { entries: [entry({ title: "Python 4" })], ok: 2, total: 7 }; };
  const cache = createTechCache();
  const ask = () => answerSkillNews({ bodyText: '{"skills":["Python"]}', visitor: "v", read, cache, limit: limit() });
  const together = await Promise.all([ask(), ask(), ask()]);
  assert.equal(reads, 1);
  assert.ok(together.every((reply) => reply.status === 200));
  const later = await ask();
  assert.equal(reads, 1);
  assert.equal(later.body.cached, true);
});

test("the cache expires after its time", async () => {
  let clock = 0;
  let reads = 0;
  const cache = createTechCache(1000, () => clock);
  const read = async () => { reads += 1; return { entries: [], ok: 1, total: 7 }; };
  await cache.get(read);
  clock = 999;
  await cache.get(read);
  assert.equal(reads, 1);
  clock = 1001;
  await cache.get(read);
  assert.equal(reads, 2);
});

test("when no feed answers, the reply is an error with fixed text, nothing is cached, and the next lookup tries again", async () => {
  let reads = 0;
  const dead = async () => { reads += 1; return { entries: [], ok: 0, total: 7 }; };
  const cache = createTechCache();
  const first = await answerSkillNews({ bodyText: '{"skills":["Python"]}', visitor: "v", read: dead, cache, limit: limit() });
  assert.equal(first.status, 502);
  assert.equal((await answerSkillNews({ bodyText: '{"skills":["Python"]}', visitor: "v", read: dead, cache, limit: limit() })).status, 502);
  assert.equal(reads, 2);
  const throws = async () => { throw new Error("secret detail from the web"); };
  const out = await answerSkillNews({ bodyText: '{"skills":["Python"]}', visitor: "w", read: throws, cache: createTechCache(), limit: limit() });
  assert.equal(out.status, 502);
  assert.ok(!JSON.stringify(out.body).includes("secret"));
});

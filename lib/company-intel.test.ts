import assert from "node:assert/strict";
import { test } from "node:test";
import { gatherCompany, guessCompanyName, intelData, pickPages } from "./company-intel.ts";

test("the employer's name comes from a LinkedIn import or from common phrases in pasted text", () => {
  assert.equal(guessCompanyName("Associate Director - Cyber Security\nSingtel\nSingapore, Singapore\n\nSingtel Digital InfraCo’s RE:AI division is building..."), "Singtel");
  assert.equal(guessCompanyName("Data Analyst\nAcme Robotics Pte Ltd\nSingapore\n\nWork on dashboards."), "Acme Robotics");
  assert.equal(guessCompanyName("We are hiring.\nAbout Globex Systems\nGlobex Systems builds payments tools. You will write SQL."), "Globex Systems");
  assert.equal(guessCompanyName("Company: Initech Asia\nRole: Analyst"), "Initech Asia");
  assert.equal(guessCompanyName("Responsibilities\nWrite SQL queries.\nRequirements\nPython"), undefined);
});

test("pages on the company's own site that read like values or careers pages come first, and Wikipedia is never read", () => {
  const hits = [
    { title: "Acme (Wikipedia)", url: "https://en.wikipedia.org/wiki/Acme", snippet: "Acme is a company." },
    { title: "Acme official website", url: "https://www.acme.com/", snippet: "" },
    { title: "Acme careers page", url: "https://www.acme.com/careers", snippet: "" },
    { title: "Acme values", url: "https://www.acme.com/about/values", snippet: "" },
    { title: "Someone else", url: "https://news.example.org/acme", snippet: "" },
  ];
  const picked = pickPages(hits).map((hit) => hit.url);
  assert.ok(!picked.some((url) => url.includes("wikipedia")));
  assert.deepEqual(picked.slice(0, 2).sort(), ["https://www.acme.com/about/values", "https://www.acme.com/careers"]);
});

test("gatherCompany reads up to two pages, skips unreadable ones, keeps the Wikipedia line and never throws", async () => {
  const hits = [
    { title: "Acme (Wikipedia)", url: "https://en.wikipedia.org/wiki/Acme", snippet: "Acme makes widgets in Singapore." },
    { title: "Acme careers page", url: "https://www.acme.com/careers", snippet: "" },
    { title: "Acme about page", url: "https://www.acme.com/about", snippet: "" },
    { title: "Acme values", url: "https://www.acme.com/values", snippet: "" },
  ];
  const page = "We value curiosity and care. ".repeat(20);
  const web = {
    search: async (query: unknown) => ({ ok: true as const, data: { results: String(query).includes("reviews") ? [{ title: "Acme reviews", url: "https://reviews.example.com/acme", snippet: "Staff say the pace is fast." }] : hits } }),
    scrape: async (url: unknown) => (String(url).endsWith("/careers") ? ({ ok: false as const, error: "no" }) : ({ ok: true as const, data: { url, title: "Page", text: page } })),
  };
  const intel = await gatherCompany("Acme", web);
  assert.equal(intel.about, "Acme makes widgets in Singapore.");
  assert.equal(intel.pages.length, 2);
  assert.ok(intel.pages.every((item) => !item.url.endsWith("/careers")));
  assert.equal(intel.reputation[0]?.url, "https://reviews.example.com/acme");
  assert.ok(intel.sources.some((source) => source.url.includes("wikipedia")));
  assert.match(intelData(intel), /"company":"Acme"/);
  const broken = await gatherCompany("Acme", { search: async () => { throw new Error("down"); }, scrape: async () => { throw new Error("down"); } });
  assert.deepEqual(broken.pages, []);
  assert.equal(intelData(broken), "");
});

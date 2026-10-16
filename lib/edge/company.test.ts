import assert from "node:assert/strict";
import { test } from "node:test";
import { companyFromQuery, companyHits } from "./company.ts";

const pages = {
  opensearch: ["Shopee", ["Shopee"], [""], ["https://en.wikipedia.org/wiki/Shopee"]],
  summary: { extract: "Shopee is an e-commerce platform.", content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Shopee" } }, wikibase_item: "Q22902557" },
  entity: { entities: { Q22902557: { claims: { P856: [{ mainsnak: { datavalue: { value: "https://shopee.com/" } } }] } } } },
};
const getJson = async (url: string) => (url.includes("opensearch") ? pages.opensearch : url.includes("rest_v1") ? pages.summary : url.includes("wikidata") ? pages.entity : null);

test("a company gets its Wikipedia page, official site and candidate careers and about pages", async () => {
  const hits = await companyHits("Shopee", getJson);
  assert.deepEqual(hits.map((hit) => hit.url), ["https://en.wikipedia.org/wiki/Shopee", "https://shopee.com/", "https://shopee.com/careers", "https://shopee.com/about"]);
});

test("an unknown name or a failed lookup gives no hits and never throws", async () => {
  assert.deepEqual(await companyHits("Zzzz", async () => ["Zzzz", [], [], []]), []);
  assert.deepEqual(await companyHits("Shopee", async () => null), []);
  assert.deepEqual(await companyHits("x", getJson), []);
});

test("a non-https or private website from Wikidata is ignored", async () => {
  const bad = async (url: string) => (url.includes("wikidata") ? { entities: { Q22902557: { claims: { P856: [{ mainsnak: { datavalue: { value: "http://10.0.0.1/" } } }] } } } } : getJson(url));
  assert.equal((await companyHits("Shopee", bad)).length, 1);
});

test("only company-style queries are read natively, and the name is pulled out", () => {
  assert.equal(companyFromQuery("Shopee company values careers"), "Shopee");
  assert.equal(companyFromQuery("Acme Robotics culture"), "Acme Robotics");
  assert.equal(companyFromQuery("Shopee company values principles"), "Shopee");
  assert.equal(companyFromQuery("what is the culture like at Grab hiring"), "Grab");
  assert.equal(companyFromQuery("junior data analyst salary singapore 2026"), null);
  assert.equal(companyFromQuery("what is the culture like for a very long list of many different words here"), null);
});

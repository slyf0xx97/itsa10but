import test from "node:test";
import assert from "node:assert/strict";
import { COMPANIES, detectCompany, showItTips } from "./company-culture.ts";

const words = (text: string) => text.trim().split(/\s+/).length;

test("a posting that names AWS as the employer matches Amazon", () => {
  assert.equal(detectCompany("Software Development Engineer, AWS\nJoin AWS to build storage services.")?.name, "Amazon (AWS)");
  assert.equal(detectCompany("About Amazon Web Services: we run cloud infrastructure for millions of customers.")?.origin, "built-in");
  assert.equal(detectCompany("Grab is Southeast Asia's superapp. Join Grab and build for drivers and merchants.")?.name, "Grab");
  assert.equal(detectCompany("Platform Engineer at GovTech. Help build public services.")?.name, "GovTech Singapore");
});

test("tool mentions and ordinary words match nothing", () => {
  assert.equal(detectCompany("Update the meta description and meta tags on every page."), undefined);
  assert.equal(detectCompany("Junior developer. Experience with AWS, Azure and Google Cloud is a plus. Familiar with Microsoft Excel and Stripe API integrations."), undefined);
  assert.equal(detectCompany("Grab attention with clear copy. Grab the chance to learn."), undefined);
  assert.equal(detectCompany("Applicants need an enhanced DBS check."), undefined);
  assert.equal(detectCompany("Junior SOC Analyst. Use SIEM tools to triage incidents."), undefined);
});

test("Meta needs the company name, not the word", () => {
  assert.equal(detectCompany("Join Meta Platforms and work on the family of apps.")?.name, "Meta");
  assert.equal(detectCompany("Life at Meta: we build for billions of people.")?.name, "Meta");
  assert.equal(detectCompany("We read meta analyses of the studies."), undefined);
});

test("a tie between two companies gives no answer", () => {
  assert.equal(detectCompany("Join Google. Join Microsoft."), undefined);
  assert.equal(detectCompany("Data Analyst, Grab\nYou will build dashboards for the operations team and help them decide faster every single week. Tools: SQL and AWS.")?.name, "Grab");
});

test("the result is labelled as the checked list and carries sources and tips", () => {
  const company = detectCompany("About Amazon: Amazon is hiring.")!;
  assert.equal(company.origin, "built-in");
  assert.match(company.note, /^From the company's own page, checked \d{4}-\d{2}-\d{2}\.$/);
  assert.equal(company.reputation, undefined);
  assert.ok(company.showIt.length >= 1 && company.showIt.length <= 3);
  assert.ok(company.sources.length >= 1);
});

test("every built-in entry is checked, short and https", () => {
  const ids = COMPANIES.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length, "one entry per id");
  assert.ok(COMPANIES.length >= 8);
  for (const entry of COMPANIES) {
    assert.ok(entry.sources.length >= 1, entry.id);
    for (const source of entry.sources) assert.match(source.url, /^https:\/\//, `${entry.id} source`);
    assert.match(entry.checkedOn, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(entry.values.length >= 1 && entry.values.length <= 16, entry.id);
    assert.ok(entry.expectations.length >= 1 && entry.expectations.length <= 4, entry.id);
    assert.ok(entry.aliases.length + (entry.exact?.length ?? 0) >= 1, entry.id);
    for (const alias of entry.aliases) assert.equal(alias, alias.toLowerCase(), `${entry.id} aliases are lowercase`);
    for (const value of entry.values) {
      assert.ok(value.name && value.meaning, entry.id);
      assert.ok(words(value.meaning) <= 14, `${entry.id}: ${value.name} gloss is ${words(value.meaning)} words`);
      assert.notEqual(value.meaning.toLowerCase(), value.name.toLowerCase());
    }
    assert.ok(showItTips(entry.values).length >= 2, `${entry.id} gets at least two tips`);
  }
});

test("the Amazon entry lists the sixteen principles", () => {
  const amazon = COMPANIES.find((entry) => entry.id === "amazon")!;
  assert.equal(amazon.values.length, 16);
  assert.ok(amazon.values.some((value) => value.name === "Ownership"));
});

test("showItTips gives short rule-based tips, at most three, without repeats", () => {
  assert.deepEqual(showItTips([{ name: "Ownership", meaning: "Act like an owner." }]), ["Show a time you owned a problem end to end."]);
  assert.deepEqual(showItTips([]), []);
  const tips = showItTips(COMPANIES[0].values);
  assert.ok(tips.length <= 3 && new Set(tips).size === tips.length);
  for (const tip of tips) assert.ok(words(tip) <= 16, tip);
});

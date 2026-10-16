import assert from "node:assert/strict";
import { test } from "node:test";
import { LEGAL_CONTACT, LEGAL_SECTIONS } from "./legal-copy.ts";

const all = [LEGAL_CONTACT, ...LEGAL_SECTIONS.flatMap((section) => [section.title, ...(section.text ?? []), ...(section.list ?? [])])];

test("the legal popup covers copyright, advice, trademarks, outside sources and data", () => {
  assert.deepEqual(LEGAL_SECTIONS.map((section) => section.id), ["copyright", "advice", "names", "sources", "data"]);
  for (const section of LEGAL_SECTIONS) assert.ok((section.text?.length ?? 0) + (section.list?.length ?? 0) > 0, section.id);
});

test("it states the copyright holder and that a score is not a hiring prediction", () => {
  const text = all.join(" ");
  assert.match(text, /© 2026 Ghernie Encinas/);
  assert.match(text, /doesn't predict an interview or a job offer/);
  assert.match(text, /isn't career, legal, immigration or hiring advice/);
});

test("it follows the voice rules: no dashes, semicolons or middle dots", () => {
  for (const line of all) assert.doesNotMatch(line, /[—–;·]/, line);
});

import { legalSections } from "./legal-copy.ts";

const dataText = (provider?: Parameters<typeof legalSections>[0]) => (legalSections(provider).find((section) => section.id === "data")?.text ?? []).join(" ");

test("the data section names whoever receives the résumé text, and the choices before a key is entered", () => {
  assert.match(dataText(), /the AI company whose key you add \(Anthropic, Google or OpenRouter\)/);
  assert.match(dataText("gemini"), /goes to Google\./);
  assert.match(dataText("anthropic"), /goes to Anthropic\./);
  assert.match(dataText("openrouter"), /goes to OpenRouter, which passes it to the company behind the model you pick\./);
  assert.doesNotMatch(dataText("gemini"), /Anthropic/);
});

test("every company a key can send text to is in the trademark notice, and no section loses its text", () => {
  const names = legalSections().find((section) => section.id === "names")?.text?.[0] ?? "";
  for (const name of ["Anthropic", "Google", "Gemini", "OpenRouter", "Cloudflare", "Firecrawl", "MyCareersFuture"]) assert.ok(names.includes(name), name);
  for (const provider of [undefined, "anthropic", "openrouter", "gemini"] as const) {
    for (const line of legalSections(provider).flatMap((section) => [...(section.text ?? []), ...(section.list ?? [])])) assert.doesNotMatch(line, /[—–;·]/, line);
  }
});

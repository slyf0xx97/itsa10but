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

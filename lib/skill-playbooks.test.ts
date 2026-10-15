import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import type { Skill } from "./analysis-types.ts";
import { catalog } from "./preview-analysis.ts";
import { enrichQuest, playbookFor, playbooks, questFor, tipKind } from "./skill-playbooks.ts";
import { LOGO_FILES, hostOf, siteLogo } from "./site-logos.ts";

test("every catalog skill has a playbook, and nothing else is in the list", () => {
  assert.deepEqual(playbooks.map((book) => book.skill).sort(), catalog.map((seed) => seed.name).sort());
});

test("each playbook has three short steps, a résumé line to adapt and at least two https links", () => {
  for (const book of playbooks) {
    assert.equal(book.build.steps.length, 3, book.skill);
    for (const step of book.build.steps) assert.ok(step.length > 25 && step.length < 76, `${book.skill}: ${step}`);
    assert.match(book.build.bullet, /\[.+\]/, book.skill);
    assert.ok(book.links.length >= 2 && book.links.length <= 4, book.skill);
    for (const item of book.links) assert.match(item.url, /^https:\/\/\S+$/, `${book.skill}: ${item.title}`);
    assert.equal(new Set(book.links.map((item) => item.url)).size, book.links.length, book.skill);
  }
});

test("playbook text carries no time estimate and no dash", () => {
  const text = JSON.stringify(playbooks);
  assert.doesNotMatch(text, /\b(hours?|minutes? a day|days?|weekends?|weeks?)\b/i);
  assert.doesNotMatch(text, /[–—;]/);
});

test("the tip kind follows what the résumé lacks", () => {
  const base = { evidence: 0 } as Pick<Skill, "evidence" | "resumeQuote" | "breakdown">;
  const quote = { label: "Résumé", quote: "Used Python.", matched: ["python"] };
  assert.equal(tipKind(base), "build");
  assert.equal(tipKind({ evidence: 20, resumeQuote: quote, breakdown: { parts: [], demandParts: [], jobLine: null, resumeLines: [], missing: ["Used in a project or work action", "Quantified result or scope"] } }), "show");
  assert.equal(tipKind({ evidence: 60, resumeQuote: quote, breakdown: { parts: [], demandParts: [], jobLine: null, resumeLines: [], missing: ["Quantified result or scope"] } }), "measure");
});

test("questFor gives a full tip for each kind, with the steps, a line and the links", () => {
  for (const kind of ["build", "show", "measure"] as const) {
    const quest = questFor("SQL", kind)!;
    assert.equal(quest.kind, kind);
    assert.equal(quest.skill, "SQL");
    assert.equal(quest.steps?.length, 3);
    assert.ok(quest.title && quest.task && quest.proof && quest.bullet && quest.links?.length);
  }
  assert.equal(questFor("Underwater basket weaving", "build"), undefined);
});

test("a free skill name finds the catalog playbook that lists it, and a live tip is filled in without losing its own text", () => {
  assert.equal(playbookFor("PyTorch")?.skill, "Deep learning");
  assert.equal(playbookFor("  sql ")?.skill, "SQL");
  const quest = enrichQuest({ title: "Own title", task: "Own task", proof: "Own proof", skill: "PyTorch" });
  assert.equal(quest.title, "Own title");
  assert.equal(quest.steps?.length, 3);
  assert.ok(quest.links?.length);
  const unknown = { title: "A", task: "B", proof: "C", skill: "Basket weaving" };
  assert.deepEqual(enrichQuest(unknown), unknown);
});

test("logos: every mapped file exists, hosts match their parents, and a link without a file gets none", () => {
  for (const file of LOGO_FILES) assert.ok(existsSync(new URL(`../public/assets/logos/${file}.png`, import.meta.url)), file);
  assert.equal(siteLogo("https://scikit-learn.org/stable/tutorial/index.html"), "scikit-learn");
  assert.equal(siteLogo("https://docs.python.org/3/tutorial/"), "python");
  assert.equal(siteLogo("https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide"), "mdn");
  assert.equal(siteLogo("https://example.org/page"), null);
  assert.equal(hostOf("not a url"), "");
});

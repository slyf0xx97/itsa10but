import assert from "node:assert/strict";
import { test } from "node:test";
import { GLOSSARY, type TermId } from "./glossary.ts";

const ids = Object.keys(GLOSSARY) as TermId[];

test("every term has a word, a title and 1 to 3 short lines", () => {
  assert.equal(ids.length, 24);
  for (const id of ids) {
    const { word, title, lines } = GLOSSARY[id];
    assert.ok(word.trim() && title.trim(), id);
    assert.ok(lines.length >= 1 && lines.length <= 3, id);
    for (const line of lines) assert.ok(line.trim().length > 0 && line.length < 220, `${id}: ${line}`);
    for (const section of GLOSSARY[id].sections ?? []) {
      assert.ok(section.label.trim() && section.items.length >= 1 && section.items.length <= 5, `${id}: ${section.label}`);
      for (const item of section.items) assert.ok(item.trim().length > 0 && item.length < 120, `${id}: ${item}`);
    }
  }
});

test("the how-it-helps tooltip has the three labelled parts and follows the voice rules", () => {
  const { sections = [], title, lines } = GLOSSARY["how-it-helps"];
  assert.deepEqual(sections.map((section) => section.label), ["What it does", "What it doesn't do", "Your part"]);
  assert.equal(GLOSSARY["how-it-helps"].word, "show you how to improve it");
  const text = [title, ...lines, ...sections.flatMap((section) => [section.label, ...section.items])].join(" ");
  assert.doesNotMatch(text, /[—–;·]/);
  assert.doesNotMatch(text, /crucial|seamless|robust|leverage|utilize|comprehensive|empower/i);
});

test("the name tooltip explains the joke and links its source", () => {
  const { lines, source } = GLOSSARY.itsa10but;
  assert.match(lines.join(" "), /It's a 10, but/);
  assert.equal(source?.href, "https://knowyourmeme.com/memes/shes-a-10-but-hes-a-10-but");
  for (const text of [...lines, GLOSSARY.itsa10but.title]) assert.doesNotMatch(text, /[—–;·]/);
});

test("the role's ask is told in words, never as a score out of 100", () => {
  for (const id of ["expected", "good", "extra", "role-wants", "biggest-gap"] as const) assert.doesNotMatch(GLOSSARY[id].lines.join(" "), /\d/, id);
  assert.ok(!("demand-score" in GLOSSARY));
});

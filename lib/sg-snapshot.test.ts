import test from "node:test";
import assert from "node:assert/strict";
import { aiSkillsDefinition, latestAi, roleSource, signals, skillShares, snapshotForMcp, snapshotSources } from "./sg-snapshot.ts";

test("every source has a publisher, a date and an https link", () => {
  for (const source of Object.values(snapshotSources)) {
    assert.ok(source.publisher && source.title && source.published, source.id);
    assert.match(source.url, /^https:\/\/[^\s]+$/, source.id);
  }
});

test("every figure points at a known source and carries its year or period", () => {
  for (const skill of skillShares) {
    assert.ok(snapshotSources[skill.source], skill.name);
    assert.ok(skill.year >= 2024 && skill.since < skill.year, skill.name);
    assert.ok(skill.share > 0 && skill.share < 100, skill.name);
  }
  for (const signal of signals) assert.ok(snapshotSources[signal.source] && signal.period && signal.figure, signal.figure);
  assert.ok(snapshotSources[roleSource]);
  assert.ok(snapshotSources[aiSkillsDefinition.source]);
});

test("AI skills are named by IMDA's own examples, and there is no AI versus SQL ranking", () => {
  assert.equal(aiSkillsDefinition.examples.length, 5);
  for (const example of aiSkillsDefinition.examples) assert.ok(aiSkillsDefinition.text.includes(example), example);
  assert.match(snapshotSources[aiSkillsDefinition.source].url, /imda\.gov\.sg\/assets\/.+\.pdf$/);
  const out = JSON.stringify(snapshotForMcp());
  assert.ok(!/aiVersusSql|versus SQL/i.test(out));
});

test("the latest AI list is recent, dated, linked and plain", () => {
  assert.ok(latestAi.length >= 3 && latestAi.length <= 6);
  for (const item of latestAi) {
    assert.match(item.url, /^https:\/\/\S+$/, item.title);
    assert.match(item.published, /^\d{1,2} [A-Za-z]{3} 2026$/, item.title);
    assert.ok(item.title.length < 60 && item.text.length > 30 && item.text.length < 170, item.title);
    assert.ok(!/[–—]/.test(item.title + item.text), item.title);
  }
  const days = latestAi.map((item) => Date.parse(item.published + " UTC"));
  assert.deepEqual([...days].sort((a, b) => b - a), days, "newest first");
  assert.ok(new Set(latestAi.map((item) => item.url)).size === latestAi.length);
  assert.ok(!skillShares.some((skill) => skill.name === "AI skills"), "AI skills is a news line now, not a tile");
});

test("the gains are the differences IMDA's figures give", () => {
  const aws = skillShares.find((s) => s.name === "AWS")!;
  assert.equal(Math.round((aws.share - 9.9) * 10) / 10, aws.gain);
  const azure = skillShares.find((s) => s.name === "Azure")!;
  assert.equal(Math.round((azure.share - 4.8) * 10) / 10, azure.gain);
});

test("the MCP export is plain data with sources", () => {
  const out = snapshotForMcp();
  assert.equal(out.skills.length, skillShares.length);
  assert.equal(out.latestAi.length, latestAi.length);
  assert.ok(out.skills.every((s) => s.source.url.startsWith("https://")));
  assert.ok(!/[–—]/.test(JSON.stringify(out)), "no en or em dashes in published text");
});

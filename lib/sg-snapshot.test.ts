import test from "node:test";
import assert from "node:assert/strict";
import { aiSkillsDefinition, roleSource, signals, skillShares, snapshotForMcp, snapshotSources } from "./sg-snapshot.ts";

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
    if (skill.newer) assert.ok(skill.newer.year > skill.year && snapshotSources[skill.newer.source]);
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

test("the gains are the differences IMDA's figures give", () => {
  const aws = skillShares.find((s) => s.name === "AWS")!;
  assert.equal(Math.round((aws.share - 9.9) * 10) / 10, aws.gain);
  const azure = skillShares.find((s) => s.name === "Azure")!;
  assert.equal(Math.round((azure.share - 4.8) * 10) / 10, azure.gain);
});

test("the MCP export is plain data with sources", () => {
  const out = snapshotForMcp();
  assert.equal(out.skills.length, skillShares.length);
  assert.ok(out.skills.every((s) => s.source.url.startsWith("https://")));
  assert.ok(!/[–—]/.test(JSON.stringify(out)), "no en or em dashes in published text");
});

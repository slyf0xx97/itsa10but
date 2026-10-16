import test from "node:test";
import assert from "node:assert/strict";
import { jobLinkHosts, sampleJobLinks, samplePaths } from "./sample-paths.ts";
import { previewAnalysis } from "./preview-analysis.ts";
import { sampleAnalysis, sampleJob, sampleResume } from "./analysis-types.ts";
import { runSimulatedEngine } from "./simulated-engine.ts";
import { verifyQuote } from "./rag.ts";

test("sample ids are unique and there are eight samples", () => {
  assert.equal(new Set(samplePaths.map((path) => path.id)).size, samplePaths.length);
  assert.equal(samplePaths.length, 8);
});

test("every sample fits the API length limits", () => {
  for (const path of samplePaths) {
    assert.ok(path.resume.length >= 25 && path.resume.length <= 30000, `${path.id} résumé length`);
    assert.ok(path.job.length >= 30 && path.job.length <= 15000, `${path.id} job length`);
  }
});

test("every job link is https on an allowed host and carries the search term", () => {
  for (const path of samplePaths) {
    const links = sampleJobLinks(path);
    assert.equal(links.length, 3);
    for (const link of links) {
      const url = new URL(link.url);
      assert.equal(url.protocol, "https:");
      assert.ok((jobLinkHosts as readonly string[]).includes(url.hostname), `${path.id}: ${url.hostname}`);
    }
  }
});

test("each sample shows both a strength and a gap in the rules analysis", () => {
  for (const path of samplePaths) {
    const analysis = previewAnalysis([{ id: path.id, name: `${path.id}.txt`, text: path.resume }], path.job);
    assert.ok(analysis.skills.length >= 3, `${path.id} has at least 3 skills`);
    assert.ok(analysis.skills.some((skill) => skill.evidence >= 35), `${path.id} has a strength`);
    assert.ok(analysis.skills.some((skill) => skill.evidence < 35), `${path.id} has a gap`);
    assert.ok(analysis.quests.length >= 1, `${path.id} has a quest`);
  }
});

test("the first and default sample is the AI / Machine Learning Engineer role", () => {
  assert.equal(samplePaths[0].id, "ml");
  assert.equal(samplePaths[0].job, sampleJob);
  assert.equal(samplePaths[0].resume, sampleResume);
  assert.equal(sampleAnalysis.title, "AI / Machine Learning Engineer");
  assert.equal(sampleAnalysis.mode, "sample");
  assert.ok(sampleJob.split(/\s+/).length >= 60 && sampleJob.split(/\s+/).length <= 90, "job is 60 to 90 words");
  assert.ok(samplePaths.some((path) => path.id === "security"), "the security role stays as a choice");
});

test("every quote in the sample analysis is found word for word in the sample résumé or role", () => {
  let quotes = 0;
  for (const skill of sampleAnalysis.skills) {
    if (skill.resumeQuote) { quotes++; assert.ok(verifyQuote(sampleResume, skill.resumeQuote.quote), `${skill.name} résumé quote`); }
    else assert.equal(skill.evidence, 0, `${skill.name}: no résumé quote means evidence 0`);
    if (skill.roleQuote) { quotes++; assert.ok(verifyQuote(sampleJob, skill.roleQuote.quote), `${skill.name} role quote`); }
    for (const line of skill.breakdown?.resumeLines ?? []) assert.ok(verifyQuote(sampleResume, line.quote), `${skill.name} breakdown line`);
  }
  assert.ok(quotes >= 8, "the sample shows real quotes");
});

test("the sample shows both strengths and gaps, including no MLOps proof", () => {
  const by = (name: string) => sampleAnalysis.skills.find((skill) => skill.name === name);
  assert.ok(sampleAnalysis.skills.some((skill) => skill.evidence >= 70), "a strength");
  assert.equal(by("MLOps")?.evidence, 0);
  assert.ok(sampleAnalysis.skills.filter((skill) => skill.demand - skill.evidence >= 20).length >= 3, "at least three gaps");
  assert.ok(sampleAnalysis.quests.length >= 4 && sampleAnalysis.quests.length <= 6, "four to six tips");
});

test("the sample analysis matches what Play sample produces in the native scan", async () => {
  let result;
  for await (const event of runSimulatedEngine([{ id: "s", name: "AI_Machine_Learning_Engineer_sample.txt", text: sampleResume }], sampleJob)) if (event.type === "complete") result = event.result.analysis;
  assert.ok(result);
  assert.equal(result.title, sampleAnalysis.title);
  assert.equal(result.matchPercent, sampleAnalysis.matchPercent);
  assert.deepEqual(result.skills.map((skill) => [skill.name, skill.demand, skill.evidence]), sampleAnalysis.skills.map((skill) => [skill.name, skill.demand, skill.evidence]));
  assert.deepEqual(result.quests, sampleAnalysis.quests);
  assert.equal(result.ats?.score, sampleAnalysis.ats?.score);
});

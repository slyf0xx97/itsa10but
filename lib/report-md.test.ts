import assert from "node:assert/strict";
import { test } from "node:test";
import { sampleAnalysis, sampleJob, sampleResume, type Analysis } from "./analysis-types.ts";
import { previewAnalysis } from "./preview-analysis.ts";
import { buildPromptMarkdown } from "./report-md.ts";

const resumes = [{ id: "r1", name: "Mine", text: sampleResume }];
const native: Analysis = previewAnalysis(resumes, sampleJob);
const live: Analysis = { ...native, mode: "live", run: { model: "claude-test-model", claude: true, web: false } };

const quotesOf = (a: Analysis) => a.skills.flatMap((s) => (s.resumeQuote?.quote ? [s.resumeQuote.quote.replace(/\s+/g, " ").trim()] : []));

test("sample prompt says it is made up and holds both texts, every quote and the rules", () => {
  const md = buildPromptMarkdown({ analysis: sampleAnalysis, resumes, job: sampleJob, sample: true });
  assert.match(md, /made-up sample/);
  assert.ok(md.includes(sampleResume));
  assert.ok(md.includes(sampleJob));
  for (const quote of quotesOf(sampleAnalysis)) assert.ok(md.includes(quote), quote);
  assert.match(md, /Never invent employers, dates, numbers, tools or results/);
  assert.match(md, /\[add number\]/);
  for (const heading of ["## The role", "## My résumé", "## What the four readers found", "## What I want you to do", "## Output format"]) assert.ok(md.includes(heading), heading);
});

test("native scan prompt names the method and keeps reader order", () => {
  const md = buildPromptMarkdown({ analysis: native, resumes, job: sampleJob });
  assert.match(md, /native scan/i);
  assert.match(md, /not an AI reading/);
  assert.doesNotMatch(md, /made-up sample/);
  const order = ["### Role Scout", "### Experience Finder", "### Recruiter", "### Action Planner"].map((h) => md.indexOf(h));
  assert.ok(order.every((i) => i >= 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  for (const check of native.ats?.checks ?? []) assert.ok(md.includes(check.label));
  for (const quest of native.quests) assert.ok(md.includes(quest.title));
});

test("API boost prompt names the model and never says native scan was used", () => {
  const md = buildPromptMarkdown({ analysis: live, resumes, job: sampleJob });
  assert.match(md, /API boost, claude-test-model/);
  assert.doesNotMatch(md, /These findings come from a native scan/);
});

test("no hiring chance claim, and a missing ats, review or company still builds", () => {
  const bare: Analysis = { ...native, ats: undefined, review: undefined, company: undefined };
  const md = buildPromptMarkdown({ analysis: bare, resumes, job: sampleJob });
  assert.match(md, /not hiring chances/);
  assert.match(md, /No ATS-style check was run/);
  assert.doesNotMatch(md, /probability|likely to be hired|chance of (?:getting )?hired/i);
});

test("backticks in the résumé cannot close the fence, and output is stable", () => {
  const text = "Built ```code``` things";
  const input = { analysis: native, resumes: [{ id: "x", name: "x", text }], job: sampleJob };
  const md = buildPromptMarkdown(input);
  assert.ok(md.includes("````text\n" + text + "\n````"));
  assert.equal(buildPromptMarkdown(input), md);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { previewAnalysis } from "./preview-analysis.ts";
import { sampleJob, sampleResume } from "./analysis-types.ts";

const strongText = `Alex Tan | AI Engineer\nSkills: Python, PyTorch, SQL, AWS, MLOps, Docker\nBuilt a Python model with PyTorch that cut labelling time by 40% across 12,000 photos.\nDeployed it on AWS with Docker and MLOps tooling, serving 300 requests a day.\nWrote SQL queries in PostgreSQL that joined 3 datasets and saved 5 hours a week.\nhttps://github.com/alex`;

test("every native scan gets at least three improvements, even a strong résumé", () => {
  for (const text of [sampleResume, strongText]) {
    const review = previewAnalysis([{ id: "a", name: "cv.txt", text }], sampleJob).review!;
    assert.ok(review.improvements.length >= 3);
    assert.ok(review.strengths.length >= 1 && review.questions.length === 3 && review.skim.length >= 3);
    for (const item of review.improvements) assert.ok(item.title && item.why);
  }
});

test("a quoted line in a note is a real line of the résumé", () => {
  const review = previewAnalysis([{ id: "a", name: "cv.txt", text: sampleResume }], sampleJob).review!;
  const quoted = review.improvements.filter((item) => item.quote);
  assert.ok(quoted.length >= 1);
  for (const item of quoted) assert.ok(sampleResume.replace(/\s+/g, " ").includes(item.quote!.replace(/…$/, "").trim()), item.quote);
});

test("a weak phrase and a missing skill are called out by name", () => {
  const text = "Jo Lee\nResponsible for helping the team with reports.\nWorked on a spreadsheet for the office.\nSkills: Excel, Word";
  const review = previewAnalysis([{ id: "a", name: "cv.txt", text }], sampleJob).review!;
  assert.ok(review.improvements.some((item) => /Replace "/.test(item.title)));
  assert.ok(review.improvements.some((item) => /^Show /.test(item.title)));
});

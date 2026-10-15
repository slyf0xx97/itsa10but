import test from "node:test";
import assert from "node:assert/strict";
import { scoreEvidence } from "./evidence-scoring.ts";
import { previewAnalysis } from "./preview-analysis.ts";
import { computeMatch } from "./scoring.ts";

test("each component sums exactly to its displayed score and points to source text", () => {
  const resumes = [{ id: "1", name: "CV", text: "Skills: Python, SQL.\nBuilt Python APIs and reduced latency by 20%.\nCreated SQL queries for 40 users." }];
  const job = "Python is required. Use Python and SQL.";
  const result = previewAnalysis(resumes, job);
  for (const skill of result.skills) {
    assert.ok(skill.breakdown);
    assert.equal(skill.breakdown.parts.reduce((sum, part) => sum + part.points, 0), skill.evidence);
    assert.equal(skill.breakdown.demandParts.reduce((sum, part) => sum + part.points, 0), skill.demand);
    for (const part of skill.breakdown.parts) assert.ok(resumes.some(resume => resume.text.includes(part.line!.quote)));
    for (const part of skill.breakdown.demandParts) assert.ok(job.includes(part.line!.quote));
  }
  const weighted = result.skills.reduce((sum, skill) => sum + skill.evidence * skill.demand, 0);
  const weights = result.skills.reduce((sum, skill) => sum + skill.demand, 0);
  assert.equal(result.matchPercent, Math.round(weighted / weights));
});
test("no evidence means zero, and unrelated numbers do not count", () => {
  assert.equal(scoreEvidence("Python", ["python"], [], "Python required").evidence, 0);
  assert.equal(scoreEvidence("Python", ["python"], [{ id: "1", name: "CV", text: "Python\nSaved 20% using Java" }], "Java required").demand, 0);
  const score = scoreEvidence("Python", ["python"], [{ id: "1", name: "CV", text: "Python\nSaved 20% using Java" }], "Python");
  assert.equal(score.evidence, 20);
  assert.equal(computeMatch([]).percent, 0);
});
test("duplicating a résumé cannot increase a score", () => {
  const resume = { id: "1", name: "CV", text: "Built Python tools." };
  assert.equal(scoreEvidence("Python", ["python"], [resume], "Python").evidence, scoreEvidence("Python", ["python"], [resume, resume], "Python").evidence);
});

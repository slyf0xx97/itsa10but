import test from "node:test";
import assert from "node:assert/strict";
import { chunkResume, retrieveForSkill, buildRetrievalSteps, verifyQuote, scoreWithGrounding } from "./rag.ts";

test("chunks résumé text into one passage per line or sentence", () => {
  const chunks = chunkResume("Built a Python log parser.\nConfigured a Linux home lab.");
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].text, "Built a Python log parser.");
  assert.equal(chunks[1].text, "Configured a Linux home lab.");
});

test("retrieves the best matching chunk for a skill and cites it", () => {
  const chunks = chunkResume("Studied networking basics.\nBuilt a Python log parser that flags repeated failed logins.");
  const step = retrieveForSkill(chunks, { name: "Python", terms: ["python"] });
  assert.equal(step.bestChunk?.text, "Built a Python log parser that flags repeated failed logins.");
  assert.ok(step.matchedTerms.includes("python"));
});

test("a skill with no matching chunk gets no citation and a zero score", () => {
  const chunks = chunkResume("Studied networking basics.");
  const step = retrieveForSkill(chunks, { name: "Python", terms: ["python"] });
  assert.equal(step.bestChunk, undefined);
  assert.equal(step.score, 0);
});

test("builds retrieval steps only for skills the job or résumé actually mention", () => {
  const chunks = chunkResume("Built a Python log parser.");
  const steps = buildRetrievalSteps(chunks, "Junior SOC analyst role needing Python and SIEM.");
  const skillNames = steps.map((step) => step.skill);
  assert.ok(skillNames.includes("Python"));
  assert.ok(!skillNames.includes("React"));
});

test("a quote not found in the source text is not grounded and scores 0", () => {
  const source = "Built a Python log parser for failed logins.";
  assert.equal(verifyQuote(source, "Built a Python log parser for failed logins."), true);
  assert.equal(verifyQuote(source, "Led a team of ten engineers."), false);
  assert.equal(scoreWithGrounding(80, "Led a team of ten engineers.", source), 0);
  assert.equal(scoreWithGrounding(80, "Built a Python log parser for failed logins.", source), 80);
});

test("quote check ignores whitespace, case and typographic quotes but not words", () => {
  const source = "Built a parser\nthat flags “failed” logins – daily. It’s fast.";
  assert.equal(verifyQuote(source, 'built a parser that  flags "failed" logins - daily.'), true);
  assert.equal(verifyQuote(source, "It's fast"), true);
  assert.equal(verifyQuote(source, "built a parser that flags failed logins"), false);
  assert.equal(verifyQuote(source, "   "), false);
});

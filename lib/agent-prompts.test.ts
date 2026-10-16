import assert from "node:assert/strict";
import test from "node:test";
import { AGENT_PROMPTS, promptFor, schemaLines } from "./agent-prompts.ts";
import { AGENT_FACTS } from "./agent-facts.ts";
import { roleScout } from "./agents/role-scout.ts";
import { SHARED_PREAMBLE } from "./agents/shared.ts";

test("there is one Markdown file per agent, in run order, named after the agent", () => {
  assert.deepEqual(AGENT_PROMPTS.map((prompt) => prompt.file), ["role-scout.md", "experience-finder.md", "recruiter.md", "action-planner.md"]);
  assert.deepEqual(AGENT_PROMPTS.map((prompt) => prompt.name), AGENT_FACTS.map((fact) => fact.name));
});

test("each file carries the real role prompt and the shared rules, taken from the spec", () => {
  const scout = promptFor("Role Scout")!.markdown;
  assert.match(scout, /^# Role Scout\n/);
  assert.ok(scout.includes(roleScout.system.split("\n\n---\n\n")[1].trim()));
  assert.ok(scout.includes(SHARED_PREAMBLE.trim()));
  for (const prompt of AGENT_PROMPTS) for (const heading of ["## Role prompt", "## Shared rules", "## What it receives", "## Tools", "## Answer format", "## When it refuses"]) assert.ok(prompt.markdown.includes(heading), prompt.name + " " + heading);
});

test("the tool list matches the spec and an agent with no tools says so", () => {
  const scout = promptFor("Role Scout")!.markdown;
  for (const tool of roleScout.tools) assert.ok(scout.includes(`- ${tool}:`), tool);
  assert.match(promptFor("Recruiter")!.markdown, /- None\. Everything it needs is in the message\./);
});

test("the answer format lists every field with its type, and nested fields are indented", () => {
  const lines = schemaLines(roleScout.outputSchema);
  assert.ok(lines.some((line) => line.startsWith("- title (text)")));
  assert.ok(lines.some((line) => line.startsWith("- skills (list of objects)")));
  assert.ok(lines.some((line) => line.startsWith("  - roleQuote (text)")));
  assert.ok(lines.some((line) => line.startsWith("- company (object or null)")));
});

test("no file holds a key or secret", () => {
  for (const prompt of AGENT_PROMPTS) assert.doesNotMatch(prompt.markdown, /sk-ant|sk-or-|api[_-]?key\s*[:=]/i, prompt.name);
});

import assert from "node:assert/strict";
import test from "node:test";
import { STACK_GROUPS } from "./tech-stack.ts";

const lines = STACK_GROUPS.flatMap((group) => [group.title, group.blurb, ...group.items.flatMap((item) => [item.name, ...item.lines])]);

test("the stack has five groups in a fixed order, each with items that say how they are used", () => {
  assert.deepEqual(STACK_GROUPS.map((group) => group.id), ["app", "agents", "native", "data", "plumbing"]);
  for (const group of STACK_GROUPS) {
    assert.ok(group.items.length >= 4, group.id);
    for (const item of group.items) assert.ok(item.name.trim() && item.lines.length >= 1 && item.lines.length <= 3, item.name);
  }
  const names = STACK_GROUPS.flatMap((group) => group.items.map((item) => item.name));
  assert.equal(new Set(names).size, names.length, "no item appears twice");
});

test("the agents group covers how each agent is prompt-engineered", () => {
  const agents = STACK_GROUPS.find((group) => group.id === "agents")!.items.map((item) => item.name);
  for (const name of ["Shared rules", "Untrusted data tags", "JSON schema answers", "Tool grants", "Quote checks", "Limits and fallback", "Prompt files"]) assert.ok(agents.includes(name), name);
});

test("it follows the voice rules: no dashes, semicolons or middle dots", () => {
  for (const line of lines) assert.doesNotMatch(line, /[—–;·]/, line);
});

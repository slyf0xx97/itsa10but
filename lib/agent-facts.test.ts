import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { AGENT_FACTS, WEB_TOOLS, hasWeb, readsResume } from "./agent-facts.ts";
import { AGENT_SPECS } from "./agents/index.ts";
import { NETWORK_TOOLS } from "./agents/shared.ts";

test("agent facts shown in the UI match the agent specs", () => {
  assert.equal(AGENT_FACTS.length, AGENT_SPECS.length);
  assert.deepEqual([...WEB_TOOLS].sort(), [...NETWORK_TOOLS].sort());
  AGENT_SPECS.forEach((spec, index) => {
    const fact = AGENT_FACTS[index];
    assert.equal(fact.name, spec.name);
    assert.deepEqual(fact.tools.map((tool) => tool.name).sort(), [...spec.tools].sort(), spec.name);
    assert.equal(fact.toolCalls, spec.limits.maxToolCalls, spec.name);
    assert.equal(fact.seconds * 1000, spec.limits.timeoutMs, spec.name);
    for (const tool of fact.tools) {
      const cap = (spec.limits.perTool as Record<string, number | undefined>)[tool.name];
      assert.equal(tool.cap, cap !== undefined && cap < spec.limits.maxToolCalls ? cap : undefined, `${spec.name} ${tool.name}`);
    }
    assert.equal(hasWeb(fact), spec.tools.some((tool) => NETWORK_TOOLS.includes(tool)), spec.name);
    assert.equal(readsResume(fact), spec.tools.includes("search_resume_passages"), spec.name);
    if (readsResume(fact)) assert.ok(fact.resumeAccess, `${spec.name} reads the résumé`);
  });
});

test("agent facts carry no model name", () => {
  for (const fact of AGENT_FACTS) assert.ok(!("model" in fact), fact.name);
  assert.doesNotMatch(JSON.stringify(AGENT_FACTS), /claude|haiku|sonnet|opus/i);
});

const words = (text: string) => text.trim().split(/\s+/).length;

test("card copy stays short and its can't line matches the tools", () => {
  for (const fact of AGENT_FACTS) {
    const line = fact.tagline.join("");
    assert.ok(fact.tagline[1].length > 0 && line.includes(fact.tagline[1]), `${fact.name} key phrase`);
    for (const [label, text] of [["tagline", line], ["strongAt", fact.strongAt], ["cant", fact.cant]] as const) {
      assert.ok(words(text) <= 12, `${fact.name} ${label} is too long`);
    }
    assert.equal(fact.moves.length, 3, `${fact.name} moves`);
    for (const move of fact.moves) {
      assert.ok(words(move.label) >= 2 && words(move.label) <= 4, `${fact.name} move label ${move.label}`);
      assert.ok(words(move.detail) <= 6, `${fact.name} move detail ${move.detail}`);
      assert.ok(existsSync(`public/assets/icons/abilities/${move.icon}`), `${fact.name} icon ${move.icon}`);
    }
    for (const tool of fact.tools) assert.ok(words(tool.label) >= 2 && words(tool.label) <= 5, `${fact.name} ${tool.name} label`);
    // The can't line must name what the agent really lacks.
    if (!hasWeb(fact)) assert.match(fact.cant, /web/i, fact.name);
    if (!readsResume(fact)) assert.match(fact.cant, /résumé/i, fact.name);
  }
});

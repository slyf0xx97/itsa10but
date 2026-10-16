import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { AGENT_FACTS, WEB_TOOLS, hasWeb, readsResume } from "./agent-facts.ts";
import { AGENT_PROFILES } from "./agent-abilities.ts";
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

test("card copy stays short and its can't list matches the tools", () => {
  for (const fact of AGENT_FACTS) {
    const line = fact.tagline.join("");
    assert.ok(fact.tagline[1].length > 0 && line.includes(fact.tagline[1]), `${fact.name} key phrase`);
    assert.ok(words(line) <= 12, `${fact.name} tagline is too long`);
    assert.equal(fact.moves.length, 3, `${fact.name} moves`);
    for (const move of fact.moves) {
      assert.ok(words(move.label) >= 2 && words(move.label) <= 4, `${fact.name} move label ${move.label}`);
      assert.ok(words(move.detail) <= 6, `${fact.name} move detail ${move.detail}`);
      assert.ok(existsSync(`public/assets/icons/abilities/${move.icon}`), `${fact.name} icon ${move.icon}`);
    }
    for (const tool of fact.tools) {
      assert.ok(words(tool.label) >= 2 && words(tool.label) <= 5, `${fact.name} ${tool.name} label`);
      // The popup explains each tool with the matching ability line, so it must exist.
      assert.ok(AGENT_PROFILES[fact.name].abilities.some((ability) => ability.tool === tool.name), `${fact.name} ${tool.name} ability`);
    }
    // The can't list must name what the agent really lacks.
    const cannot = fact.cannot.join(" ");
    if (!hasWeb(fact)) assert.match(cannot, /web/i, fact.name);
    if (!readsResume(fact)) assert.match(cannot, /résumé/i, fact.name);
  }
});

test("popup copy is short, plain and backed by real icons", () => {
  for (const fact of AGENT_FACTS) {
    assert.ok(words(fact.summary) <= 22, `${fact.name} summary`);
    assert.ok(fact.looksAt.length >= 1 && fact.looksAt.length <= 3, `${fact.name} looksAt`);
    assert.ok(fact.gives.length >= 1 && fact.gives.length <= 3, `${fact.name} gives`);
    for (const item of [...fact.looksAt, ...fact.gives]) {
      assert.ok(words(item.label) <= 6, `${fact.name} chip ${item.label}`);
      assert.ok(existsSync(`public/assets/icons/abilities/${item.icon}`), `${fact.name} icon ${item.icon}`);
    }
    // A chip marked API boost only must come from a web tool, and a web agent must mark them.
    assert.equal([...fact.looksAt, ...fact.gives].some((item) => item.boost), hasWeb(fact), `${fact.name} boost chips`);
    assert.ok(fact.does.length >= 1 && fact.cannot.length >= 1 && fact.goodToKnow.length >= 1, `${fact.name} lists`);
    for (const text of [...fact.does, ...fact.cannot, ...fact.goodToKnow]) assert.ok(words(text) <= 16, `${fact.name}: ${text}`);
  }
});

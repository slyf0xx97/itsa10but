import assert from "node:assert/strict";
import { test } from "node:test";
import { sampleAnalysis } from "./analysis-types.ts";
import { POPUP_ADDS, companyMissing, modeInfo, quoteRows, readerSteps, type ReaderKey } from "./findings-info.ts";

const readers: ReaderKey[] = ["scout", "finder", "recruiter", "planner"];

test("each mode is named for the run that made it", () => {
  assert.equal(modeInfo("live").name, "API boost");
  assert.equal(modeInfo("preview").name, "Native scan");
  assert.equal(modeInfo("sample").name, "Sample");
  assert.doesNotMatch(modeInfo("live").note + modeInfo("live").steps, /native scan|text rules/i);
  assert.doesNotMatch(modeInfo("preview").note + modeInfo("preview").steps, /claude/i);
});

test("every reader has steps and a card line", () => {
  for (const reader of readers) {
    assert.ok(readerSteps(reader, sampleAnalysis).length >= 3, reader);
    assert.ok(POPUP_ADDS[reader].length > 0, reader);
  }
});

test("steps report the sample counts", () => {
  const scout = readerSteps("scout", sampleAnalysis);
  assert.match(scout[0], /6 skills/);
  const finder = readerSteps("finder", sampleAnalysis).join(" ");
  assert.match(finder, /The other 1 had no match and score 0/);
  assert.match(readerSteps("planner", sampleAnalysis).join(" "), /Picked [4-6] tips/);
});

test("steps do not break on an empty analysis", () => {
  const empty = { ...sampleAnalysis, skills: [], quests: [], ats: undefined, company: undefined };
  for (const reader of readers) assert.ok(readerSteps(reader, empty).length > 0, reader);
});

test("a missing quote comes back as null", () => {
  const rows = quoteRows(sampleAnalysis.skills);
  assert.equal(rows.find((row) => row.name === "MLOps")?.resume, null);
  assert.ok(rows.find((row) => row.name === "Python")?.resume?.quote);
  assert.deepEqual(quoteRows(sampleAnalysis.skills, ["python", "nope"]).map((row) => row.name), ["Python"]);
});

test("all four readers name the same mode in the same page state", () => {
  // Before the visitor runs anything, even a result object that says "preview" is shown as the sample.
  for (const mode of ["sample", "preview", "live"] as const) {
    const names = readers.map(() => modeInfo(mode, false).name);
    assert.deepEqual(new Set(names), new Set(["Sample"]), `before a run, analysis mode ${mode}`);
  }
  // After a run, nothing says Sample, and the badge follows the mode that ran.
  assert.equal(modeInfo("sample", true).name, "Native scan");
  assert.equal(modeInfo("preview", true).name, "Native scan");
  assert.equal(modeInfo("live", true).name, "API boost");
  // Without page state the analysis mode decides, as before.
  assert.equal(modeInfo("preview").name, "Native scan");
});

test("the missing-company message depends on the mode and invents nothing", () => {
  for (const mode of ["sample", "preview"] as const) {
    const native = companyMissing(mode);
    assert.match(native.short, /Agent power/);
    assert.match(native.text, /Native scan/);
    assert.match(native.text, /Agent power/);
  }
  const live = companyMissing("live");
  assert.doesNotMatch(live.short + live.title + live.text, /native scan|Turn on/i);
  assert.match(live.text, /found nothing/);
});

test("the Recruiter steps say what passed, to check and to fix mean, without the word cold", () => {
  const steps = readerSteps("recruiter", sampleAnalysis).join(" ");
  assert.match(steps, /passed \(nothing to do\)/);
  assert.doesNotMatch(steps, /cold/i);
});

test("an API boost result names the recommended mix or the model the visitor picked, never one we assumed", () => {
  const mix = modeInfo("live", true, { model: "recommended mix", claude: true, web: true });
  assert.equal(mix.name, "API boost, recommended mix");
  assert.doesNotMatch(mix.name + mix.note + mix.steps, /claude|haiku|sonnet|opus|anthropic/i);
  assert.doesNotMatch(mix.note, /Web search was off/);
  const picked = modeInfo("live", true, { model: "Opus 5.5", claude: true, web: true });
  assert.equal(picked.name, "API boost, Opus 5.5");
  assert.doesNotMatch(picked.note + picked.steps, /claude|native scan/i);
  const other = modeInfo("live", true, { model: "GPT-5.6 Terra", claude: false, web: false });
  assert.equal(other.name, "API boost, GPT-5.6 Terra");
  assert.doesNotMatch(other.note + other.steps, /claude|native scan/i);
  assert.match(other.note, /Web search was off for this run/);
  assert.equal(modeInfo("live", true).name, "API boost");
});

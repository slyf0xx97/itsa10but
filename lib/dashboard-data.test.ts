import test from "node:test";
import assert from "node:assert/strict";
import type { AtsReport, CompanyCulture, Quest, Skill } from "./analysis-types.ts";
import { coverage, atsCounts, atsSegments, atsVerdict, companyView, atsGroups, atsView, chipList, dashboardData, demandBars, fixParts, quoteCount, rankSkills, weakGroups, weakReason, plannerRows, weakProofs } from "./dashboard-data.ts";

const sk = (name: string, demand: number, evidence: number, quoted = false): Skill => ({ name, demand, evidence, detail: "", source: "", ...(quoted ? { resumeQuote: { label: "r", quote: "q", matched: [] } } : {}) });
const skills = [sk("A", 60, 70, true), sk("B", 90, 0), sk("C", 80, 20, true), sk("D", 50, 49)];
const quests: Quest[] = [{ title: "Do B", task: "", proof: "", skill: "b" }];

test("demand bars sort high to low and keep input order on ties", () => {
  assert.deepEqual(demandBars([sk("x", 50, 0), sk("y", 80, 0), sk("z", 50, 0)]).map((b) => b.name), ["y", "x", "z"]);
});

test("rank the skills: highest ask first, ties keep input order, input untouched", () => {
  const input = [sk("x", 50, 0), sk("y", 80, 0), sk("z", 50, 0)];
  assert.deepEqual(rankSkills(input).map((s) => s.name), ["y", "x", "z"]);
  assert.deepEqual(input.map((s) => s.name), ["x", "y", "z"]);
  assert.deepEqual(rankSkills([]), []);
});

test("planner rows: max three, skill matched case-insensitively, plain-word why, neutral line when no skill matches", () => {
  const many: Quest[] = ["B", "a", "x", "C"].map((skill) => ({ title: "Do " + skill, task: "", proof: "", skill }));
  const rows = plannerRows(skills, many);
  assert.equal(rows.length, 3);
  assert.deepEqual([rows[0].index, rows[0].title, rows[0].want, rows[0].proof], [0, "Do B", "High", "None"]);
  assert.equal(rows[0].why, "Asked for a lot. Your résumé shows nothing yet.");
  assert.deepEqual([rows[1].want, rows[1].proof], ["Medium", "Strong"]);
  assert.deepEqual([rows[2].want, rows[2].proof], ["None", "None"]);
  assert.equal(rows[2].why, "A tip that gives you something to show for x.");
  assert.deepEqual(plannerRows([], []), []);
  assert.equal(dashboardData({ skills, quests: many, matchPercent: 50 } as never).planner.length, 3);
});

test("weak proofs: missing quote or thin evidence, weakest first, reason shortened", () => {
  const weak = weakProofs([sk("A", 60, 70, true), sk("B", 90, 0), sk("C", 80, 20, true), sk("D", 50, 80)]);
  assert.deepEqual(weak.map((w) => [w.name, w.kind]), [["B", "missing"], ["C", "thin"], ["D", "missing"]]);
  assert.equal(weak[0].reason, "no line in your résumé matches");
  assert.equal(weak[1].reason, "listed, but no project or result backs it up");
  assert.equal(weakReason(80, false), "scored, but no quote in your résumé backs it up");
  assert.deepEqual(weakGroups(weak), [{ reason: "no line in your résumé matches", names: ["B"] }, { reason: "listed, but no project or result backs it up", names: ["C"] }, { reason: "scored, but no quote in your résumé backs it up", names: ["D"] }]);
  assert.deepEqual(weakGroups([...weak, { ...weak[0], name: "E" }]).map((g) => g.names), [["B", "E"], ["C"], ["D"]]);
  assert.deepEqual(weakProofs([]), []);
});

const ats: AtsReport = {
  score: 62.4, note: "n", fixes: ["Add a skills section: list tools", "b", "c", "d"],
  keywordsFound: ["a", "b"], keywordsMissing: Array.from({ length: 11 }, (_, i) => "k" + i),
  checks: [
    { id: "1", group: "format", label: "f", status: "pass", tip: "" },
    { id: "2", group: "parse", label: "p", status: "fail", tip: "" },
    { id: "3", group: "parse", label: "p2", status: "warn", tip: "" },
  ],
};

test("ats groups keep a fixed order, counts add up, chips cap at eight, fixes cap at three", () => {
  assert.deepEqual(atsGroups(ats).map((g) => g.id), ["parse", "format"]);
  assert.deepEqual(atsCounts(ats), { pass: 1, warn: 1, fail: 1, total: 3 });
  assert.deepEqual(chipList(ats.keywordsMissing), { shown: ats.keywordsMissing.slice(0, 8), more: 3 });
  const view = atsView(ats)!;
  assert.equal(view.score, 62);
  assert.equal(view.fixes.length, 3);
  assert.deepEqual(view.fixes[0], { key: "Add a skills section", rest: ": list tools" });
  assert.deepEqual(fixParts("Use plain headings everywhere"), { key: "Use plain headings", rest: " everywhere" });
});

test("missing ats is tolerated", () => {
  assert.equal(atsView(undefined), null);
  assert.deepEqual(atsGroups(undefined), []);
  assert.deepEqual(atsCounts(undefined), { pass: 0, warn: 0, fail: 0, total: 0 });
  assert.deepEqual(chipList(undefined), { shown: [], more: 0 });
  assert.equal(dashboardData({ skills: [], quests: [], matchPercent: 0 } as never).ats, null);
});

test("ats verdict thresholds and segment counts", () => {
  assert.deepEqual([100, 80, 79, 60, 59, 0].map((s) => atsVerdict(s).word), ["Ready", "Ready", "Almost there", "Almost there", "Needs work", "Needs work"]);
  assert.equal(atsVerdict(70).tone, "almost");
  assert.deepEqual([0, 4, 5, 88, 100, 140, -3, Number.NaN].map(atsSegments), [0, 0, 1, 9, 10, 10, 0, 0]);
  const view = atsView({ ...ats, score: 88 })!;
  assert.deepEqual([view.verdict.word, view.segments], ["Ready", 9]);
  assert.deepEqual(view.allGroups.map((g) => [g.id, g.checks.length]), [["parse", 2], ["format", 1]]);
});

const company = (count: number, extra: Partial<CompanyCulture> = {}): CompanyCulture => ({
  name: "Acme", origin: "built-in", note: "n", expectations: ["a", "b", "c", "d", "e"], showIt: ["1", "2", "3", "4"], sources: [{ label: "Careers", url: "https://example.com" }],
  values: Array.from({ length: count }, (_, i) => ({ name: "v" + i, meaning: "m" + i })), ...extra,
});

test("company view caps chips at 12 with a count, keeps every value, caps tips and expectations", () => {
  assert.equal(companyView(undefined), null);
  const view = companyView(company(15))!;
  assert.equal(view.chips.shown.length, 12);
  assert.equal(view.chips.more, 3);
  assert.equal(view.values.length, 15);
  assert.equal(view.expectations.length, 4);
  assert.equal(view.showIt.length, 3);
  assert.deepEqual(view.reputation, []);
  assert.equal(view.originLabel, "Official page");
  assert.equal(companyView(company(2, { origin: "web", reputation: ["x"] }))!.originLabel, "Found on the web");
  assert.equal(companyView(company(12))!.chips.more, 0);
  assert.equal(dashboardData({ skills: [], quests: [], matchPercent: 0 } as never).company, null);
});

test("quote count and empty input are safe", () => {
  assert.equal(quoteCount(skills), 2);
  assert.deepEqual(demandBars([]), []);
  const data = dashboardData({ skills: [], quests: [], matchPercent: Number.NaN } as never);
  assert.equal(data.match, 0);
});

test("chip lists cap at the limit and count the rest; keywords in the Checks tab keep up to 30", () => {
  assert.deepEqual(chipList(["a", "b", "c"], 2), { shown: ["a", "b"], more: 1 });
  const view = dashboardData({ skills, quests, matchPercent: 50, ats: { ...ats, fixes: ["a", "b", "c", "d"] } } as never).ats!;
  assert.equal(view.fixes.length, 3);
  assert.deepEqual([view.missing.shown.length, view.missing.more], [11, 0]);
});

test("coverage marks follow demand order and the Have threshold; the dashboard carries weak names and the quote count", () => {
  assert.deepEqual(coverage(skills), { marks: ["gap", "gap", "have", "have"], have: 2, total: 4 });
  assert.deepEqual(coverage([]), { marks: [], have: 0, total: 0 });
  const data = dashboardData({ skills, quests, matchPercent: 50 } as never);
  assert.deepEqual(data.weakNames, ["B", "C", "D"]);
  assert.deepEqual([data.quotes, data.coverage.have], [2, 2]);
});

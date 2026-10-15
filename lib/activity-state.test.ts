import test from "node:test";
import assert from "node:assert/strict";
import { applyActivity, emptyActivity, LOG_LINES } from "./activity-state.ts";
import type { ActivityEvent } from "./simulated-engine.ts";

const ev = (extra: Partial<ActivityEvent>): ActivityEvent => ({ type: "activity", agent: "Recruiter", lane: "quote-verify", label: "Checking each quote is literal", status: "start", simulated: true, mode: "rules", ...extra });

test("keeps the latest state per agent and lane without mutating the old state", () => {
  const a = applyActivity(emptyActivity, ev({ progress: 0 }));
  const b = applyActivity(a, ev({ lane: "evidence-score", label: "Scoring the evidence", progress: 0 }));
  const c = applyActivity(b, ev({ status: "progress", progress: 50, detail: "Python: quote is literal" }));
  const d = applyActivity(c, ev({ status: "done", progress: 100, detail: "3 quotes verified" }));
  assert.deepEqual(emptyActivity, {});
  assert.equal(a.Recruiter?.lanes["quote-verify"].progress, 0);
  assert.equal(c.Recruiter?.lanes["quote-verify"].progress, 50);
  assert.equal(c.Recruiter?.lanes["evidence-score"].progress, 0, "other lanes keep their own state");
  assert.equal(d.Recruiter?.lanes["quote-verify"].status, "done");
  assert.equal(d.Recruiter?.lanes["quote-verify"].detail, "3 quotes verified");
  assert.deepEqual(d.Recruiter?.order, ["quote-verify", "evidence-score"]);
  assert.equal(d["Role Scout"], undefined);
});

test("live tool lanes start with unknown progress, count repeat calls and finish at 100", () => {
  const live = { simulated: false, mode: "live" as const, agent: "Role Scout" as const, lane: "firecrawl_search", label: "Searching the web" };
  let s = applyActivity(emptyActivity, ev({ ...live, status: "start", detail: '"soc analyst skills"' }));
  assert.equal(s["Role Scout"]?.lanes.firecrawl_search.progress, null);
  s = applyActivity(s, ev({ ...live, status: "done", progress: 100, detail: "5 results" }));
  s = applyActivity(s, ev({ ...live, status: "start" }));
  const lane = s["Role Scout"]!.lanes.firecrawl_search;
  assert.equal(lane.calls, 2);
  assert.equal(lane.progress, null);
});

test("the log keeps only the last few lines and skips events with nothing to say", () => {
  let s = emptyActivity;
  for (let i = 0; i < 8; i++) s = applyActivity(s, ev({ status: "progress", progress: i * 10, detail: `step ${i}` }));
  s = applyActivity(s, ev({ status: "progress", progress: 90 }));
  const log = s.Recruiter!.log;
  assert.equal(log.length, LOG_LINES);
  assert.ok(log.at(-1)!.text.endsWith("step 7"));
  assert.deepEqual(log.map((line) => line.id), [5, 6, 7, 8]);
});

test("a live run that falls back to rules starts that agent's lanes afresh", () => {
  let s = applyActivity(emptyActivity, ev({ mode: "live", simulated: false, lane: "check_quote", status: "done", progress: 100, detail: "1 of 1 quotes found so far" }));
  s = applyActivity(s, ev({ status: "start", progress: 0 }));
  assert.equal(s.Recruiter?.mode, "rules");
  assert.deepEqual(s.Recruiter?.order, ["quote-verify"]);
});

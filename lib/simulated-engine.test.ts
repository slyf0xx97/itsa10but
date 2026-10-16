import test from "node:test";
import assert from "node:assert/strict";
import { runSimulatedEngine, READER_NAMES } from "./simulated-engine.ts";

const resumes = [{ id: "1", name: "Alex", text: "Built a Python log parser. Configured a Linux home lab. Email: alex@example.com." }];
const job = "Junior SOC analyst role. Use SIEM tools, Python and Linux to triage incidents.";

async function collect() {
  const events = [];
  for await (const event of runSimulatedEngine(resumes, job)) events.push(event);
  return events;
}

test("every event is labelled as a simulation or explicitly a real safety check", async () => {
  const events = await collect();
  for (const event of events) {
    if (event.type === "error") continue;
    assert.equal(typeof event.simulated, "boolean", `${event.type} should carry a simulated flag`);
  }
  assert.ok(events.some((event) => event.type === "safety" && event.simulated === false));
});

test("runs all four readers in the documented order with a handoff before each", async () => {
  const events = await collect();
  const stages = events.filter((event) => event.type === "stage") as Extract<typeof events[number], { type: "stage" }>[];
  assert.equal(stages.length, READER_NAMES.length);
  assert.deepEqual(stages.map((stage) => stage.agent.role), [...READER_NAMES]);
  const handoffs = events.filter((event) => event.type === "handoff");
  assert.ok(handoffs.length >= READER_NAMES.length);
});

test("masks personal data before the readers see it", async () => {
  const events = await collect();
  const complete = events.find((event) => event.type === "complete");
  assert.ok(complete && complete.type === "complete");
  if (complete?.type === "complete") {
    assert.ok(complete.result.safety.piiFound.some((finding) => finding.category === "email"));
  }
  const reasoningText = events.filter((event) => event.type === "reasoning").map((event) => (event.type === "reasoning" ? event.text : "")).join(" ");
  assert.ok(!reasoningText.includes("alex@example.com"));
});

test("ends with a complete event carrying the analysis and retrieval steps", async () => {
  const events = await collect();
  const complete = events.at(-1);
  assert.equal(complete?.type, "complete");
  if (complete?.type === "complete") {
    assert.ok(complete.result.analysis.skills.length > 0);
    assert.ok(Array.isArray(complete.result.retrievalSteps));
  }
});

test("each reader reports parallel activity lanes built from real counts, and never names a web or model tool", async () => {
  const events = await collect();
  const activity = events.filter((event): event is Extract<typeof event, { type: "activity" }> => event.type === "activity");
  for (const name of READER_NAMES) {
    const mine = activity.filter((event) => event.agent === name);
    const lanes = new Set(mine.map((event) => event.lane));
    assert.ok(lanes.size >= 3, `${name} should show several lanes`);
    for (const lane of lanes) {
      const own = mine.filter((event) => event.lane === lane);
      assert.equal(own[0].status, "start");
      assert.equal(own.at(-1)?.status, "done");
      assert.equal(own.at(-1)?.progress, 100);
      const progress = own.map((event) => event.progress ?? 0);
      assert.deepEqual(progress, [...progress].sort((a, b) => a - b), "progress never goes backwards");
    }
    // Lanes overlap: some lane starts before another has finished.
    const firstDone = mine.findIndex((event) => event.status === "done");
    assert.ok(mine.slice(0, firstDone).filter((event) => event.status === "start").length >= 2, `${name} lanes run in parallel`);
  }
  for (const event of activity) {
    assert.equal(event.simulated, true);
    assert.equal(event.mode, "rules");
    assert.ok(!/firecrawl|claude|anthropic|\bai\b|web search/i.test(`${event.label} ${event.detail ?? ""}`));
    assert.ok(!(event.detail ?? "").includes("alex@example.com"));
  }
  const text = activity.map((event) => event.detail ?? "").join(" | ");
  assert.match(text, /\d+ skills? searched in \d+ snippets?/);
  assert.match(text, /\d+ quotes? verified/);
  assert.match(text, /\d+ of \d+ pass/);
  // Activity for a reader finishes before that reader's stage.
  const lastActivity = events.findLastIndex((event) => event.type === "activity" && event.agent === "Role Scout");
  assert.ok(lastActivity < events.findIndex((event) => event.type === "stage"));
});

test("paceMs spreads a reader's lanes over about that long, and a small value still gives every event", async () => {
  const count = async (paceMs: number) => {
    const started = Date.now();
    let activity = 0;
    for await (const event of runSimulatedEngine(resumes, job, { paceMs })) if (event.type === "activity") activity += 1;
    return { activity, took: Date.now() - started };
  };
  const slow = await count(100);
  const fast = await count(0);
  assert.equal(slow.activity, fast.activity);
  assert.ok(slow.took >= 4 * 90, `four readers at 100 ms each took ${slow.took} ms`);
  assert.ok(fast.took < 200);
});

test("the Finder flags weak proof and the Recruiter runs the ATS-style check on the masked text", async () => {
  const events = await collect();
  const complete = events.at(-1);
  assert.equal(complete?.type, "complete");
  if (complete?.type !== "complete") return;
  const { ats, agents, but } = complete.result.analysis;
  assert.ok(ats && ats.checks.length >= 9 && ats.score >= 0 && ats.score <= 100);
  assert.match(ats.note, /not a real employer/);
  assert.ok(ats.checks.find((check) => check.id === "contact")?.status !== "fail", "the masked email token counts as contact");
  assert.match(agents[1].note, /strongest proof/);
  assert.match(agents[2].note, /^Screening check: \d+ out of 100/);
  assert.ok(but.length > 0);
  const lanes = (name: string) => new Set(events.filter((event) => event.type === "activity" && event.agent === name).map((event) => (event.type === "activity" ? event.lane : "")));
  assert.deepEqual([...lanes("Recruiter")].sort(), ["ats-format", "ats-keywords", "ats-parse", "ats-wording"]);
  assert.ok(lanes("Experience Finder").has("doubt-flag"));
  assert.ok(!events.some((event) => event.type === "retrieval" && event.agent === "Recruiter"));
});

test("the Role Scout checks for a known employer and returns its values only when the posting names one", async () => {
  const run = async (text: string) => {
    const events = [];
    for await (const event of runSimulatedEngine(resumes, text)) events.push(event);
    const done = events.at(-1);
    return { events, company: done?.type === "complete" ? done.result.analysis.company : undefined };
  };
  const named = await run("Software Engineer, Grab. Grab is hiring. Use Python and SQL to build dashboards for the operations team.");
  assert.equal(named.company?.name, "Grab");
  assert.equal(named.company?.origin, "built-in");
  const lane = named.events.filter((event) => event.type === "activity" && event.lane === "company-detect");
  assert.deepEqual(lane.map((event) => event.type === "activity" && event.status).filter((status, i, all) => i === 0 || i === all.length - 1), ["start", "done"]);
  assert.ok(lane.every((event) => event.type === "activity" && event.agent === "Role Scout" && event.simulated === true));
  const none = await run(job);
  assert.equal(none.company, undefined);
  assert.ok(none.events.some((event) => event.type === "activity" && event.lane === "company-detect" && event.status === "done" && event.detail === "No known employer found"));
});

test("extra skills from the role read become rows with a literal role quote, and a name the posting lacks is dropped", async () => {
  const text = "Data engineer. You will run Kafka streams and write Python. Kafka experience is required.";
  const events = [];
  for await (const event of runSimulatedEngine(resumes, text, { extraSkills: ["Kafka", "Pulsar"] })) events.push(event);
  const done = events.find((event) => event.type === "complete");
  assert.ok(done && done.type === "complete");
  const skills = done.result.analysis.skills;
  const kafka = skills.find((skill) => skill.name === "Kafka");
  assert.ok(kafka, "Kafka is a row");
  assert.match(kafka.roleQuote?.quote ?? "", /Kafka/);
  assert.equal(kafka.evidence, 0, "the résumé never mentions it, so it scores 0 for proof");
  assert.equal(skills.some((skill) => skill.name === "Pulsar"), false);
});

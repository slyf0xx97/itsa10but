import assert from "node:assert/strict";
import { test } from "node:test";
import { DEMAND_ROLES, cleanTable, countDemand, matchRole, roleToRefresh } from "./demand.ts";

test("the share is the whole percent of postings that name the skill, biggest first, zeros left out", () => {
  const jobs = [
    { title: "Data analyst", text: "You will use SQL and Python every day." },
    { title: "Analyst", text: "We use SQL, Tableau and Excel spreadsheets." },
    { title: "Analyst", text: "Reporting to the head of finance." },
    { title: "Analyst", text: "SQL a must. Looker dashboards." },
  ];
  const out = countDemand("Data analyst", jobs, "2026-10-16");
  assert.equal(out.sample, 4);
  assert.deepEqual(out.skills.find((row) => row.name === "SQL"), { name: "SQL", share: 75 });
  assert.deepEqual(out.skills.find((row) => row.name === "Python"), { name: "Python", share: 25 });
  assert.equal(out.skills.find((row) => row.name === "Java"), undefined);
  assert.deepEqual(out.skills.map((row) => row.share), [...out.skills.map((row) => row.share)].sort((a, b) => b - a));
});

test("a whole word is needed: java is not javascript, and 'excel' on its own is not a spreadsheet", () => {
  const out = countDemand("Software engineer", [{ title: "Dev", text: "We write JavaScript. Candidates who excel in teams." }], "2026-10-16");
  assert.equal(out.skills.find((row) => row.name === "Java"), undefined);
  assert.equal(out.skills.find((row) => row.name === "Excel"), undefined);
  assert.equal(out.skills.find((row) => row.name === "JavaScript")?.share, 100);
});

test("no postings gives an empty table row, not a division by zero", () => {
  assert.deepEqual(countDemand("Data analyst", [], "2026-10-16"), { role: "Data analyst", sample: 0, updated: "2026-10-16", skills: [] });
});

test("one role per hour, going round the list", () => {
  const hour = 3_600_000;
  const seen = new Set(DEMAND_ROLES.map((_, i) => roleToRefresh(i * hour)));
  assert.equal(seen.size, DEMAND_ROLES.length);
  assert.equal(roleToRefresh(0), roleToRefresh(DEMAND_ROLES.length * hour));
});

test("the role text picks a tracked role from its first words, longest match first", () => {
  assert.equal(matchRole("Junior Data Analyst, Singapore. You will build dashboards."), "Data analyst");
  assert.equal(matchRole("Machine learning engineer wanted"), "Machine learning engineer");
  assert.equal(matchRole("SOC analyst (tier 1)"), "SOC analyst");
  assert.equal(matchRole("Barista at a cafe"), null);
  assert.equal(matchRole(`${"x ".repeat(100)}data analyst`), null, "a role named only far down the text is not the role");
});

test("pay survives cleaning only when it is a sane, ordered range", () => {
  const ok = { sample: 80, updated: "2026-10-16", skills: [], pay: { low: 3849, mid: 4800, high: 6200, n: 82 } };
  const out = cleanTable({ sg: { "Data analyst": ok, "SOC analyst": { ...ok, pay: { low: 9000, mid: 4000, high: 6000, n: 5 } }, "UX designer": { ...ok, pay: { low: 1, mid: 2, high: 3, n: 0 } } } });
  assert.deepEqual(out.sg["Data analyst"].pay, { low: 3800, mid: 4800, high: 6200, n: 82 });
  assert.equal(out.sg["SOC analyst"].pay, undefined);
  assert.equal(out.sg["UX designer"].pay, undefined);
});

test("cleanTable keeps known roles and whole percents only", () => {
  const out = cleanTable({ roles: { "Data analyst": { sample: 12.9, updated: "2026-10-16T10:00:00Z", skills: [{ name: "SQL", share: 120.4 }, { name: 5, share: 3 }, { name: "Python", share: "x" }] }, "Pirate": { skills: [] } } });
  assert.deepEqual(Object.keys(out.roles), ["Data analyst"]);
  assert.deepEqual(out.roles["Data analyst"], { role: "Data analyst", sample: 12, updated: "2026-10-16", skills: [{ name: "SQL", share: 100 }] });
  assert.deepEqual(cleanTable(null), { roles: {}, sg: {} });
});

import { MIN_SAMPLE, feedUrls, mergeTables, postingsFromFeeds } from "./demand.ts";

test("feed JSON becomes short plain-text postings, and rows without a title or text are dropped", () => {
  const jobs = postingsFromFeeds(
    { jobs: [{ title: "Data Analyst", description: "<p>Use <b>SQL</b> &amp; Python.</p>" }, { title: "", description: "x" }] },
    { jobs: [{ jobTitle: "Analyst", jobDescription: "Tableau" }, { jobTitle: "No text", jobDescription: "" }] },
  );
  assert.deepEqual(jobs, [{ title: "Data Analyst", text: "Use SQL Python." }, { title: "Analyst", text: "Tableau" }]);
  assert.deepEqual(postingsFromFeeds(null, "bad"), []);
  assert.equal(postingsFromFeeds({ jobs: Array.from({ length: 40 }, () => ({ title: "t", description: "d".repeat(9000) })) }, null).length, 12);
  assert.equal(postingsFromFeeds({ jobs: [{ title: "t", description: "d".repeat(9000) }] }, null)[0].text.length, 3000);
  assert.match(feedUrls("Data analyst").himalayas, /q=Data%20analyst/);
});

test("merging keeps the newer row per role, and a tiny sample never beats a real one", () => {
  const row = (role: string, sample: number, updated: string) => ({ role, sample, updated, skills: [] });
  const a = { sg: {}, roles: { "Data analyst": row("Data analyst", 20, "2026-10-16"), "SOC analyst": row("SOC analyst", MIN_SAMPLE - 1, "2026-10-17") } };
  const b = { sg: { "SOC analyst": row("SOC analyst", 30, "2026-10-12") }, roles: { "Data analyst": row("Data analyst", 20, "2026-10-10"), "SOC analyst": row("SOC analyst", 12, "2026-10-01"), "UX designer": row("UX designer", 3, "2026-10-01") } };
  const out = mergeTables(a, b);
  assert.equal(out.roles["Data analyst"].updated, "2026-10-16");
  assert.equal(out.roles["SOC analyst"].sample, 12);
  assert.equal(out.roles["UX designer"].sample, 3, "a small sample is kept when it is all there is");
  assert.equal(out.sg["SOC analyst"].sample, 30, "the Singapore rows merge the same way");
  assert.deepEqual(mergeTables({ roles: {}, sg: {} }, { roles: {}, sg: {} }), { roles: {}, sg: {} });
});

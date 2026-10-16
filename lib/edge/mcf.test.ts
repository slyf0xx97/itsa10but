import assert from "node:assert/strict";
import { test } from "node:test";
import { countDemand } from "./demand.ts";
import { jobsFromMcf, mcfBody, summarisePay } from "./mcf.ts";

const job = (title: string, skills: string[], min = 4000, max = 6000, salaryType = "Monthly") => ({ title, skills: skills.map((skill) => ({ skill })), salary: { minimum: min, maximum: max, type: { salaryType } } });

test("only postings whose title names the role are kept, with the tags as text", () => {
  const out = jobsFromMcf({ results: [
    job("Data Analyst", ["SQL Programming", "Tableau"]),
    job("Senior Data and Reporting Analyst", ["Data Analysis"]),
    job("Mechanical Engineer", ["CAD"]),
    job("BI Analyst", ["Power BI"]),
  ] }, "Data analyst");
  assert.deepEqual(out.jobs, [{ title: "", text: "SQL Programming; Tableau" }, { title: "", text: "Data Analysis" }]);
});

test("the title picks the postings but is never counted as a skill", () => {
  const out = jobsFromMcf({ results: Array.from({ length: 6 }, () => job("Machine Learning Engineer", ["Python"])) }, "Machine learning engineer");
  const row = countDemand("Machine learning engineer", out.jobs, "2026-10-16");
  assert.equal(row.skills.find((item) => item.name === "Machine learning"), undefined, "the role's own words are not a tag");
  assert.equal(row.skills.find((item) => item.name === "Python")?.share, 100);
});

test("employer tags count through the same catalog matcher", () => {
  const out = jobsFromMcf({ results: Array.from({ length: 4 }, () => job("Data Analyst", ["SQL Programming", "Business Data Analysis"])) }, "Data analyst");
  const row = countDemand("Data analyst", out.jobs, "2026-10-16");
  assert.equal(row.skills.find((item) => item.name === "SQL")?.share, 100);
  assert.equal(row.skills.find((item) => item.name === "Data analysis")?.share, 100);
});

test("pay is the percentiles of monthly mid-points, rounded to 100, and needs 5 postings", () => {
  const mids = [3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000];
  assert.deepEqual(summarisePay(mids), { low: 4000, mid: 5000, high: 6000, n: 9 });
  assert.equal(summarisePay([3000, 4000, 5000, 6000]), undefined);
  assert.equal(summarisePay([0, -1, NaN, 4000]), undefined);
});

test("yearly and hidden pay are left out, and odd input never throws", () => {
  const results = [...Array.from({ length: 5 }, (_, i) => job("Data Analyst", [], 4000 + i * 500, 4000 + i * 500 + 1000)), job("Data Analyst", [], 60000, 80000, "Yearly"), job("Data Analyst", [], 0, 0)];
  const out = jobsFromMcf({ results }, "Data analyst");
  assert.equal(out.jobs.length, 7);
  assert.equal(out.pay?.n, 5);
  assert.deepEqual(jobsFromMcf(null, "Data analyst"), { jobs: [], pay: undefined });
  assert.deepEqual(jobsFromMcf({ results: [{ title: 5 }, null] }, "Data analyst"), { jobs: [], pay: undefined });
});

test("the request body asks for 100 postings by the role name", () => {
  assert.deepEqual(JSON.parse(mcfBody("Data analyst")), { search: "Data analyst", limit: 100, page: 0 });
});

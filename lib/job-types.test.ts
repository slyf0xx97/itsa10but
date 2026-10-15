import test from "node:test";
import assert from "node:assert/strict";
import { filterJobs, safeJobUrl, plainJobText, jobHtml, type JobListing } from "./job-types.ts";
const base: JobListing = { id: "1", title: "Python engineer", company: "Example", companyDomain: "", logoUrl: "", location: "Berlin", workplace: "remote", type: "full-time", postedAt: "2026-10-08T00:00:00Z", applyUrl: "https://example.com/job", source: "Arbeitnow", descriptionHtml: "Python", description: "Python", region: "Berlin", publishedAt: "2026-10-08T00:00:00Z", url: "https://example.com/job", summary: "Python" };
test("remote does not imply Singapore eligible", () => {
  assert.equal(filterJobs([base], { query: "Python", scope: "singapore", level: "all" }).length, 0);
  assert.equal(filterJobs([{ ...base, location: "Worldwide" }], { query: "Python", scope: "singapore", level: "all" }).length, 1);
});
test("keyword, location, workplace, employment and date filters combine", () => {
  const filters = { query: "Python", scope: "worldwide", level: "all", location: "Berlin", workplace: "remote", type: "full-time", days: 7 };
  assert.equal(filterJobs([base, { ...base, id: "duplicate" }], filters, Date.parse("2026-10-09")).length, 1);
  assert.equal(filterJobs([base], { ...filters, workplace: "hybrid" }, Date.parse("2026-10-09")).length, 0);
  assert.equal(filterJobs([base], filters, Date.parse("2026-11-09")).length, 0);
});
test("upstream HTML and links are safe for display", () => {
  assert.equal(safeJobUrl("javascript:alert(1)"), "");
  assert.equal(safeJobUrl("https://user:password@example.com/"), "");
  const text = plainJobText('<script>alert(1)</script><p>Python &lt;img src=x onerror=alert(1)&gt;</p>');
  assert.ok(!jobHtml(text).includes("<img"));
  assert.ok(!text.includes("<script"));
});

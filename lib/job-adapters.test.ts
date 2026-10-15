import test from "node:test";
import assert from "node:assert/strict";
import { searchJobSources } from "./job-adapters.ts";

test("all four adapters normalize their source payload and tolerate partial failure", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; ttl?: number }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input); calls.push({ url, ttl: (init as RequestInit & { next?: { revalidate: number } })?.next?.revalidate });
    if (url.includes("himalayas")) return Response.json({ jobs: [{ guid: "https://himalayas.app/jobs/1", title: "Python engineer", companyName: "Example", companyWebsite: "https://example.com", companyLogo: "https://example.com/brand-mark.png", locationRestrictions: ["Germany", "France", "Japan", "Singapore"], employmentType: "Full Time", description: "Use Python", pubDate: 1791504000 }] });
    if (url.includes("jobicy")) return Response.json({ jobs: [{ id: 1, url: "https://jobicy.com/jobs/1", jobTitle: "Python analyst", companyName: "Other", jobGeo: "Singapore", jobType: ["full-time"], jobDescription: "Use Python" }] });
    if (url.includes("arbeitnow")) return Response.json({ data: [{ slug: "python", url: "https://arbeitnow.com/jobs/python", title: "Python intern", company_name: "Another", remote: false, location: "Berlin", job_types: ["internship"], description: "Python" }] });
    return Response.json({ jobs: [{ id: 1, url: "https://remotive.com/remote-jobs/python", title: "Python developer", company_name: "Final", candidate_required_location: "Worldwide", job_type: "full_time", description: '<script>alert(1)</script><p>Python</p>' }] });
  };
  try {
    const result = await searchJobSources("python", "all", "worldwide");
    assert.equal(result.jobs.length, 4);
    assert.equal(result.jobs[0].location, "Germany, France, Japan, Singapore");
    assert.equal(result.jobs[0].companyDomain, "example.com");
    assert.equal(result.jobs[0].logoUrl, "https://example.com/brand-mark.png");
    assert.equal(result.jobs[0].type, "full-time");
    assert.equal(result.jobs[2].workplace, "on-site");
    assert.equal(result.jobs[3].applyUrl, "https://remotive.com/remote-jobs/python");
    assert.equal(result.jobs[3].descriptionHtml, "Python");
    assert.ok(calls.every(call => (call.ttl ?? 0) >= 3600));
    assert.equal(calls.find(call => call.url.includes("remotive"))?.ttl, 21600);
    globalThis.fetch = async input => { if (String(input).includes("jobicy")) throw Error("offline"); return Response.json({jobs:[], data:[]}); };
    const partial = await searchJobSources("python", "all", "worldwide");
    assert.equal(partial.sources.filter(source => !source.available).length, 1);
    assert.equal(partial.sources.find(source => source.source === "Jobicy")?.available, false);
  } finally { globalThis.fetch = originalFetch; }
});

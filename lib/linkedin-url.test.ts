import assert from "node:assert/strict";
import { test } from "node:test";
import { extractLinkedinJobId, guestPostingUrl, htmlToJobText } from "./linkedin-url.ts";

test("extracts ids from supported LinkedIn URL shapes", () => {
  assert.equal(extractLinkedinJobId("https://www.linkedin.com/jobs/view/4455908179/"), "4455908179");
  assert.equal(extractLinkedinJobId("https://www.linkedin.com/jobs/view/4455908179"), "4455908179");
  assert.equal(extractLinkedinJobId("https://www.linkedin.com/jobs/view/4455908179?trackingId=abc"), "4455908179");
  assert.equal(extractLinkedinJobId("https://sg.linkedin.com/jobs/view/junior-analyst-at-acme-4455908179"), "4455908179");
  assert.equal(extractLinkedinJobId("https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4455908179"), "4455908179");
  assert.equal(extractLinkedinJobId("https://www.linkedin.com/jobs/search/?keywords=data&currentJobId=4455908179"), "4455908179");
});

test("rejects non-URLs, other hosts, and pasted descriptions", () => {
  assert.equal(extractLinkedinJobId(`${"A long job description. ".repeat(100)}https://www.linkedin.com/jobs/view/4455908179/`), null);
  assert.equal(extractLinkedinJobId("https://evil.com/jobs/view/123456789"), null);
  assert.equal(extractLinkedinJobId("javascript:alert(1)"), null);
  assert.equal(extractLinkedinJobId("ftp://www.linkedin.com/jobs/view/4455908179"), null);
  assert.equal(extractLinkedinJobId("https://www.linkedin.com/in/someone"), null);
});

test("builds a guest URL only from a valid numeric id", () => {
  assert.equal(guestPostingUrl("4455908179"), "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/4455908179");
  assert.throws(() => guestPostingUrl("../evil"));
  assert.throws(() => guestPostingUrl("12345"));
});

test("extracts and decodes fields from guest HTML", () => {
  const html = `<html><head><meta content="Fallback title" property="og:title"></head><body>
    <h2 class="top-card-layout__title">Junior Data Analyst</h2>
    <a class="topcard__org-name-link" href="#">Acme &amp; Co</a>
    <span class="topcard__flavor topcard__flavor--bullet">Singapore</span>
    <div class="show-more-less-html__markup"><p>Use SQL &amp; Python.</p><ul><li>Build dashboards</li><li>Present findings</li></ul>Great team<br>Apply now</div>
  </body></html>`;
  const job = htmlToJobText(html);
  assert.deepEqual(job, {
    title: "Junior Data Analyst",
    company: "Acme & Co",
    location: "Singapore",
    description: "Use SQL & Python.\nBuild dashboards\nPresent findings\nGreat team\nApply now",
  });
  assert.equal(htmlToJobText("<html>login wall</html>").description, "");
});

test("a short paste with the link inside, or a link without https, still counts", () => {
  assert.equal(extractLinkedinJobId("Data Analyst at Acme https://www.linkedin.com/jobs/view/4455908179/?trk=share"), "4455908179");
  assert.equal(extractLinkedinJobId("www.linkedin.com/jobs/view/data-analyst-4455908179"), "4455908179");
  assert.equal(extractLinkedinJobId("https://www.linkedin.com/comm/jobs/view/4455908179"), "4455908179");
  assert.equal(extractLinkedinJobId("https://www.linkedin.com/jobs/search-results/?currentJobId=4455908179"), "4455908179");
});

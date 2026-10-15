import test from "node:test";
import assert from "node:assert/strict";
import { ATS_CHECK_IDS, atsCheck, atsScore, keywordCoverage, topFixes } from "./ats-check.ts";

const good = `Alex Tan
[masked-email] | [masked-phone] | linkedin.com/in/alextan

Summary
Cybersecurity graduate who builds small tools for security teams.

Experience
Security Intern, Example Corp, Jun 2024 to Aug 2024
- Built a Python log parser that flagged 40 repeated failed logins per week.
- Reduced manual triage time by 30% by automating alert grouping.
- Wrote 12 incident summaries for the SOC team and presented them weekly.

Projects
- Configured a Linux home lab with 3 virtual machines and captured traffic with Wireshark, 2023.
- Documented 5 phishing cases in a shared runbook.

Education
BSc Information Security, Example University, 2021 to 2025

Skills
Python, Linux, Wireshark, networking, SIEM, technical writing, incident response, scripting, documentation, reporting, monitoring, analysis, testing, bash, TCP/IP, firewalls, VPNs, packet analysis, log review, threat hunting, reporting tools, ticketing, teamwork, presentations`;

const weak = "Responsible for helping with various tasks. Helped with things. Worked on stuff.";

const byId = (report: ReturnType<typeof atsCheck>) => Object.fromEntries(report.checks.map((item) => [item.id, item.status]));

test("a good résumé passes most checks and scores high", () => {
  const report = atsCheck(`${good}\n${"More detail about tools and projects with results. ".repeat(12)}`, ["Python", "Linux", "SIEM", "Incident response"]);
  const status = byId(report);
  for (const id of ["keywords", "numbers", "verbs", "contact", "sections", "dates", "columns", "symbols", "bullets", "filler"]) assert.equal(status[id], "pass", id);
  assert.ok(report.score >= 85, `score ${report.score}`);
  assert.deepEqual(report.keywordsMissing, []);
  assert.deepEqual(report.fixes.length, 0);
});

test("a weak résumé fails the checks it should", () => {
  const report = atsCheck(weak, ["Python", "SQL"]);
  const status = byId(report);
  for (const id of ["keywords", "numbers", "verbs", "contact", "sections", "dates", "length"]) assert.equal(status[id], "fail", id);
  assert.notEqual(status.filler, "pass");
  assert.ok(report.score < 40, `score ${report.score}`);
  assert.equal(report.fixes.length, 3);
  assert.ok(report.fixes.every((fix) => fix.length > 10 && !fix.includes(weak)));
});

test("keywords found and missing come from the role's skill names, word for word", () => {
  const report = atsCheck("I use Python and SQL daily. Pythonic is not Python? Incident handling only.", ["Python", "SQL", "Incident response", "Linux"]);
  assert.deepEqual(report.keywordsFound, ["Python", "SQL"]);
  assert.deepEqual(report.keywordsMissing, ["Incident response", "Linux"]);
  assert.deepEqual(keywordCoverage("c++ and C#", ["C++", "C#"]).found, ["C++", "C#"]);
  assert.equal(byId(atsCheck("text", []))["keywords"], "warn");
});

test("keyword lists are capped at ten", () => {
  const names = Array.from({ length: 15 }, (_, i) => `Skill${i}`);
  assert.equal(keywordCoverage("nothing here", names).missing.length, 10);
});

test("layout and symbol problems are caught", () => {
  const columns = Array.from({ length: 6 }, (_, i) => `Python   line ${i}     Linux   other column ${i}`).join("\n");
  assert.equal(byId(atsCheck(columns, []))["columns"], "fail");
  assert.equal(byId(atsCheck("a b c d e f★★★★★�", []))["symbols"], "fail");
  assert.equal(byId(atsCheck("plain text only", []))["symbols"], "pass");
  const wall = `${"word ".repeat(80)}\n${"word ".repeat(70)}`;
  assert.equal(byId(atsCheck(wall, []))["bullets"], "fail");
});

test("masked contact tokens count as contact details, and raw ones too", () => {
  assert.equal(byId(atsCheck("Name\n[masked-email] [masked-phone]", []))["contact"], "pass");
  assert.equal(byId(atsCheck("Name\nalex@example.com", []))["contact"], "warn");
  assert.equal(byId(atsCheck("Name\nno way to reach me", []))["contact"], "fail");
});

test("score is bounded and follows the pass 1, warn 0.5, fail 0 rule", () => {
  assert.equal(atsScore([]), 0);
  assert.equal(atsScore([{ status: "pass" }, { status: "warn" }, { status: "fail" }, { status: "fail" }]), 38);
  for (const text of ["", " ", weak, good]) {
    const { score } = atsCheck(text, ["Python"]);
    assert.ok(Number.isInteger(score) && score >= 0 && score <= 100);
  }
});

test("check ids are stable, unique and cover each group once", () => {
  const report = atsCheck(good, ["Python"]);
  assert.deepEqual(report.checks.map((item) => item.id).sort(), [...ATS_CHECK_IDS].sort());
  assert.equal(new Set(report.checks.map((item) => item.id)).size, report.checks.length);
  assert.deepEqual([...new Set(report.checks.map((item) => item.group))].sort(), ["format", "keywords", "parse", "wording"]);
  assert.match(report.note, /Screening check: 11 rule-of-thumb checks/);
  assert.match(report.note, /not a real employer/);
});

test("fixes rank failures before warnings", () => {
  const fixes = topFixes([
    { id: "length", status: "fail", tip: "L" },
    { id: "keywords", status: "warn", tip: "K" },
    { id: "numbers", status: "pass", tip: "N" },
    { id: "dates", status: "fail", tip: "D" },
  ]);
  assert.deepEqual(fixes, ["D", "L", "K"]);
});

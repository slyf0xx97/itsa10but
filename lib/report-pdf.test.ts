import assert from "node:assert/strict";
import { test } from "node:test";
import { sampleAnalysis, sampleJob, sampleResume, type Analysis } from "./analysis-types.ts";
import { previewAnalysis } from "./preview-analysis.ts";
import { buildPdf, pdfString, sanitize, textWidth, winAnsiByte, wrapText } from "./report-pdf.ts";

const resumes = [{ id: "r1", name: "Mine", text: sampleResume }];
const native: Analysis = previewAnalysis(resumes, sampleJob);
const date = new Date(2026, 9, 16, 12, 0, 0);
const toText = (bytes: Uint8Array) => Buffer.from(bytes).toString("latin1");
/** The bytes the PDF should hold for a string: sanitised, then one latin1 char per WinAnsi byte. */
const enc = (s: string) => [...sanitize(s)].map((c) => String.fromCharCode(winAnsiByte(c))).join("");

function pages(pdf: string): string[] {
  return [...pdf.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map((m) => m[1]);
}
/** Text of each page as the Tj strings, unescaped, joined by single spaces. */
function pageTexts(pdf: string): string[] {
  return pages(pdf).map((s) => [...s.matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map((m) => m[1].replace(/\\(\d{3}|.)/g, (_, g: string) => (g.length === 3 ? String.fromCharCode(parseInt(g, 8)) : g))).join(" "));
}

test("valid structure: header, trailer, xref offsets and page count", () => {
  const pdf = toText(buildPdf({ analysis: sampleAnalysis, resumes, job: sampleJob, sample: true, date }));
  assert.ok(pdf.startsWith("%PDF-1.4"));
  assert.ok(pdf.trimEnd().endsWith("%%EOF"));
  const xrefAt = Number(pdf.match(/startxref\n(\d+)/)?.[1]);
  assert.equal(pdf.slice(xrefAt, xrefAt + 4), "xref");
  const entries = [...pdf.slice(xrefAt).matchAll(/^(\d{10}) \d{5} n $/gm)].map((m) => Number(m[1]));
  assert.ok(entries.length > 6);
  entries.forEach((offset, i) => assert.equal(pdf.slice(offset, offset + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`));
  const count = Number(pdf.match(/\/Count (\d+)/)?.[1]);
  assert.equal([...pdf.matchAll(/\/Type \/Page /g)].length, count);
  assert.match(pdf, /\/Title \(R\\351sum\\351 report\)/);
  const texts = pageTexts(pdf);
  assert.equal(texts.length, count);
  texts.forEach((t, i) => { assert.ok(t.trim().length > 0); assert.ok(t.includes(`Page ${i + 1} of ${count}`)); assert.ok(t.includes("Scores show proof in text, not hiring chances.")); });
});

test("holds the title, a skill name, a literal quote, status words and the overall figure", () => {
  const text = pageTexts(toText(buildPdf({ analysis: native, resumes, job: sampleJob, date }))).join(" ").replace(/\s+/g, " ");
  assert.ok(text.includes(enc("Résumé report")));
  assert.ok(text.includes(native.skills[0].name));
  const quote = native.skills.find((s) => s.resumeQuote)?.resumeQuote?.quote.replace(/\s+/g, " ").trim() as string;
  assert.ok(text.includes(enc(quote)), quote);
  assert.ok(text.includes("No matching quote, scores 0"));
  assert.match(text, /\d+ out of 10/);
  assert.match(text, /Native scan/);
  assert.match(text, /Pass|To fix|To check/);
  for (const name of ["Role Scout", "Experience Finder", "Recruiter", "Action Planner"]) assert.ok(text.includes(name));
});

test("sample and API boost are labelled", () => {
  const sample = pageTexts(toText(buildPdf({ analysis: sampleAnalysis, resumes, job: sampleJob, sample: true, date }))).join(" ");
  assert.match(sample, /Sample result/);
  const live: Analysis = { ...native, mode: "live", run: { model: "claude-test-model", claude: true, web: false } };
  const text = pageTexts(toText(buildPdf({ analysis: live, resumes, job: sampleJob, date }))).join(" ");
  assert.match(text, /API boost, claude-test-model/);
  assert.doesNotMatch(text, /Native scan\. Word matching/);
});

test("WinAnsi: accents, curly quotes, dashes and unknown characters", () => {
  assert.equal(pdfString("é’“–•…"), "(\\351\\222\\223\\226\\225\\205)");
  assert.equal(pdfString("a(b)\\c"), "(a\\(b\\)\\\\c)");
  assert.equal(sanitize("日本 \u{1F600}"), "?? ?");
  assert.equal(winAnsiByte("€"), 0x80);
});

test("wrapping keeps every line inside the width, including unbroken words", () => {
  const long = "Built a machine learning pipeline with PyTorch and scikit-learn for twelve thousand labelled photos ".repeat(6);
  for (const [font, size] of [["regular", 10], ["bold", 11]] as const) {
    for (const line of wrapText(long + "x".repeat(300), font, size, 300)) assert.ok(textWidth(line, font, size) <= 300 + 0.001, line.slice(0, 30));
  }
  assert.equal(textWidth("Hello", "regular", 10), (722 + 556 + 222 + 222 + 556) / 100);
  assert.equal(textWidth("é", "regular", 10), textWidth("e", "regular", 10));
});

test("works with no ats, company or review, and a huge quote does not overflow", () => {
  const huge = "Led the migration of " + "a very long unbroken statement ".repeat(80) + "x".repeat(400);
  const skills = native.skills.map((s, i) => (i === 0 ? { ...s, resumeQuote: { label: "Résumé", quote: huge, matched: [] } } : s));
  const bare: Analysis = { ...native, skills, ats: undefined, review: undefined, company: undefined };
  const pdf = toText(buildPdf({ analysis: bare, resumes, job: sampleJob, date }));
  assert.ok(pdf.trimEnd().endsWith("%%EOF"));
  const texts = pageTexts(pdf);
  texts.forEach((t) => assert.ok(t.trim().length > 0));
  assert.ok(texts.join(" ").includes("No ATS-style check was run"));
  // Every drawn line fits the page: x plus its width stays inside the right margin.
  for (const stream of pages(pdf)) {
    for (const m of stream.matchAll(/\/(F\d) ([\d.]+) Tf [\d. ]+ rg ([\d.]+) [\d.]+ Td \(((?:\\.|[^\\)])*)\) Tj/g)) {
      const text = m[4].replace(/\\(\d{3}|.)/g, (_, g: string) => (g.length === 3 ? String.fromCharCode(parseInt(g, 8)) : g));
      const font = m[1] === "F2" ? "bold" : "regular";
      assert.ok(Number(m[3]) + textWidth(sanitize(text), font, Number(m[2])) <= 595 - 48 + 8, text.slice(0, 40));
    }
  }
});

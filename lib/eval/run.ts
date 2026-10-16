/**
 * Accuracy evaluation for the keyless native scan. Pure: it runs previewAnalysis over labelled cases and counts.
 * Scores describe proof in text, so "detected" means the scan found a literal passage, never that the person is a good hire.
 */
import { previewAnalysis } from "../preview-analysis.ts";
import { catalog, hasTerm } from "../catalog.ts";
import type { EvalCase } from "./cases.ts";

/** Same cut as the UI's "strong proof" colour: a named skill with a project action in the same passage. */
export const HIGH_PROOF = 45;
/** previewAnalysis keeps this many skills. A gold skill past the limit is reported as cut off, not as a miss. */
export const SKILL_LIMIT = 6;

export type FailureKind = "false-positive" | "miss" | "overcredit" | "proof-miss" | "proof-false-positive" | "demand-false-positive" | "demand-miss" | "quote";
export type Failure = { caseId: string; category: string; skill: string; kind: FailureKind; reason: string };
export type Counts = {
  cases: number;
  resTp: number; resFp: number; resMiss: number; resCut: number;
  proofTp: number; proofFp: number; proofMiss: number; proofCut: number;
  mentionTotal: number; mentionHigh: number;
  demTp: number; demFp: number; demMiss: number; demCut: number;
  quotesChecked: number; quoteBad: number;
};
export type Rates = { resumePrecision: number; resumeRecall: number; proofPrecision: number; proofRecall: number; mentionOvercredit: number; demandPrecision: number; demandRecall: number };
export type Report = Counts & Rates & { failures: Failure[]; byCategory: Record<string, Counts & Rates & { failures: number }> };

const empty = (): Counts => ({ cases: 0, resTp: 0, resFp: 0, resMiss: 0, resCut: 0, proofTp: 0, proofFp: 0, proofMiss: 0, proofCut: 0, mentionTotal: 0, mentionHigh: 0, demTp: 0, demFp: 0, demMiss: 0, demCut: 0, quotesChecked: 0, quoteBad: 0 });
const add = (into: Counts, from: Counts) => { for (const key of Object.keys(from) as (keyof Counts)[]) into[key] += from[key]; };
// An empty denominator means nothing could go wrong, so it reads as 1 rather than NaN.
const ratio = (n: number, d: number) => (d === 0 ? 1 : n / d);
export const rates = (c: Counts): Rates => ({
  resumePrecision: ratio(c.resTp, c.resTp + c.resFp), resumeRecall: ratio(c.resTp, c.resTp + c.resMiss),
  proofPrecision: ratio(c.proofTp, c.proofTp + c.proofFp), proofRecall: ratio(c.proofTp, c.proofTp + c.proofMiss),
  mentionOvercredit: ratio(c.mentionHigh, c.mentionTotal),
  demandPrecision: ratio(c.demTp, c.demTp + c.demFp), demandRecall: ratio(c.demTp, c.demTp + c.demMiss),
});

const termsOf = (name: string) => catalog.find((seed) => seed.name === name)?.terms ?? [];
const named = (text: string, name: string) => termsOf(name).some((term) => hasTerm(text, term));
const inside = (source: string, quote: string) => source.toLowerCase().includes(quote.toLowerCase());

export function evaluateCase(item: EvalCase): { counts: Counts; failures: Failure[] } {
  const counts = empty();
  counts.cases = 1;
  const failures: Failure[] = [];
  const fail = (skill: string, kind: FailureKind, reason: string) => failures.push({ caseId: item.id, category: item.category, skill, kind, reason });
  const resumes = item.resumes.map((text, i) => ({ id: String(i + 1), name: `resume-${i + 1}.txt`, text }));
  const allText = item.resumes.join("\n");
  const analysis = previewAnalysis(resumes, item.job);
  // The placeholder skill for "no catalog match" is not a catalog skill, so it never counts.
  const returned = new Map(analysis.skills.filter((skill) => catalog.some((seed) => seed.name === skill.name)).map((skill) => [skill.name, skill]));
  const full = analysis.skills.length >= SKILL_LIMIT;
  // A skill the scan never returned is "cut off" only when the list was full and a term really is in the text.
  const cutOff = (name: string, text: string) => full && !returned.has(name) && named(text, name);

  const gold = new Set([...item.resumeShows, ...item.resumeMentionsOnly]);
  const shows = new Set(item.resumeShows);
  const mentions = new Set(item.resumeMentionsOnly);
  const detected = new Set([...returned].filter(([, skill]) => skill.evidence > 0).map(([name]) => name));
  const strong = new Set([...returned].filter(([, skill]) => skill.evidence >= HIGH_PROOF).map(([name]) => name));

  for (const name of gold) {
    if (detected.has(name)) counts.resTp++;
    else if (cutOff(name, allText)) counts.resCut++;
    else { counts.resMiss++; fail(name, "miss", shows.has(name) ? "résumé shows it but no catalog term was found" : "résumé names it but no catalog term was found"); }
  }
  for (const name of detected) if (!gold.has(name)) { counts.resFp++; fail(name, "false-positive", `credited ${returned.get(name)?.evidence} proof from "${returned.get(name)?.resumeQuote?.quote.slice(0, 70)}"`); }

  for (const name of shows) {
    if (strong.has(name)) counts.proofTp++;
    else if (cutOff(name, allText)) counts.proofCut++;
    else if (detected.has(name)) { counts.proofMiss++; fail(name, "proof-miss", `real work scored only ${returned.get(name)?.evidence}`); }
    else counts.proofMiss++;
  }
  for (const name of strong) if (!shows.has(name)) { counts.proofFp++; fail(name, "proof-false-positive", mentions.has(name) ? `named or denied only, yet scored ${returned.get(name)?.evidence}` : `not in the résumé as a skill, yet scored ${returned.get(name)?.evidence}`); }

  for (const name of mentions) {
    if (!returned.has(name)) continue;
    counts.mentionTotal++;
    if (strong.has(name)) { counts.mentionHigh++; fail(name, "overcredit", `mention only, scored ${returned.get(name)?.evidence} (>= ${HIGH_PROOF})`); }
  }

  const wanted = new Set(item.jobWants);
  const asked = new Set([...returned].filter(([, skill]) => skill.demand > 0).map(([name]) => name));
  for (const name of wanted) {
    if (asked.has(name)) counts.demTp++;
    else if (cutOff(name, item.job)) counts.demCut++;
    else { counts.demMiss++; fail(name, "demand-miss", "the posting asks for it but no catalog term was found"); }
  }
  for (const name of asked) if (!wanted.has(name)) { counts.demFp++; fail(name, "demand-false-positive", `demand ${returned.get(name)?.demand} from "${returned.get(name)?.roleQuote?.quote.slice(0, 70)}"`); }

  // Rule from AGENTS.md: a quote must be found literally in its source.
  for (const skill of analysis.skills) {
    const resumeQuote = skill.resumeQuote?.quote;
    if (resumeQuote) {
      counts.quotesChecked++;
      const source = resumes.find((resume) => resume.name === skill.resumeQuote?.label)?.text ?? "";
      if (!inside(source, resumeQuote)) { counts.quoteBad++; fail(skill.name, "quote", `résumé quote not found in ${skill.resumeQuote?.label}: "${resumeQuote.slice(0, 60)}"`); }
    }
    const roleQuote = skill.roleQuote?.quote;
    if (roleQuote) {
      counts.quotesChecked++;
      if (!inside(item.job, roleQuote)) { counts.quoteBad++; fail(skill.name, "quote", `role quote not found in the job text: "${roleQuote.slice(0, 60)}"`); }
    }
  }
  return { counts, failures };
}

export function evaluate(cases: EvalCase[]): Report {
  const total = empty();
  const failures: Failure[] = [];
  const cats: Record<string, Counts & { failures: number }> = {};
  for (const item of cases) {
    const result = evaluateCase(item);
    add(total, result.counts);
    failures.push(...result.failures);
    const bucket = (cats[item.category] ??= { ...empty(), failures: 0 });
    add(bucket, result.counts);
    bucket.failures += result.failures.length;
  }
  const byCategory = Object.fromEntries(Object.entries(cats).map(([name, c]) => [name, { ...c, ...rates(c) }]));
  return { ...total, ...rates(total), failures, byCategory };
}

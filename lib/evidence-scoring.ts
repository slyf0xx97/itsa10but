import type { EvidenceQuote, Resume } from "./analysis-types.ts";
import { sumParts, type ScorePart, type SkillBreakdown } from "./scoring.ts";
import { wantOf } from "./skill-levels.ts";

const action = /\b(built|created|developed|deployed|analysed|analyzed|implemented|configured|investigated|automated|documented|led|delivered)\b/i;
const metric = /\b\d+(?:\.\d+)?\s*(?:%|users?|hours?|minutes?|seconds?|requests?|records?|tests?|incidents?)\b|\b\d+(?:\.\d+)?%/i;
const outcome = /\b(reduced|increased|improved|saved|prevented|resolved|achieved)\b/i;
const contains = (text: string, term: string) => new RegExp(`(?:^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^a-z0-9])`, "i").test(text);

/** Every awarded rule has an exact supporting passage. Duplicate passages never add points. */
export function scoreEvidence(name: string, terms: string[], resumes: Resume[], job: string) {
  const passages = (text: string, label: string): EvidenceQuote[] => text.split(/\r?\n|(?<=[.!?])\s+/)
    .map(quote => quote.trim()).filter(Boolean)
    .map(quote => ({ label, quote, matched: terms.filter(term => contains(quote, term)) }))
    .filter(line => line.matched.length > 0);
  const roleLines = passages(job, "Target role");
  const seen = new Set<string>();
  const resumeLines = resumes.flatMap(resume => passages(resume.text, resume.name)).filter(line => {
    const key = line.quote.toLowerCase();
    if (seen.has(key)) return false; seen.add(key); return true;
  });
  const parts: ScorePart[] = [];
  const demandParts: ScorePart[] = [];
  const missing: string[] = [];
  const add = (label: string, points: number, line?: EvidenceQuote) => {
    if (line) parts.push({ label, points, line }); else missing.push(label);
  };
  add("Skill named in a résumé passage", 20, resumeLines[0]);
  add("Used in a project or work action", 25, resumeLines.find(line => action.test(line.quote)));
  add("Quantified result or scope", 14, resumeLines.find(line => action.test(line.quote) && metric.test(line.quote)));
  add("Outcome described", 16, resumeLines.find(line => action.test(line.quote) && outcome.test(line.quote)));
  add("Second distinct supporting passage", 25, resumeLines[1]);
  if (roleLines[0]) demandParts.push({ label: "Skill requested in posting", points: 60, line: roleLines[0] });
  const required = roleLines.find(line => /\b(required|must|essential|need)\b/i.test(line.quote));
  if (required) demandParts.push({ label: "Explicit requirement", points: 20, line: required });
  if (roleLines[1]) demandParts.push({ label: "Repeated in another job passage", points: 20, line: roleLines[1] });
  const breakdown: SkillBreakdown = { parts, demandParts, jobLine: roleLines[0] ?? null, resumeLines, missing };
  const evidence = sumParts(parts), demand = sumParts(demandParts);
  return { demand, evidence, resumeQuote: resumeLines[0], roleQuote: roleLines[0], breakdown,
    scoreReason: `${name}: résumé rules total ${evidence}%; the posting asks for it at ${wantOf(demand).toLowerCase()} priority. Missing passages score 0. Text evidence, not hiring odds.` };
}

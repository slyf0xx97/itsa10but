import type { EvidenceQuote, Resume } from "./analysis-types.ts";
import { sumParts, type ScorePart, type SkillBreakdown } from "./scoring.ts";
import { splitPassages } from "./passages.ts";
import { wantOf } from "./skill-levels.ts";
import { foundWord, hasTerm, scrub, termRegex } from "./catalog.ts";

// Past-tense and -ing action verbs. Present-tense base forms are left out on purpose: "test" and "report" are as often nouns.
const VERBS = [
  "built", "created", "developed", "deployed", "analysed", "analyzed", "implemented", "configured", "investigated", "automated", "documented", "led", "delivered",
  "wrote", "written", "used", "ran", "trained", "monitored", "managed", "designed", "modelled", "modeled", "containerised", "containerized", "captured", "kept",
  "studied", "tested", "cleaned", "queried", "maintained", "optimised", "optimized", "migrated", "presented", "drafted", "launched", "shipped", "processed",
  "visualised", "visualized", "supported", "coordinated", "prepared", "produced", "reviewed", "resolved", "fixed", "debugged", "refactored", "integrated",
  "scripted", "parsed", "scraped", "compiled", "evaluated", "improved", "reduced", "increased", "handled", "operated", "administered", "installed", "hardened",
  "patched", "triaged", "escalated", "researched", "mentored", "taught", "facilitated", "organised", "organized", "planned", "set up", "stood up", "engineered",
  "architected", "programmed", "coded", "authored", "published", "benchmarked", "tuned", "scaled", "provisioned", "orchestrated", "extracted", "transformed",
  "using", "building", "creating", "developing", "managing", "leading", "writing", "designing", "automating", "analysing", "analyzing", "monitoring", "maintaining",
  "deploying", "implementing", "configuring", "training", "testing", "running",
];
const verbs = new RegExp(`\\b(?:${VERBS.join("|")})\\b`, "i");
// Résumé bullets usually open with the verb: "Tracked stock in a spreadsheet", "Supervised eight staff". Words that end in -ed but describe a person are not verbs.
const IRREGULAR = new Set(["led", "ran", "built", "wrote", "kept", "taught", "made", "grew", "cut", "set", "drove", "won", "sold", "held", "began", "spoke", "took", "gave", "found", "chose", "became", "oversaw", "sped", "split", "met"]);
const NOT_VERBS = new Set(["based", "experienced", "skilled", "motivated", "interested", "qualified", "certified", "accomplished", "detailed", "dedicated", "committed", "advanced", "related", "limited", "needed", "required", "preferred", "seasoned", "talented", "proven", "driven", "focused", "organised", "organized"]);
const opensWithVerb = (quote: string): boolean => {
  const first = /^[\s•*\-–·▪●\d.)]*([A-Za-z]+)/.exec(quote)?.[1]?.toLowerCase();
  return Boolean(first && (IRREGULAR.has(first) || (first.length > 3 && first.endsWith("ed") && !NOT_VERBS.has(first))));
};
const action = { test: (quote: string) => verbs.test(quote) || opensWithVerb(quote) };
const metric = /\b\d+(?:\.\d+)?\s*(?:%|users?|hours?|minutes?|seconds?|requests?|records?|tests?|incidents?)\b|\b\d+(?:\.\d+)?%/i;
const outcome = /\b(reduced|increased|improved|saved|prevented|resolved|achieved)\b/i;

// A passage that denies or only aspires to the skill, or that just lists skills, can name a skill but cannot prove it.
const NEGATION = /\b(?:no|not|never|without|yet|haven['’]t|hasn['’]t|don['’]t|didn['’]t|lack(?:s|ed|ing)?|limited|beginner|(?:currently |still |now )?learning (?:to|about|how)|studying|want(?:s)? to|hope(?:s)? to|plan(?:s|ning)? to|interested in|aspir\w+|only (?:read|watched|heard)|familiar(?:ity)? with)\b/i;
const LABEL = /^\s*(?:skills?|tools?|technologies|tech stack|languages|software|certifications?)\s*[:\-–]/i;
const SKILL_WORDS = /\b(?:skills?|proficien\w+|familiar\w*|knowledge of|experience (?:in|with)|exposure to)\b/i;

function isWeak(quote: string, matched: string[]): boolean {
  const commas = (quote.match(/,/g) ?? []).length;
  const words = quote.split(/\s+/).length;
  if (LABEL.test(quote) || (commas >= 3 && SKILL_WORDS.test(quote)) || (commas >= 4 && commas / words >= 0.3)) return true;
  const text = scrub(quote);
  return matched.some((term) => {
    const hit = termRegex(term).exec(text);
    return hit ? NEGATION.test(text.slice(Math.max(0, hit.index - 50), hit.index + hit[0].length + 30)) : false;
  });
}

type Line = EvidenceQuote & { weak: boolean };
const plain = ({ label, quote, matched }: Line): EvidenceQuote => ({ label, quote, matched });

/** Every awarded rule has an exact supporting passage. Duplicate passages never add points. A denied or list-only passage earns the "named" points and nothing more. */
export function scoreEvidence(name: string, terms: string[], resumes: Resume[], job: string) {
  const passages = (text: string, label: string): Line[] => splitPassages(text)
    .map((quote) => {
      const hits = terms.filter((term) => hasTerm(quote, term));
      return { label, quote, matched: [...new Set(hits.map((term) => foundWord(quote, term)))], weak: hits.length > 0 && isWeak(quote, hits) };
    })
    .filter((line) => line.matched.length > 0);
  const roleLines = passages(job, "Target role").map(plain);
  const seen = new Set<string>();
  const resumeLines = resumes.flatMap((resume) => passages(resume.text, resume.name)).filter((line) => {
    const key = line.quote.toLowerCase();
    if (seen.has(key)) return false; seen.add(key); return true;
  });
  const strong = resumeLines.filter((line) => !line.weak);
  const best = strong[0] ?? resumeLines[0];
  const parts: ScorePart[] = [];
  const demandParts: ScorePart[] = [];
  const missing: string[] = [];
  const add = (label: string, points: number, line?: Line) => {
    if (line) parts.push({ label, points, line: plain(line) }); else missing.push(label);
  };
  add("Skill named in a résumé passage", 20, best);
  add("Used in a project or work action", 25, strong.find((line) => action.test(line.quote)));
  add("Quantified result or scope", 14, strong.find((line) => action.test(line.quote) && metric.test(line.quote)));
  add("Outcome described", 16, strong.find((line) => action.test(line.quote) && outcome.test(line.quote)));
  add("Second distinct supporting passage", 25, strong[1]);
  if (roleLines[0]) demandParts.push({ label: "Skill requested in posting", points: 60, line: roleLines[0] });
  const required = roleLines.find((line) => /\b(required|must|essential|need)\b/i.test(line.quote));
  if (required) demandParts.push({ label: "Explicit requirement", points: 20, line: required });
  if (roleLines[1]) demandParts.push({ label: "Repeated in another job passage", points: 20, line: roleLines[1] });
  const breakdown: SkillBreakdown = { parts, demandParts, jobLine: roleLines[0] ?? null, resumeLines: resumeLines.map(plain), missing };
  const evidence = sumParts(parts), demand = sumParts(demandParts);
  return { demand, evidence, resumeQuote: best ? plain(best) : undefined, roleQuote: roleLines[0], breakdown,
    scoreReason: `${name}: résumé rules total ${evidence}%; the posting asks for it at ${wantOf(demand).toLowerCase()} priority. Missing passages score 0. Text evidence, not hiring odds.` };
}

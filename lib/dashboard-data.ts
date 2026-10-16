import type { Analysis, AtsCheck, AtsReport, CompanyCulture, Quest, Skill } from "./analysis-types.ts";
import { HAVE_FROM, stateOf } from "./radar-tiers.ts";
import { proofOf, wantOf, type Proof, type Want } from "./skill-levels.ts";

/** Pure data shaping for the synthesis dashboard. Every number comes from the analysis; nothing is invented. */

const num = (value: number) => (Number.isFinite(value) ? value : 0);
const byKey = <T,>(items: T[], key: (item: T) => number) => items.map((item, index) => ({ item, index })).sort((a, b) => key(b.item) - key(a.item) || a.index - b.index).map((entry) => entry.item);

export type Bar = { name: string; value: number };

/** Role Scout chart: demand per skill, highest first. */
export const demandBars = (skills: Skill[]): Bar[] => byKey(skills, (s) => num(s.demand)).map((s) => ({ name: s.name, value: num(s.demand) }));

/** Experience Finder chart: evidence per skill, in demand order so it lines up with the Role Scout chart. */
export const evidenceBars = (skills: Skill[]) => byKey(skills, (s) => num(s.demand)).map((s) => ({ name: s.name, demand: num(s.demand), evidence: num(s.evidence), hasQuote: Boolean(s.resumeQuote) }));

/** "Rank the skills": the skills the role asks for most come first; equal asks keep their input order. */
export const rankSkills = (skills: Skill[]): Skill[] => byKey(skills, (s) => num(s.demand));

export const quoteCount = (skills: Skill[]) => skills.filter((s) => s.resumeQuote).length;

/** Role Scout strip: one Have / Gap mark per skill in demand order (same threshold as the chips), and how many have proof. */
export function coverage(skills: Skill[]) {
  const marks = byKey(skills, (s) => num(s.demand)).map((s) => stateOf(num(s.evidence)));
  return { marks, have: marks.filter((m) => m === "have").length, total: marks.length };
}

/** Tips the planner card shows, and the ticks store keeps. */
export const PLANNER_MAX = 6;

export type PlannerRow = { index: number; title: string; skill: string; want: Want | "None"; proof: Proof; why: string };

const WANT_WORDS: Record<Want, string> = { High: "a lot", Medium: "somewhat", Low: "a little" };
const PROOF_WORDS: Record<Proof, string> = { None: "nothing yet", Weak: "only a little", Some: "some", Strong: "plenty" };
/** A closing line for the proof levels where the tip is to sharpen what is there rather than start from nothing. */
const PROOF_TAIL: Partial<Record<Proof, string>> = { Some: " A project line would make it clearer.", Strong: " A number would make it stronger." };

/** Action Planner list: the first tips, each with the numbers for its skill (looked up by name, any case) and one plain sentence. A tip whose skill is not in the list gets a line built from the tip alone. */
export function plannerRows(skills: Skill[], quests: Quest[]): PlannerRow[] {
  return quests.slice(0, PLANNER_MAX).map((quest, index) => {
    const skill = skills.find((s) => s.name.toLowerCase() === quest.skill.toLowerCase());
    const base = { index, title: quest.title, skill: quest.skill };
    if (!skill) return { ...base, want: "None" as const, proof: "None" as const, why: quest.skill ? `A tip that gives you something to show for ${quest.skill}.` : "A tip that gives you something to show." };
    const want = wantOf(skill.demand);
    const proof = proofOf(skill.evidence);
    return { ...base, want, proof, why: `Asked for ${WANT_WORDS[want]}. Your résumé shows ${PROOF_WORDS[proof]}.${PROOF_TAIL[proof] ?? ""}` };
  });
}

/** Plain reason built from the numbers, written to follow a list of skill names ("SIEM, Reporting: no line in your résumé matches"). The engine's rule totals are never shown. */
export const weakReason = (evidence: number, hasQuote: boolean) =>
  evidence <= 0 ? "no line in your résumé matches"
    : !hasQuote ? "scored, but no quote in your résumé backs it up"
      : "listed, but no project or result backs it up";

export type WeakProof = { name: string; evidence: number; demand: number; kind: "missing" | "thin"; reason: string };

/** Experience Finder: skills with no matching quote or evidence under the shared threshold, weakest first (lowest evidence, then highest demand). */
export function weakProofs(skills: Skill[]): WeakProof[] {
  const weak = skills.filter((s) => !s.resumeQuote || num(s.evidence) < HAVE_FROM);
  return weak
    .map((s, index) => ({ s, index }))
    .sort((a, b) => num(a.s.evidence) - num(b.s.evidence) || num(b.s.demand) - num(a.s.demand) || a.index - b.index)
    .map(({ s }) => ({
      name: s.name, evidence: num(s.evidence), demand: num(s.demand),
      kind: !s.resumeQuote || num(s.evidence) <= 0 ? "missing" as const : "thin" as const,
      reason: weakReason(num(s.evidence), Boolean(s.resumeQuote)),
    }));
}

/** Weak proofs that share a reason, in the order the reasons first appear (weakest first), so the card says each reason once. */
export function weakGroups(weak: WeakProof[]): { reason: string; names: string[] }[] {
  const groups: { reason: string; names: string[] }[] = [];
  for (const item of weak) {
    const group = groups.find((g) => g.reason === item.reason);
    if (group) group.names.push(item.name); else groups.push({ reason: item.reason, names: [item.name] });
  }
  return groups;
}

const ATS_GROUPS: { id: AtsCheck["group"]; label: string }[] = [{ id: "parse", label: "Parse" }, { id: "keywords", label: "Keywords" }, { id: "wording", label: "Wording" }, { id: "format", label: "Format" }];

/** ATS card: checks bucketed in a fixed order (Parse, Keywords, Wording, Format); empty groups are left out. */
export function atsGroups(ats?: AtsReport) {
  return ATS_GROUPS.map((g) => ({ ...g, checks: (ats?.checks ?? []).filter((c) => c.group === g.id) })).filter((g) => g.checks.length > 0);
}

export function atsCounts(ats?: AtsReport) {
  const checks = ats?.checks ?? [];
  const pass = checks.filter((c) => c.status === "pass").length;
  const warn = checks.filter((c) => c.status === "warn").length;
  return { pass, warn, fail: checks.length - pass - warn, total: checks.length };
}

/** At most `max` items plus a count of the rest. */
export const chipList = (items: string[] | undefined, max = 8) => ({ shown: (items ?? []).slice(0, max), more: Math.max(0, (items ?? []).length - max) });

/** Split a fix into the key phrase (before a colon, dash or comma, else the first three words) and the rest, so the phrase can be highlighted. */
export function fixParts(fix: string): { key: string; rest: string } {
  const text = fix.trim();
  const cut = text.match(/^(.{3,40}?)(?=\s*(?::|—|–|,))/);
  const key = cut ? cut[1] : text.split(/\s+/).slice(0, 3).join(" ");
  return { key, rest: text.slice(key.length) };
}

/** Verdict word for the ATS-style score: 80 and up is Ready, 60 to 79 is Almost there, under 60 is Needs work. */
export const atsVerdict = (score: number): { word: "Ready" | "Almost there" | "Needs work"; tone: "ready" | "almost" | "work" } =>
  score >= 80 ? { word: "Ready", tone: "ready" } : score >= 60 ? { word: "Almost there", tone: "almost" } : { word: "Needs work", tone: "work" };

/** Filled segments of the 10-segment bar (0..10). A score of 88 fills 9. */
export const atsSegments = (score: number) => Math.max(0, Math.min(10, Math.round(num(score) / 10)));

/** Company card view: value chips capped at 12 with a "+n more" count, the popup keeps every value, tips cap at three. */
export const MAX_VALUE_CHIPS = 12;
export function companyView(company?: CompanyCulture) {
  if (!company) return null;
  return {
    name: company.name,
    chips: chipList(company.values.map((v) => v.name), MAX_VALUE_CHIPS),
    values: company.values,
    expectations: company.expectations.slice(0, 4),
    reputation: company.reputation ?? [],
    showIt: company.showIt.slice(0, 3),
    sources: company.sources,
    note: company.note,
    originLabel: company.origin === "built-in" ? "Official page" : "Found on the web",
  };
}

/** Keywords listed in the Checks tab; the panel scrolls, so this only guards against a runaway list. */
const KEYWORD_MAX = 30;

export const atsView = (ats?: AtsReport) => ats ? {
  score: Math.max(0, Math.min(100, Math.round(num(ats.score)))),
  verdict: atsVerdict(Math.max(0, Math.min(100, Math.round(num(ats.score))))),
  segments: atsSegments(ats.score),
  allGroups: atsGroups(ats),
  counts: atsCounts(ats),
  fixes: (ats.fixes ?? []).slice(0, 3).map(fixParts),
  found: chipList(ats.keywordsFound, KEYWORD_MAX), missing: chipList(ats.keywordsMissing, KEYWORD_MAX),
  note: ats.note,
} : null;

export function dashboardData(analysis: Analysis) {
  const { skills, quests } = analysis;
  const weak = weakProofs(skills);
  const demand = demandBars(skills);
  const evidence = evidenceBars(skills);
  return {
    weak: weakGroups(weak),
    weakNames: weak.map((item) => item.name),
    coverage: coverage(skills),
    quotes: quoteCount(skills),
    ats: atsView(analysis.ats),
    company: companyView(analysis.company),
    demand,
    evidence,
    planner: plannerRows(skills, quests),
    match: Math.max(0, Math.min(100, Math.round(num(analysis.matchPercent)))),
  };
}

import type { Analysis, LiveRunInfo, Skill } from "./analysis-types.ts";
import { atsCounts, atsGroups, weakProofs } from "./dashboard-data.ts";
import { MODE_NOTE, SWITCH_LABEL, liveRunNote } from "./mode-copy.ts";
import { wantOf } from "./skill-levels.ts";

/** Words for the "See full findings" popups: the mode that ran, and the steps each reader took. Every number comes from the analysis. */

export type ReaderKey = "scout" | "finder" | "recruiter" | "planner";

const num = (value: number) => (Number.isFinite(value) ? value : 0);
const count = (total: number, one: string, many = `${one}s`) => `${total} ${total === 1 ? one : many}`;

/**
 * The mode that produced this analysis, named the way the rest of the page names it. Pass `hasResult` from the page when it is known:
 * before the visitor's run every reader says Sample, after it none does, so all four popups agree whatever the analysis object carries.
 */
export function modeInfo(mode: Analysis["mode"], hasResult?: boolean, run?: LiveRunInfo): { name: string; note: string; steps: string } {
  if (hasResult === false) mode = "sample";
  else if (hasResult && mode === "sample") mode = "preview";
  if (mode === "live") return { name: run?.model ? `API boost, ${run.model}` : "API boost", note: liveRunNote(run), steps: "These steps come from the finished answers of the four agents." };
  if (mode === "preview") return { name: "Native scan", note: MODE_NOTE.rules, steps: "These steps are counted from the native scan's result. Only the privacy check ran as a real step." };
  return { name: "Sample", note: "This is sample data about a made-up student called Alex. Run the check to see your own.", steps: "These steps are counted from the sample data." };
}

/** What to say when no company details exist. It depends on the mode: Native scan knows only a short built-in list and never searches the web, while API boost did look and came back empty. Never invents a detail. */
export function companyMissing(mode: Analysis["mode"]): { short: string; title: string; text: string } {
  if (mode === "live") return {
    short: "No company details found",
    title: "No company details found",
    text: "Role Scout looked for the employer and found nothing it could check against the posting. The posting may not name the company, or the web search may have been off. Try the company's careers page.",
  };
  return {
    short: `Turn on ${SWITCH_LABEL} to search company details`,
    title: "Company details need " + SWITCH_LABEL,
    text: `Native scan only checks a short list of well-known employers, and this posting didn't match one. Turn on ${SWITCH_LABEL} in the header and Role Scout will search the web for company details.`,
  };
}

/** What the reader did, in order, as plain sentences built from the finished analysis. */
export function readerSteps(reader: ReaderKey, analysis: Analysis): string[] {
  const skills = analysis.skills;
  const total = skills.length;
  const byDemand = [...skills].sort((a, b) => num(b.demand) - num(a.demand));
  switch (reader) {
    case "scout": {
      const withLine = skills.filter((skill) => skill.roleQuote).length;
      const top = byDemand[0];
      return [
        total ? `Read the role text and picked out ${count(total, "skill")}.` : "Read the role text and found no skills to pick out.",
        total ? `Found a role line that names ${withLine} of ${total}.${withLine < total ? ` The other ${total - withLine} ${total - withLine === 1 ? "has" : "have"} no quote.` : ""}` : "Nothing to look up.",
        top ? `Ranked them by how much the role asks. Top ask: ${top.name}, ${wantOf(top.demand).toLowerCase()} priority.` : "Nothing to rank.",
        analysis.company ? `Checked the posting for an employer. Found ${analysis.company.name}.` : "Checked the posting for an employer. Found none.",
      ];
    }
    case "finder": {
      const quoted = skills.filter((skill) => skill.resumeQuote).length;
      const weak = weakProofs(skills);
      return [
        total ? `Searched your résumé for each of the ${count(total, "skill")}.` : "Found no skills to search for.",
        total ? (quoted === total ? "Found a matching line for every skill." : `Found a matching line for ${quoted}. The other ${total - quoted} had no match and score 0.`) : "Nothing to match.",
        quoted ? "Checked each quote word for word against your text." : "Had no quotes to check.",
        total ? (weak.length ? `Scored the proof for each skill from 0 to 100. Flagged ${count(weak.length, "weak proof")}, weakest first: ${weak.slice(0, 2).map((item) => item.name).join(", ")}.` : "Scored the proof for each skill from 0 to 100. No weak proof flagged.") : "Nothing to score.",
      ];
    }
    case "recruiter": {
      const ats = analysis.ats;
      if (!ats) return ["No résumé checks ran for this result."];
      const counts = atsCounts(ats);
      const groups = atsGroups(ats);
      return [
        "Read your résumé text on its own, the way hiring software (ATS) would. It saw no notes from the other readers.",
        `Ran ${count(counts.total, "check")} in ${count(groups.length, "group")}: ${groups.map((group) => group.label).join(", ")}.`,
        `${counts.pass} passed (nothing to do), ${counts.warn} to check (take a look) and ${counts.fail} to fix (change these first).`,
        `Compared the role's keywords with your résumé. ${ats.keywordsFound.length} found, ${ats.keywordsMissing.length} missing.`,
        `Gave a score of ${Math.round(num(ats.score))} out of 100.`,
      ];
    }
    case "planner": {
      const gap = skills.map((skill) => ({ name: skill.name, demand: Math.round(num(skill.demand)), evidence: Math.round(num(skill.evidence)) })).filter((item) => item.demand > item.evidence).sort((a, b) => (b.demand - b.evidence) - (a.demand - a.evidence))[0];
      return [
        total ? `Put what the role asks next to what your résumé shows, for ${count(total, "skill")}.` : "Found no skills to compare.",
        gap ? `Found the biggest gap: ${gap.name}. The role asks for it at ${wantOf(gap.demand).toLowerCase()} priority and your résumé shows ${gap.evidence}%.` : "Found no gap between the ask and the proof.",
        `Picked ${count(analysis.quests.length, "tip")} to close the gaps, in the order to do them.`,
        `Worked out a match of ${Math.round(num(analysis.matchPercent))}%. It compares your proof with what the role asks.`,
      ];
    }
  }
}

/** One short line for the card that says what the popup adds. */
export const POPUP_ADDS: Record<ReaderKey, string> = {
  scout: "Open it to see every skill, its quotes and the company details.",
  finder: "Open it to see each skill's proof, its quotes and why weak ones are weak.",
  recruiter: "Open it to see the fixes to make first, every check and every keyword found or missing.",
  planner: "Open it to see each tip in full, with what to show, free lessons and recent articles.",
};

export type QuoteRow = {
  name: string;
  role: { source: string; quote: string } | null;
  resume: { source: string; quote: string } | null;
};

/** One row per skill with the role quote and the résumé quote and where each came from. A null side means no match, which scores 0 for that source. `names` limits and orders the rows. */
export function quoteRows(skills: Skill[], names?: string[]): QuoteRow[] {
  const picked = names ? names.flatMap((name) => skills.filter((skill) => skill.name.toLowerCase() === name.toLowerCase()).slice(0, 1)) : skills;
  const unique = picked.filter((skill, index) => picked.indexOf(skill) === index);
  return unique.map((skill) => ({
    name: skill.name,
    role: skill.roleQuote ? { source: skill.roleQuote.label, quote: skill.roleQuote.quote } : null,
    resume: skill.resumeQuote ? { source: skill.resumeQuote.label, quote: skill.resumeQuote.quote } : null,
  }));
}

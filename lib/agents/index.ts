import type { AgentNote, Analysis, AtsCheck, MarketSource, Skill } from "../analysis-types.ts";
import { atsCheckInfo, atsNote, atsScore } from "../ats-check.ts";
import { enrichQuest, playbookFor } from "../skill-playbooks.ts";
import { actionPlanner, type ActionPlannerOutput } from "./action-planner.ts";
import { experienceFinder, type ExperienceFinderOutput } from "./experience-finder.ts";
import { recruiter, type RecruiterOutput } from "./recruiter.ts";
import { roleScout, type RoleScoutOutput } from "./role-scout.ts";

export { actionPlanner, experienceFinder, recruiter, roleScout };

/** The four specs in run order. */
export const AGENT_SPECS = [roleScout, experienceFinder, recruiter, actionPlanner] as const;

/**
 * Type-level check only (U10): proves the four output schemas carry every
 * field Analysis needs. It does no verification, clamping or URL checks.
 * The runner (U11) must still verify quotes, clamp scores, check the ATS
 * report (known ids, score recomputed, keyword lists rebuilt), sanitise links
 * and compute the match. The Recruiter reads the résumé cold, so Analysis.ats
 * comes from it alone, and the Finder supplies the skill evidence and the "but".
 */
export function analysisShapeFromOutputs(
  scout: RoleScoutOutput,
  finder: ExperienceFinderOutput,
  recruiterOutput: RecruiterOutput,
  plan: ActionPlannerOutput,
  match: Pick<Analysis, "matchPercent" | "matchFormula" | "confidence">,
): Analysis & { ats: NonNullable<Analysis["ats"]> } {
  const skills: Skill[] = scout.skills.map((roleSkill) => {
    const found = finder.evidence.find((item) => item.skill === roleSkill.name);
    const weak = finder.weakProofs.find((item) => item.skill === roleSkill.name);
    return {
      name: roleSkill.name,
      demand: roleSkill.demand,
      evidence: found?.evidence ?? 0,
      detail: found?.detail ?? roleSkill.why ?? "",
      source: "API boost agents",
      roleQuote: roleSkill.roleQuote ? { label: "Submitted role", quote: roleSkill.roleQuote, matched: [] } : undefined,
      resumeQuote: found?.resumeQuote ? { label: "Your résumé", quote: found.resumeQuote, matched: [] } : undefined,
      scoreReason: weak?.why || undefined,
    };
  });
  const agents: AgentNote[] = [scout, finder, recruiterOutput, plan].map((output, index) => ({ role: AGENT_SPECS[index].name, note: output.note }));
  const sources: MarketSource[] = [
    ...plan.quests.flatMap((quest) => (quest.link ? [quest.link] : [])),
  ];
  const checks: AtsCheck[] = recruiterOutput.checks.flatMap((item) => {
    const info = atsCheckInfo(item.id);
    return info ? [{ id: info.id, group: info.group, label: item.label, status: item.status, tip: item.tip }] : [];
  });
  return {
    title: scout.title,
    verdict: plan.verdict,
    but: finder.but,
    confidence: match.confidence,
    skills,
    agents,
    // The agent's own link (checked by the runner) leads the list, then the playbook's checked links, steps and résumé line for the skill.
    quests: plan.quests.map(({ title, task, proof, skill, link }) => enrichQuest({ title, task, proof, skill, ...(link ? { links: [{ title: link.title, url: link.url, kind: "Guide" as const }, ...(playbookFor(skill)?.links ?? [])].slice(0, 4) } : {}) })),
    sources,
    mode: "live",
    matchPercent: match.matchPercent,
    matchFormula: match.matchFormula,
    ats: { score: atsScore(checks), checks, keywordsFound: recruiterOutput.keywordsFound, keywordsMissing: recruiterOutput.keywordsMissing, fixes: recruiterOutput.fixes, note: atsNote(checks.length) },
  };
}

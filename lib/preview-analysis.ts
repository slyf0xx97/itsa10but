import { scoreEvidence } from "./evidence-scoring.ts";
import type { Analysis, Resume, Skill, Quest } from "./analysis-types.ts";
import { computeMatch } from "./scoring.ts";
import { recruiterReview } from "./recruiter-review.ts";
import { atsCheck } from "./ats-check.ts";
import { detectCompany } from "./company-culture.ts";
import { generalTips, playbookFor, questFor, tipKind } from "./skill-playbooks.ts"; // skill-playbooks reads `catalog` only inside functions, so the import cycle is safe

import { catalog, hasTerm, type SkillSeed } from "./catalog.ts";
export { catalog, hasTerm };
export type { SkillSeed };

const count = (text: string, terms: string[]) => terms.reduce((total, term) => total + (hasTerm(text, term) ? 1 : 0), 0);

/** A skill the posting names that the catalog lacks (found by the Cloudflare AI role read). Its only term is its own spelling, so it scores from literal quotes like any other. */
export const extraSeed = (name: string): SkillSeed => ({ name, terms: [name.toLowerCase()], tip: `Show ${name} in a small project you can link.`, proof: "A link a reader can open, with a short write-up" });

export function previewAnalysis(resumes: Resume[], job: string, extraSkills: string[] = []): Analysis {
  const allText = resumes.map((resume) => resume.text).join("\n");
  const jobText = job.toLowerCase();
  const roleTitle = job.split(/[—–\n.!?]/)[0].trim().slice(0, 72) || "Target role";
  const relevant = [...catalog, ...extraSkills.map(extraSeed)].map((seed) => {
    const wanted = count(jobText, seed.terms);
    const found = count(allText, seed.terms);
    if (!wanted && !found) return null;
    const scored = scoreEvidence(seed.name, seed.terms, resumes, job);
    const { demand, evidence } = scored;
    const skill: Skill = { name: seed.name, ...scored,
      detail: evidence ? `Your résumé shows proof of ${seed.name}. The quotes below show where.` : `Nothing in your résumé matches ${seed.name}.`,
      source: scored.resumeQuote ? `Résumé: ${scored.resumeQuote.label}` : "Pasted job description" };
    return { seed, skill, priority: demand - evidence + (wanted ? 15 : 0) };
  }).filter((item): item is NonNullable<typeof item> => item !== null);
  // Only six skills are shown. The role's biggest asks come first; among equal asks, the one the résumé proves best stays.
  relevant.sort((a, b) => b.skill.demand - a.skill.demand || b.skill.evidence - a.skill.evidence);
  const selected = relevant.slice(0, 6);
  const noCatalogMatch = selected.length === 0;
  if (noCatalogMatch) {
    const seed: SkillSeed = { name: "Role-specific evidence", terms: [], tip: "Choose one requirement from the posting and show how you used it in a project.", proof: "Project example tied to the role" };
    selected.push({ seed, skill: { name: seed.name, ...scoreEvidence(seed.name, [], resumes, job), detail: "This role doesn't match our skill list closely enough for a specific score. Add clearer requirements or project examples.", source: "Supplied résumé and role text", scoreReason: "No known skills matched. These scores are placeholders until the role names a skill we recognise." }, priority: 50 });
  }
  const gaps = [...selected].sort((a, b) => b.priority - a.priority);
  const meaningfulGaps = gaps.filter((item) => item.skill.demand - item.skill.evidence >= 20);
  const primary = meaningfulGaps[0] ?? gaps[0];
  const strength = [...selected].sort((a, b) => b.skill.evidence - a.skill.evidence)[0];
  const hasGap = meaningfulGaps.length > 0;
  // A tip comes from the skill's playbook, in the kind that fits what the résumé lacks (build it, show it, or put a number on it).
  const tipFor = ({ seed, skill }: { seed: SkillSeed; skill: Skill }): Quest => questFor(seed.name, tipKind(skill)) ?? { title: `Show ${seed.name} in a project`, task: seed.tip, proof: seed.proof, skill: seed.name };
  // Up to four tips from the gaps, then the skills with the least proof, then practical general tips so there are never fewer than four.
  const quests: Quest[] = meaningfulGaps.slice(0, 4).map(tipFor);
  for (const item of [...selected].sort((a, b) => a.skill.evidence - b.skill.evidence)) {
    if (quests.length >= 5) break;
    if (quests.some((quest) => quest.skill === item.seed.name) || !playbookFor(item.seed.name)) continue;
    quests.push(tipFor(item));
  }
  for (const tip of generalTips(roleTitle, primary.seed.name)) if (quests.length < 4) quests.push(tip);
  const matchScore = computeMatch(selected.map((item) => item.skill));
  const weakProof = selected.filter((item) => item.skill.demand - item.skill.evidence >= 20).length;
  const ats = atsCheck(allText, noCatalogMatch ? [] : selected.map((item) => item.skill.name));
  const topFix = ats.fixes[0];
  const review = recruiterReview({ resumeText: allText, roleTitle, skills: selected.map((item) => item.skill), ats, bulletFor: (name) => questFor(name, "show")?.bullet });
  const company = detectCompany(job);
  return {
    title: roleTitle,
    verdict: noCatalogMatch ? "Add a specific role requirement and a matching project example." : hasGap ? `Make one ${primary.skill.name} example you can point to.` : "Add a clear outcome and link to your strongest project.",
    but: noCatalogMatch ? "This text names too few skills to rank the role." : hasGap ? `Your résumé has ${strength.skill.name} experience, but it shows little proof of ${primary.skill.name} for this role.` : `Your résumé mentions the main tools for this role. A reader still needs to see what your ${strength.skill.name} work achieved.`,
    confidence: "Based only on the text you gave",
    mode: "preview",
    skills: selected.map((item) => item.skill),
    agents: [
      { role: "Role reader", note: noCatalogMatch ? "The posting names too few recognisable tools or skills to rank." : `The posting leans most on ${selected.slice(0, 3).map((item) => item.skill.name).join(", ")}.` },
      { role: "Advocate", note: noCatalogMatch ? "Add a project that names the tools you used, what you did and the result." : hasGap ? `${strength.skill.name} is your strongest proof. ${weakProof === 1 ? "One skill has" : `${weakProof} skills have`} thin or missing proof, and ${primary.skill.name} is the biggest gap.` : `${strength.skill.name} is your strongest proof. No skill is far behind what the role asks for.` },
      { role: "Recruiter", note: `Screening check: ${ats.score} out of 100 for readiness. Top note: ${review.improvements[0].title}. ${topFix ?? review.improvements[0].why}` },
      { role: "Editor", note: noCatalogMatch ? "Start with one requirement from the posting and show proof for it." : hasGap ? `Make one ${primary.skill.name} example before rewriting the résumé.` : "Add a specific outcome and project link before adding more keywords." },
    ],
    quests,
    sources: [],
    matchPercent: matchScore.percent,
    matchFormula: matchScore.formula,
    ats,
    review,
    ...(company ? { company } : {}),
  };
}

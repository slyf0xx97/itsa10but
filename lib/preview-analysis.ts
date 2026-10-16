import { scoreEvidence } from "./evidence-scoring.ts";
import type { Analysis, Resume, Skill, Quest } from "./analysis-types.ts";
import { computeMatch } from "./scoring.ts";
import { recruiterReview } from "./recruiter-review.ts";
import { atsCheck } from "./ats-check.ts";
import { detectCompany } from "./company-culture.ts";
import { generalTips, playbookFor, questFor, tipKind } from "./skill-playbooks.ts"; // skill-playbooks reads `catalog` only inside functions, so the import cycle is safe

export type SkillSeed = { name: string; terms: string[]; tip: string; proof: string };
export const catalog: SkillSeed[] = [
  { name: "Python", terms: ["python", "pandas", "numpy"], tip: "Build a small Python workflow that solves a real task.", proof: "Public repository and short write-up" },
  { name: "SQL", terms: ["sql", "postgres", "mysql", "sqlite"], tip: "Answer a real question using a small relational dataset.", proof: "Queries and findings" },
  { name: "Data analysis", terms: ["data analysis", "analytics", "data analyst", "exploratory"], tip: "Analyse a public dataset and explain three findings.", proof: "Notebook and one-page insight brief" },
  { name: "Dashboards", terms: ["dashboard", "tableau", "power bi", "visualisation", "visualization"], tip: "Build a dashboard with a clear decision it supports.", proof: "Dashboard link and design notes" },
  { name: "Machine learning", terms: ["machine learning", "model training", "scikit", "prediction"], tip: "Train and evaluate a baseline model on a public dataset.", proof: "Model card and evaluation notebook" },
  { name: "Deep learning", terms: ["deep learning", "pytorch", "tensorflow", "keras", "neural network", "neural networks"], tip: "Train a small neural network on a public dataset and compare it with a simple baseline.", proof: "Notebook with training curves and a short write-up" },
  { name: "MLOps", terms: ["mlops", "mlflow", "model deployment", "model serving", "docker", "kubernetes"], tip: "Package a trained model in a container and serve it through a small API.", proof: "Container file, API link and README" },
  { name: "Communication", terms: ["communication", "stakeholder", "present", "storytelling"], tip: "Present a technical finding to a nontechnical audience.", proof: "Slides and recorded explanation" },
  { name: "JavaScript", terms: ["javascript", "typescript", "node.js", "nodejs"], tip: "Ship a small web feature with clear user value.", proof: "Deployed feature and code link" },
  { name: "React", terms: ["react", "next.js", "frontend"], tip: "Build one accessible interface from a short brief.", proof: "Live demo and repository" },
  { name: "APIs", terms: ["api", "rest", "graphql", "endpoint"], tip: "Integrate an API and handle empty and error states.", proof: "Working integration and README" },
  { name: "Testing", terms: ["testing", "unit test", "integration test", "qa"], tip: "Add meaningful tests around a real feature.", proof: "Passing test run and coverage notes" },
  { name: "Networking", terms: ["networking", "network", "tcp", "wireshark"], tip: "Map traffic in a safe lab and explain what happened.", proof: "Annotated packet capture and write-up" },
  { name: "Linux", terms: ["linux", "bash", "shell"], tip: "Automate a repeatable Linux administration task.", proof: "Script and runbook" },
  { name: "SIEM", terms: ["siem", "splunk", "sentinel", "elastic security"], tip: "Investigate a safe simulated alert in a SIEM lab.", proof: "Alert timeline and annotated screenshots" },
  { name: "Incident response", terms: ["incident", "triage", "soc", "security operations"], tip: "Work through a simulated incident from alert to closure.", proof: "Incident report with timeline" },
  { name: "Cloud", terms: ["aws", "azure", "gcp", "cloud"], tip: "Deploy a small service with basic access controls.", proof: "Architecture diagram and deployment notes" },
  { name: "Reporting", terms: ["report", "documentation", "write-up", "writing"], tip: "Write a concise report from one technical project.", proof: "One-page report with evidence links" },
];

export const hasTerm = (text: string, term: string) => new RegExp(`(?:^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^a-z0-9])`, "i").test(text);
const count = (text: string, terms: string[]) => terms.reduce((total, term) => total + (hasTerm(text, term) ? 1 : 0), 0);

export function previewAnalysis(resumes: Resume[], job: string): Analysis {
  const allText = resumes.map((resume) => resume.text).join("\n");
  const jobText = job.toLowerCase();
  const roleTitle = job.split(/[—–\n.!?]/)[0].trim().slice(0, 72) || "Target role";
  const relevant = catalog.map((seed) => {
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
  relevant.sort((a, b) => b.skill.demand - a.skill.demand);
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

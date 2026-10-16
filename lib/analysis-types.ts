import type { SkillBreakdown } from "./scoring.ts";
import { previewAnalysis } from "./preview-analysis.ts";
import type { RecruiterReview } from "./recruiter-review.ts";

export type Resume = { id: string; name: string; text: string };
export type EvidenceQuote = { label: string; quote: string; matched: string[] };
export type Skill = { name: string; demand: number; evidence: number; detail: string; source: string; resumeQuote?: EvidenceQuote; roleQuote?: EvidenceQuote; scoreReason?: string; breakdown?: SkillBreakdown };
export type AgentNote = { role: string; note: string };
/** What a resource is, shown as a small tag on its card. */
export type LinkKind = "Course" | "Docs" | "Practice" | "Video" | "Tool" | "Dataset" | "Guide";
export type QuestLink = { title: string; url: string; kind: LinkKind };
/** How a tip helps: build something new, turn a mention into a project line, or put a number on a line that already shows the work. */
export type QuestKind = "build" | "show" | "measure";
/**
 * One tip to close a gap. The type keeps its old name. The page calls these tips and tricks, and they carry no time estimate.
 * title, task, proof and skill are always there. A native scan fills the rest from lib/skill-playbooks.ts: three short steps, a résumé line to adapt, and checked links.
 */
export type Quest = { title: string; task: string; proof: string; skill: string; kind?: QuestKind; steps?: string[]; bullet?: string; links?: QuestLink[] };
export type MarketSource = { title: string; url: string };
export type AtsStatus = "pass" | "warn" | "fail";
export type AtsCheck = { id: string; group: "parse" | "keywords" | "wording" | "format"; label: string; status: AtsStatus; tip: string };
/** An ATS-style check of the résumé text: a rule of thumb, not a specific employer's system and not a hiring chance. */
export type AtsReport = { score: number; checks: AtsCheck[]; keywordsFound: string[]; keywordsMissing: string[]; fixes: string[]; note: string };
/** name = the company's own name for the value; meaning = our short plain-English gloss (14 words or fewer), never copied text. */
export type CompanyValue = { name: string; meaning: string };
/** What an employer publishes about how it works. Built-in entries come from a checked list; web entries are found by the Role Scout in a live run. */
export type CompanyCulture = {
  name: string;
  /** Up to 16. */
  values: CompanyValue[];
  /** Up to 4 short lines: what the company says it expects from people, in our wording. */
  expectations: string[];
  /** Up to 3 short lines, only from cited sources, web mode only. */
  reputation?: string[];
  /** Up to 3 tips on showing these values in a résumé or interview. */
  showIt: string[];
  /** https only, at least one. */
  sources: { label: string; url: string }[];
  /** built-in = checked list in lib/company-culture.ts; web = found by the Role Scout this run. */
  origin: "built-in" | "web";
  /** Honesty line for the reader: where this came from and when. */
  note: string;
};
/** API boost runs only: which model(s) answered, whether they are Claude, and whether web search was on. Shown on the results so labels stay honest. */
export type LiveRunInfo = { model: string; claude: boolean; web: boolean };
export type Analysis = {
  title: string;
  verdict: string;
  but: string;
  confidence: string;
  skills: Skill[];
  agents: AgentNote[];
  quests: Quest[];
  sources: MarketSource[];
  mode: "sample" | "live" | "preview";
  matchPercent: number;
  matchFormula: string;
  ats?: AtsReport;
  /** Native scan only: the Recruiter quick-read notes, always with at least three things to improve. */
  review?: RecruiterReview;
  /** Absent when the posting names no known employer (native scan) or the Role Scout found nothing credible (live). */
  company?: CompanyCulture;
  /** Set by the API boost runner only. */
  run?: LiveRunInfo;
};

export const sampleResume = `Alex Tan | Computer science student\nProjects: Built a Python image classifier with PyTorch and trained it on 12,000 labelled photos, reaching 91% accuracy on a held-out test set.\nProjects: Built scikit-learn machine learning models to predict bike rental demand and compared three baselines.\nProjects: Wrote SQL queries in PostgreSQL to clean and join three course datasets before model training.\nProjects: Used an AWS EC2 GPU instance for model training on a course project.\nProjects: Presented the results to a class of 40 and wrote a two-page report on what the model gets wrong.\nSkills: Python, PyTorch, scikit-learn, SQL, Git, AWS, technical writing.`;
export const sampleJob = `AI / Machine Learning Engineer. Train and evaluate machine learning models in Python with PyTorch or TensorFlow. Build data pipelines with SQL. You must deploy models with MLOps practices on AWS. Serve them through an API. You will track experiments, monitor model quality after release, and explain results to product teams and non-technical stakeholders. Strong Python and machine learning fundamentals are required. Familiarity with Docker is preferred.`;

// What the page shows before a run. Scores, quotes, tips and notes come from the same keyless engine that Play sample runs,
// so the two always agree. Only the wording below is written for the sample (it speaks about Alex, not about the visitor).
const sampleDetail: Record<string, string> = {
  Python: "The PyTorch image classifier is a Python project that fits this role.",
  "Machine learning": "A scikit-learn project is a good start, but it has no outcome yet.",
  MLOps: "The role asks for deploying and serving models, but the résumé has no matching project.",
  Cloud: "Alex used an AWS GPU instance to train, but did not deploy anything there.",
  SQL: "One PostgreSQL project shows the basics.",
  "Deep learning": "The PyTorch classifier is a direct match for the role.",
};
const run = previewAnalysis([{ id: "sample", name: "Alex sample résumé", text: sampleResume }], sampleJob);

export const sampleAnalysis: Analysis = {
  ...run,
  mode: "sample",
  confidence: "Illustrative example",
  skills: run.skills.map((skill) => ({
    ...skill,
    detail: sampleDetail[skill.name] ?? skill.detail,
    source: skill.resumeQuote ? "Example résumé" : "Example job description",
  })),
  ats: run.ats && { ...run.ats, note: `Illustrative sample, run on the sample résumé. ${run.ats.note}` },
};

import type { RoleSkill } from "./role-scout.ts";
import { arrayOf, baseProperties, int, objectFor, str, systemPrompt, untrusted, RUNNER_REFUSAL, type AgentSpec, type BaseOutput } from "./shared.ts";

export type ExperienceFinderInput = {
  roleTitle: string;
  /** Role Scout's skills. Role-level text only. */
  skills: Pick<RoleSkill, "name" | "demand" | "roleQuote">[];
  scoutNote: string;
};

export type SkillEvidence = {
  skill: string;
  /** 0-100: how much proof the résumé shows. Runner clamps, and sets 0 if the quote is not literal. */
  evidence: number;
  /** Literal text from one search_resume_passages passage. "" when none. */
  resumeQuote: string;
  /** Id of the passage the quote came from. "" when none. */
  passageId: string;
  /** One plain sentence on what the résumé shows or lacks for this skill. */
  detail: string;
};

/** Fixed labels, so the runner and the Planner can use them without free text. */
export const WEAK_PROOF_KINDS = ["no proof found", "only listed", "no result shown"] as const;
export type WeakProofKind = (typeof WEAK_PROOF_KINDS)[number];

export type WeakProof = {
  skill: string;
  kind: WeakProofKind;
  /** One plain sentence on what is thin or missing. */
  why: string;
};

export type ExperienceFinderOutput = BaseOutput & {
  evidence: SkillEvidence[];
  /** Skills whose proof is thin or missing. */
  weakProofs: WeakProof[];
  /** The gap sentence shown as Analysis.but, built from the weak proofs. */
  but: string;
};

const role = `You are the Experience Finder. You look for proof in the candidate's résumé for each skill the role asks for, score how strong each proof is, and flag the proof that is weak. You are on the candidate's side, but you only count what is written down.

What you get: the role title, the Role Scout's list of skills and its note, all inside <data> tags. You do not see the résumé directly. You read it only through search_resume_passages.

What to do:
- For each skill, call search_resume_passages with a few words for that skill. Try one other wording if the first search finds nothing. Do not run more than two searches per skill.
- Pick the single passage that shows the strongest proof: something the candidate built, ran, fixed or wrote beats a skill named in a list. Copy the part of that passage you rely on, word for word, as resumeQuote, and put that passage's id in passageId. Never stitch two passages together.
- Give an evidence score from 0 to 100 for how much proof that passage shows: around 70 or more for a concrete project or job duty using the skill, around 30 to 50 for the skill named without any work behind it, 0 when nothing in the résumé backs it up. If you found nothing, set evidence to 0 and leave resumeQuote and passageId empty.
- Return one entry for every skill in the Role Scout's list, using the same skill names.
- Flag weak proof in weakProofs, one entry per skill that needs it. Use kind "no proof found" when nothing backs the skill, "only listed" when the skill appears only in a skills list with no project or job behind it, and "no result shown" when there is work but no result or number. In why, say in one plain sentence what is thin or missing. Skills with solid proof are not flagged.
- In but, write the one gap that matters most for this role, built from your weak proofs, in a single plain sentence that starts with what the résumé does show, for example "Your résumé shows X, but it does not yet show Y."
- Do not judge the candidate as a person, and never mention age, gender, nationality, health or anything else unrelated to the work.
- In your note, tell the candidate in one or two sentences where their résumé is strongest for this role and where the proof is thinnest.`;

export const experienceFinder: AgentSpec<ExperienceFinderInput, ExperienceFinderOutput> = {
  name: "Experience Finder",
  model: "claude-sonnet-5-5",
  modelEnv: "AGENT_MODEL_EXPERIENCE_FINDER",
  inputs: ["Role title and Role Scout's skills (name, demand, role quote) and note", "Masked résumé chunks, reachable only through search_resume_passages"],
  system: systemPrompt(role),
  tools: ["search_resume_passages"],
  outputSchema: objectFor<ExperienceFinderOutput>({
    ...baseProperties,
    evidence: arrayOf(
      objectFor<SkillEvidence>({
        skill: str("Skill name, exactly as the Role Scout wrote it."),
        evidence: int("0 to 100: how much proof the résumé passage shows."),
        resumeQuote: str("Copied word for word from one passage returned by search_resume_passages. Empty string if none."),
        passageId: str("Id of the passage the quote came from. Empty string if none."),
        detail: str("One plain sentence on what the résumé shows or lacks for this skill."),
      }),
      "One entry per skill from the Role Scout.",
    ),
    weakProofs: arrayOf(
      objectFor<WeakProof>({
        skill: str("Skill name, exactly as the Role Scout wrote it."),
        kind: { type: "string", enum: WEAK_PROOF_KINDS, description: "no proof found, only listed, or no result shown." },
        why: str("What is thin or missing, in one plain sentence."),
      }),
      "Skills whose proof is thin or missing. Empty if every proof is solid.",
    ),
    but: str("The most important gap, in one plain sentence: what the résumé shows, but what it does not yet show."),
  }),
  limits: { maxToolCalls: 16, perTool: { search_resume_passages: 16 }, maxOutputTokens: 6000, maxTurns: 10, timeoutMs: 45_000 },
  refusal: `Refuse when the résumé passages are not a résumé or CV at all. ${RUNNER_REFUSAL}`,
  buildUserMessage: (input) =>
    [
      untrusted("role title", input.roleTitle),
      untrusted("role scout skills", JSON.stringify(input.skills)),
      untrusted("role scout note", input.scoutNote),
      "Find résumé proof for each skill.",
    ].join("\n\n"),
};

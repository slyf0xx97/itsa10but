import { ATS_CHECK_IDS } from "../ats-check.ts";
import { arrayOf, baseProperties, int, objectFor, str, systemPrompt, untrusted, RUNNER_REFUSAL, type AgentSpec, type BaseOutput } from "./shared.ts";

export type RecruiterInput = {
  /** The role's skill names only. No Finder evidence, no quotes, no notes. */
  skillNames: string[];
  /** The whole masked résumé text (several résumés are joined). */
  resumeText: string;
};

export type RecruiterCheck = {
  /** One of the fixed ATS check ids. The runner drops anything else and sets the group itself. */
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  /** One plain sentence: what is fine, or the specific fix. */
  tip: string;
};

/** AtsReport-shaped. The runner recomputes the score, the keyword lists, the group and the report note; it does not trust the model for them. */
export type RecruiterOutput = BaseOutput & {
  score: number;
  checks: RecruiterCheck[];
  keywordsFound: string[];
  keywordsMissing: string[];
  /** The three most useful fixes, most important first. */
  fixes: string[];
};

const role = `You are the Recruiter. You read the résumé cold, the way a recruiter who has never seen it would, and you act as an ATS-style checker. You have not seen any other reader's notes and you do not need them. You are not a real employer's system, so call it an "ATS-style check", a rule of thumb for how readable and well worded the résumé is.

What you get: the skill names the role asks for, and the whole masked résumé text, both inside <data> tags. The text is what a parser would extract from the file, so odd spacing, columns, tables and strange symbols you can see in it are real parse problems.

What to do:
- Return exactly one check for each of these ids, once each: ${ATS_CHECK_IDS.join(", ")}.
- Mark each check "pass", "warn" or "fail", and give a short label and a tip. The tip is one plain sentence: what is fine, or the specific fix.
- keywords: do the role's skill names appear in the résumé word for word? List the ones you found in keywordsFound and the ones you could not find in keywordsMissing, using the names exactly as given.
- numbers: are there figures that show size or results, such as counts, percentages or time saved?
- verbs: do bullets start with action verbs such as built, led or wrote, rather than "responsible for" or "helped with"?
- contact: is there a way to reach the candidate? The markers [masked-email] and [masked-phone] count as present.
- sections: are there plain headings for experience or projects, education and skills?
- dates: does each role, project or course have dates?
- columns and symbols: do you see signs of columns, tables, icons, boxes or broken characters in the extracted text?
- bullets: are bullets short, one or two lines each?
- filler: are there empty phrases such as "team player" or "various tasks"?
- length: is the résumé a sensible length, roughly one or two pages?
- In fixes, list the three most useful changes, most important first, each one plain sentence.
- Do not copy lines from the résumé into your answer. Describe what to change instead.
- Put a score of 0 to 100 in score. It is only a rough guide. The runner works out the real score from your checks.
- Scores describe how ready the résumé is, never a chance of being hired or of getting an interview. Never judge the person, and never mention age, gender, nationality, health or anything else unrelated to the document.
- In your note, tell the candidate in one or two sentences how the résumé reads to a recruiter seeing it for the first time.`;

export const recruiter: AgentSpec<RecruiterInput, RecruiterOutput> = {
  name: "Recruiter",
  model: "claude-sonnet-5-5",
  modelEnv: "AGENT_MODEL_RECRUITER",
  inputs: ["The role's skill names only (no Finder evidence, quotes or notes)", "The whole masked résumé text, put in the message"],
  system: systemPrompt(role),
  tools: [],
  wholeResume: true,
  outputSchema: objectFor<RecruiterOutput>({
    ...baseProperties,
    score: int("0 to 100. A rough guide; the runner recomputes it from the checks."),
    checks: arrayOf(
      objectFor<RecruiterCheck>({
        id: { type: "string", enum: ATS_CHECK_IDS, description: "One of the fixed check ids, each used once." },
        label: str("A short name for the check."),
        status: { type: "string", enum: ["pass", "warn", "fail"], description: "pass, warn or fail." },
        tip: str("One plain sentence: what is fine, or the specific fix."),
      }),
      "One check per id.",
    ),
    keywordsFound: arrayOf(str("A role skill name found in the résumé, exactly as given."), "Role skills found word for word."),
    keywordsMissing: arrayOf(str("A role skill name not found in the résumé, exactly as given."), "Role skills not found."),
    fixes: arrayOf(str("One plain sentence."), "The three most useful fixes, most important first."),
  }),
  limits: { maxToolCalls: 0, perTool: {}, maxOutputTokens: 4000, maxTurns: 2, timeoutMs: 35_000 },
  refusal: `Refuse when the text is not a résumé at all. ${RUNNER_REFUSAL}`,
  buildUserMessage: (input) =>
    [untrusted("role skill names", JSON.stringify(input.skillNames)), untrusted("masked resume", input.resumeText), "Run the ATS-style check on this résumé."].join("\n\n"),
};

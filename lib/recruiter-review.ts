import type { AtsReport, Skill } from "./analysis-types.ts";
import { splitPassages } from "./passages.ts";
import { wantOf } from "./skill-levels.ts";

/**
 * The Recruiter's notes for a native scan: what a recruiter would notice in a quick read, what to fix first and what they would ask.
 * Plain rules over the masked résumé text and the scored skills. It is a rule-of-thumb review, not a real recruiter and not a hiring chance.
 * Every note quotes a real line of the résumé or names a real skill from the role, and there are always at least three things to improve:
 * a strong résumé still gets polish notes, so the Recruiter never ends on "nothing to fix".
 */
export type ReviewItem = { title: string; why: string; quote?: string; example?: string };
export type RecruiterReview = { skim: string[]; strengths: string[]; improvements: ReviewItem[]; questions: string[] };

const ACTION = /\b(?:built|led|designed|developed|created|implemented|launched|automated|analy[sz]ed|reduced|increased|improved|managed|wrote|delivered|configured|deployed|migrated|optimi[sz]ed|investigated|documented|trained|organi[sz]ed|presented|tested|ran|set up)\b/i;
const WEAK = /\b(?:responsible for|helped with|helping with|assisted with|assisting with|worked on|working on|duties included|tasked with|in charge of|involved in)\b/i;
const DIGIT = /\d/;
const STOP = new Set(["the", "and", "for", "with", "you", "will", "our", "your", "job", "role", "team", "work", "from", "that", "this", "are", "all", "any", "new", "junior", "senior", "intern", "internship"]);

const clip = (text: string, max = 110) => (text.length <= max ? text : text.slice(0, max).replace(/\s+\S*$/, "") + "…");
const list = (names: string[]) => names.length <= 1 ? names.join("") : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];

type Input = { resumeText: string; roleTitle: string; skills: Skill[]; ats: AtsReport; bulletFor?: (skill: string) => string | undefined };
type Ranked = ReviewItem & { rank: number };

export function recruiterReview({ resumeText, roleTitle, skills, ats, bulletFor }: Input): RecruiterReview {
  const passages = splitPassages(resumeText).filter((line) => line.split(/\s+/).length >= 4);
  const byDemand = [...skills].sort((a, b) => b.demand - a.demand);
  const missing = byDemand.filter((skill) => skill.evidence === 0);
  const weak = byDemand.filter((skill) => skill.evidence > 0 && skill.evidence < 50 && skill.resumeQuote);
  const strong = byDemand.filter((skill) => skill.evidence >= 70 && skill.resumeQuote);
  const figures = passages.filter((line) => DIGIT.test(line)).length;
  const actionLines = passages.filter((line) => ACTION.test(line));
  const noNumber = actionLines.filter((line) => !DIGIT.test(line) && line.length >= 35);
  const weakLine = passages.find((line) => WEAK.test(line));
  const titleWords = roleTitle.toLowerCase().split(/[^a-z0-9+#.]+/).filter((word) => word.length >= 4 && !STOP.has(word));
  const topLines = passages.slice(0, 3).join(" ").toLowerCase();
  const echoesRole = titleWords.length === 0 || titleWords.some((word) => topLines.includes(word)) || byDemand.slice(0, 2).some((skill) => topLines.includes(skill.name.toLowerCase()));
  const hasLink = /linkedin\.com|github\.com|gitlab\.com|https?:\/\/|portfolio/i.test(resumeText);

  const skim = [
    `Role fit: ${strong.length} of ${skills.length} skills the role asks for have solid proof${missing.length ? `, and ${missing.length} have none` : ""}.`,
    passages[0] ? `First lines: "${clip(passages[0], 70)}" ${echoesRole ? "That echoes the role." : "It doesn't mention the role or its top skills."}` : "The first lines are empty or unreadable.",
    `Numbers: ${figures} of ${passages.length} lines carry a figure${figures < 3 ? ", which is thin. Recruiters look for scale and results." : "."}`,
  ];

  const strengths: string[] = strong.slice(0, 2).map((skill) => `Clear proof of ${skill.name}: "${clip(skill.resumeQuote!.quote, 90)}"`);
  if (figures >= 3) strengths.push(`${figures} lines carry numbers, so results are easy to find.`);
  else if (actionLines.length >= 3) strengths.push(`${actionLines.length} lines start with what you did, which reads as active.`);
  if (!strengths.length) strengths.push("The text is readable, so software and people can both parse it.");

  const ranked: Ranked[] = [];
  for (const skill of missing.slice(0, 2)) {
    ranked.push({
      rank: 100 + skill.demand,
      title: `Show ${skill.name}`,
      why: `The role asks for ${skill.name} (${wantOf(skill.demand).toLowerCase()} priority) and nothing in your résumé mentions it. A recruiter will assume you don't have it.`,
      example: bulletFor?.(skill.name) ?? `Built a small ${skill.name} project that [what it did], reaching [a number].`,
    });
  }
  for (const skill of weak.slice(0, 2)) {
    const line = skill.resumeQuote!.quote;
    ranked.push({
      rank: 80 + skill.demand,
      title: `Strengthen your ${skill.name} line`,
      why: DIGIT.test(line) ? `This line names ${skill.name} but doesn't say what changed because of it.` : `This line names ${skill.name} but gives no size or result. Recruiters skim for outcomes.`,
      quote: clip(line, 130),
      example: `${line.replace(/[.;]\s*$/, "")}, [how many, how fast or how accurate].`,
    });
  }
  if (weakLine) {
    const phrase = WEAK.exec(weakLine)![0];
    ranked.push({
      rank: 75,
      title: `Replace "${phrase}"`,
      why: "That phrase says what the job was. A recruiter wants what you did and what it led to.",
      quote: clip(weakLine, 130),
      example: `Start with a verb such as Built, Led or Wrote, then the result: "Built [what] that [outcome]."`,
    });
  }
  if (noNumber.length) {
    ranked.push({
      rank: 70,
      title: "Put a number on a bullet",
      why: `${noNumber.length === 1 ? "This line shows" : `${noNumber.length} lines show`} the work but not its size, so it's hard to judge how big it was.`,
      quote: clip(noNumber[0], 130),
      example: "Add one figure: how many users, records or hours, or how much faster or more accurate.",
    });
  }
  if (!echoesRole) {
    ranked.push({
      rank: 72,
      title: "Open with a line for this role",
      why: `A recruiter reads the top third first. Yours doesn't mention ${roleTitle ? `"${clip(roleTitle, 50)}"` : "the role"} or its top skills.`,
      example: `${roleTitle ? clip(roleTitle, 50) : "Role"} candidate with [your strongest project] using ${list(byDemand.slice(0, 2).map((skill) => skill.name)) || "[your top tools]"}.`,
    });
  }
  if (!hasLink) {
    ranked.push({ rank: 60, title: "Add a link to your work", why: "There's no GitHub, portfolio or LinkedIn link. A recruiter can't check anything without one.", example: "github.com/yourname or a one-page portfolio, next to your email." });
  }
  for (const check of ats.checks) {
    if (check.status === "pass" || ["keywords", "numbers", "verbs"].includes(check.id)) continue;
    ranked.push({ rank: check.status === "fail" ? 65 : 50, title: check.label, why: check.tip });
  }

  const polish: Ranked[] = [
    { rank: 30, title: "Tailor the top third", why: `The first bullets under each role are read hardest. Make them match what this role asks for most${byDemand.length ? `: ${list(byDemand.slice(0, 3).map((skill) => skill.name))}` : ""}.` },
    ...(strong.length ? [{ rank: 29, title: "Lead with your best proof", why: `Your strongest proof is ${strong[0].name}. Put that project or job first so it's the first thing seen.`, quote: clip(strong[0].resumeQuote!.quote, 130) }] : []),
    { rank: 28, title: "Prepare your top two stories", why: "Pick the two bullets you're proudest of and rehearse them as problem, what you did, result. Interviewers pick a bullet and dig in." },
    { rank: 27, title: "Check the file itself", why: "Export a text-based PDF, name it FirstName_LastName_Role.pdf and keep it to one or two pages." },
  ];

  const improvements = [...ranked].sort((a, b) => b.rank - a.rank).slice(0, 5);
  for (const item of polish) if (improvements.length < 3) improvements.push(item);

  const questions: string[] = [];
  for (const skill of missing.slice(0, 1)) questions.push(`Your résumé doesn't mention ${skill.name}. How would you get up to speed on it in your first month?`);
  for (const skill of weak.slice(0, 1)) questions.push(`Walk me through "${clip(skill.resumeQuote!.quote, 70)}". What was your part, and what was the result?`);
  for (const skill of strong.slice(0, 1)) questions.push(`Tell me about a time ${skill.name} didn't work as planned. What did you change?`);
  for (const fill of ["Which project are you proudest of, and what would you do differently now?", `Why this role${roleTitle ? `, ${clip(roleTitle, 50)}` : ""}?`, "Tell me about a time you had to learn something new fast."]) if (questions.length < 3) questions.push(fill);

  return { skim, strengths: strengths.slice(0, 3), improvements: improvements.map((item) => ({ title: item.title, why: item.why, quote: item.quote, example: item.example })), questions: questions.slice(0, 3) };
}

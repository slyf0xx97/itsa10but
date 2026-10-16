/** Builds the Markdown file a visitor pastes into their own AI. Pure: it only reshapes the finished Analysis plus the visitor's own texts. */
import type { Analysis } from "./analysis-types.ts";
import { ATS_WORD, isSample, modeLabel, overallOf, resumeTextOf, type ReportInput } from "./report-shared.ts";
import { proofOf, wantOf } from "./skill-levels.ts";

/** A fence one backtick longer than the longest run inside the text, so pasted résumé text cannot close it. */
const fence = (text: string, info = "text"): string => {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const bar = "`".repeat(longest + 1);
  return `${bar}${info}\n${text}\n${bar}`;
};
const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

function source(input: ReportInput): string {
  const { analysis } = input;
  if (isSample(input)) return "These findings come from a made-up sample candidate. The résumé and the role below are a made-up sample, not a real person or a real job.";
  if (analysis.mode === "live") {
    const model = analysis.run?.model ? ` using ${analysis.run.model}` : "";
    return `These findings come from API boost, where AI agents read the résumé and the role${model}. Every quote below was checked against my résumé text.`;
  }
  return "These findings come from a native scan. It matched words in the text and was not an AI reading.";
}

function roleScout(analysis: Analysis): string[] {
  const out = ["### Role Scout: what the role asks for", ""];
  if (analysis.skills.length === 0) out.push("No skills were found in the role text.");
  for (const skill of [...analysis.skills].sort((a, b) => b.demand - a.demand)) {
    const line = `- ${skill.name}: the role wants it at ${wantOf(skill.demand)} priority.`;
    out.push(skill.roleQuote?.quote ? `${line} The role says: "${oneLine(skill.roleQuote.quote)}"` : line);
  }
  const company = analysis.company;
  if (company) {
    out.push("", `Employer: ${company.name} (${company.origin === "web" ? "found on the web this run" : "from a checked list"})`);
    if (company.about) out.push(company.about);
    if (company.values.length) out.push("", "Values the employer publishes:", ...company.values.map((v) => `- ${v.name}: ${v.meaning}`));
    if (company.expectations.length) out.push("", "What the employer says it expects:", ...company.expectations.map((e) => `- ${e}`));
    if (company.showIt.length) out.push("", "Ways to show these values:", ...company.showIt.map((e) => `- ${e}`));
  }
  return out;
}

function experienceFinder(analysis: Analysis): string[] {
  const out = ["### Experience Finder: proof in my résumé", ""];
  for (const skill of [...analysis.skills].sort((a, b) => b.demand - a.demand)) {
    const proof = proofOf(skill.evidence);
    const quote = skill.resumeQuote?.quote;
    out.push(quote ? `- ${skill.name}: proof is ${proof}. My résumé says: "${oneLine(quote)}"` : `- ${skill.name}: proof is ${proof}. Nothing in my résumé matched this skill.`);
  }
  const weak = analysis.skills.filter((s) => proofOf(s.evidence) === "Weak" || proofOf(s.evidence) === "None");
  if (weak.length) out.push("", "Weak or missing proof:", ...weak.map((s) => `- ${s.name}${s.detail ? `: ${oneLine(s.detail)}` : ""}`));
  return out;
}

function recruiter(analysis: Analysis): string[] {
  const out = ["### Recruiter: screening read", ""];
  const { ats, review } = analysis;
  if (ats) {
    out.push(`ATS-style readiness score: ${ats.score} out of 100. This is a rule of thumb for how readable the text is to hiring software, not a prediction about any employer.`, "", "Checks:");
    out.push(...ats.checks.map((c) => `- ${c.label}: ${ATS_WORD[c.status]}. ${c.tip}`));
    out.push("", `Keywords from the role found in my résumé: ${ats.keywordsFound.join(", ") || "none"}`);
    out.push(`Keywords from the role missing from my résumé: ${ats.keywordsMissing.join(", ") || "none"}`);
    if (ats.fixes.length) out.push("", "Top fixes:", ...ats.fixes.map((f) => `- ${f}`));
  } else out.push("No ATS-style check was run.");
  if (review) {
    if (review.skim.length) out.push("", "What a recruiter notices in a quick read:", ...review.skim.map((s) => `- ${s}`));
    if (review.strengths.length) out.push("", "Strengths:", ...review.strengths.map((s) => `- ${s}`));
    if (review.improvements.length) {
      out.push("", "Things to improve:");
      for (const item of review.improvements) out.push(`- ${item.title}: ${item.why}${item.quote ? ` Line: "${oneLine(item.quote)}"` : ""}${item.example ? ` Example: ${item.example}` : ""}`);
    }
    if (review.questions.length) out.push("", "Questions a recruiter might ask:", ...review.questions.map((q) => `- ${q}`));
  }
  return out;
}

function actionPlanner(analysis: Analysis): string[] {
  const out = ["### Action Planner: tips to close the gaps", ""];
  if (analysis.quests.length === 0) out.push("No tips were produced.");
  analysis.quests.forEach((quest, i) => {
    out.push(`${i + 1}. ${quest.title} (skill: ${quest.skill})`, `   Task: ${quest.task}`, `   Proof to show: ${quest.proof}`);
    quest.steps?.forEach((step, n) => out.push(`   Step ${n + 1}: ${step}`));
    if (quest.bullet) out.push(`   Résumé line to adapt: ${quest.bullet}`);
    quest.links?.forEach((link) => out.push(`   Free resource: ${link.title} (${link.kind}) ${link.url}`));
  });
  return out;
}

export function buildPromptMarkdown(input: ReportInput): string {
  const { analysis, job } = input;
  const sample = isSample(input);
  const lines = [
    "# Prompt: improve my résumé for this role",
    "",
    `Source of the findings: ${modeLabel(input)}. ${source(input)}`,
    `Overall figure: ${overallOf(analysis)} out of 10. Scores describe how much proof my text contains. They are not hiring chances.`,
    "",
    "You are an experienced résumé coach. Below are my résumé, the role I want, and what four readers found when they compared the two. Use the findings to help me rewrite my résumé so it proves what the role asks for, honestly.",
    "",
    "## Rules",
    "",
    "- Use only facts that are in my résumé. Never invent employers, dates, numbers, tools or results.",
    "- If a number is missing, leave a placeholder such as [add number] and ask me for it.",
    "- Keep my wording where it is already good.",
    "- Keep the result plain text friendly for hiring software. No tables, no columns, no images in the rewrite.",
    "- Do not claim I will be hired. Talk about proof in the text only.",
    "",
    "## The role",
    "",
    `Role title: ${analysis.title}`,
    "",
    fence(job.trim()),
    "",
    "## My résumé",
    "",
    ...(sample ? ["This résumé is a made-up sample.", ""] : []),
    fence(resumeTextOf(input.resumes)),
    "",
    "## What the four readers found",
    "",
    ...roleScout(analysis), "",
    ...experienceFinder(analysis), "",
    ...recruiter(analysis), "",
    ...actionPlanner(analysis), "",
    "## What I want you to do",
    "",
    "1. Rewrite my bullets to prove the top gaps honestly, using only my facts.",
    "2. List the keywords from the role that I can truthfully add, and say where each one fits.",
    "3. Fix the format problems the Recruiter found.",
    "4. Suggest one small real project for each remaining gap, and a bullet I could write once I finish it. Mark each of these clearly as a future bullet, not something I have done.",
    "5. Give the final résumé text, then a short list of every change and why you made it.",
    "",
    "## Output format",
    "",
    "- Section 1: the rewritten bullets, grouped by the résumé section they belong to.",
    "- Section 2: the keyword list, one line each: keyword, where to add it.",
    "- Section 3: the format fixes, as a short list.",
    "- Section 4: the project ideas, each with a future bullet marked [future].",
    "- Section 5: the full final résumé as plain text, then the list of changes with a reason for each.",
    "- Ask me about anything missing before you guess.",
    "",
  ];
  return lines.join("\n");
}

import type { AtsCheck, AtsReport, AtsStatus } from "./analysis-types.ts";

/**
 * An ATS-style check of résumé text: plain, deterministic rules of thumb about
 * how readable and well worded a résumé is. It is not any employer's real
 * system, and its score is readiness, never a hiring chance. It runs on the
 * masked text (the safety pass leaves tokens such as [masked-email]) and also
 * accepts raw text, so the keyless API routes can use it too.
 */

/** Stable ids, in the order fixes are ranked: the first non-passing check is the first fix. */
export const ATS_CHECKS = [
  { id: "keywords", group: "keywords", label: "Role keywords" },
  { id: "numbers", group: "wording", label: "Numbers and results" },
  { id: "verbs", group: "wording", label: "Action verbs" },
  { id: "contact", group: "parse", label: "Contact details" },
  { id: "sections", group: "format", label: "Standard section headings" },
  { id: "dates", group: "format", label: "Dates" },
  { id: "columns", group: "parse", label: "Single-column layout" },
  { id: "symbols", group: "parse", label: "Plain characters" },
  { id: "bullets", group: "format", label: "Short bullets" },
  { id: "filler", group: "wording", label: "Filler phrases" },
  { id: "length", group: "format", label: "Length" },
] as const satisfies readonly Pick<AtsCheck, "id" | "group" | "label">[];

export type AtsCheckId = (typeof ATS_CHECKS)[number]["id"];
export const ATS_CHECK_IDS: readonly string[] = ATS_CHECKS.map((item) => item.id);
export const ATS_STATUSES: readonly AtsStatus[] = ["pass", "warn", "fail"];
export const atsCheckInfo = (id: string) => ATS_CHECKS.find((item) => item.id === id);

const POINTS: Record<AtsStatus, number> = { pass: 1, warn: 0.5, fail: 0 };

/** Each check scores pass 1, warn 0.5, fail 0; the score is the average as a whole number from 0 to 100. */
export const atsScore = (checks: Pick<AtsCheck, "status">[]) =>
  checks.length ? Math.round((100 * checks.reduce((sum, item) => sum + (POINTS[item.status] ?? 0), 0)) / checks.length) : 0;

export const atsNote = (count: number) =>
  `Screening check: ${count} rule-of-thumb checks. A passed check scores 1, a to-check scores 0.5 and a to-fix scores 0. The average becomes the score out of 100. It shows how readable and well worded the résumé is. It's not a real employer's system, and it doesn't predict hiring.`;

/** The top fixes: failing checks first, then warnings, each in the fixed priority order above. */
export function topFixes(checks: Pick<AtsCheck, "id" | "status" | "tip">[], limit = 3): string[] {
  const rank = (item: Pick<AtsCheck, "id">) => ATS_CHECK_IDS.indexOf(item.id);
  return checks
    .filter((item) => item.status !== "pass" && item.tip)
    .sort((a, b) => Number(b.status === "fail") - Number(a.status === "fail") || rank(a) - rank(b))
    .slice(0, limit)
    .map((item) => item.tip);
}

const escape = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasWord = (text: string, term: string) => new RegExp(`(?:^|[^a-z0-9])${escape(term)}(?=$|[^a-z0-9])`, "i").test(text);

/** Which role skills appear in the text word for word, as an ATS keyword match would find them. At most ten of each. */
export function keywordCoverage(text: string, skillNames: string[]): { found: string[]; missing: string[] } {
  const names = [...new Set(skillNames.map((name) => name.trim()).filter(Boolean))];
  const found = names.filter((name) => hasWord(text, name));
  return { found: found.slice(0, 10), missing: names.filter((name) => !found.includes(name)).slice(0, 10) };
}

const STRONG_VERBS = /\b(?:built|led|designed|developed|created|implemented|launched|automated|analy[sz]ed|reduced|increased|improved|managed|wrote|delivered|configured|deployed|migrated|optimi[sz]ed|investigated|documented|trained|organi[sz]ed|coordinated|presented|tested|maintained|founded|resolved|streamlined|mentored|researched|monitored|identified|established|negotiated|produced|supported|taught|ran|achieved|won|raised|grew|saved|cut|shipped|published|debugged|scripted)\b/gi;
const WEAK_PHRASES = /\b(?:responsible for|helped with|helping with|assisted with|assisting with|worked on|working on|duties included|tasked with|in charge of|involved in)\b/gi;
const FILLER = /\b(?:team player|hard[- ]?working|detail[- ]oriented|self[- ]motivated|results[- ]driven|go[- ]getter|fast learner|passionate|synergy|think outside the box|references available|various|etc)\b/gi;
const YEAR = /\b(?:19[89]\d|20\d{2})\b/g;
const SYMBOLS = /[\uFFFD\uE000-\uF8FF\u2500-\u259F\u2600-\u27BF]|\p{Extended_Pictographic}/gu;

const count = (text: string, pattern: RegExp) => text.match(pattern)?.length ?? 0;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

type Result = { status: AtsStatus; tip: string };
const result = (status: AtsStatus, pass: string, fix: string): Result => ({ status, tip: status === "pass" ? pass : fix });

/** Runs every check. `roleSkillNames` are the skills the role asks for; pass [] when the role named none. */
export function atsCheck(resumeText: string, roleSkillNames: string[]): AtsReport {
  const text = resumeText.replace(/\r\n?/g, "\n");
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const wordCount = words(text);
  const results = {} as Record<AtsCheckId, Result>;

  const { found, missing } = keywordCoverage(text, roleSkillNames);
  const total = found.length + missing.length;
  const ratio = total ? found.length / total : 0;
  results.keywords = !total
    ? { status: "warn", tip: "The role text names no skills to compare, so keywords couldn't be checked." }
    : result(ratio >= 0.7 ? "pass" : ratio >= 0.4 ? "warn" : "fail", `${found.length} of ${total} role skills appear in your résumé word for word.`, `Only ${found.length} of ${total} role skills appear in your résumé word for word. Use the role's own wording for the skills you have.`);

  // Years and ranges such as 2021-2023 can be swallowed by the phone-number mask, so extra phone tokens count as date ranges.
  const numbers = count(text.replace(/\[masked-[a-z]+\]/g, " ").replace(YEAR, " "), /\b\d+(?:[.,]\d+)?\b/g);
  results.numbers = result(numbers >= 3 ? "pass" : numbers >= 1 ? "warn" : "fail", `Found ${plural(numbers, "number")} that can show size or results.`, numbers ? `Only ${plural(numbers, "number")} in the whole résumé. Add a figure to more bullets, such as how many, how often or how much.` : "No numbers in the résumé. Add figures to your bullets, such as how many, how often or how much.");

  const strong = count(text, STRONG_VERBS);
  const weak = count(text, WEAK_PHRASES);
  results.verbs = result(strong >= 3 && weak <= 1 ? "pass" : strong === 0 || weak >= 3 ? "fail" : "warn", `Found ${plural(strong, "action verb")} such as built or led.`, weak ? `Start bullets with what you did, such as built, led or wrote, instead of phrases like "responsible for" (found ${weak}).` : "Few bullets start with an action verb. Start each with what you did, such as built, led or wrote.");

  const email = /\[masked-email\]|[\w.+-]+@[\w-]+\.[\w.-]+/i.test(text);
  const phone = /\[masked-phone\]|\+\d[\d\s-]{6,}|\b\d{3,4}[\s-]\d{3,4}\b/.test(text);
  const link = /linkedin\.com|github\.com|https?:\/\//i.test(text);
  const contact = Number(email) + Number(phone) + Number(link);
  results.contact = result(email && phone ? "pass" : email || phone || link ? "warn" : "fail", "An email and a phone number are present.", !contact ? "No email, phone or profile link found. Put your contact details at the top of the page as plain text." : `Add the missing contact detail${email ? "" : ": an email address"}${phone ? "" : email ? ": a phone number" : " and a phone number"}, as plain text near the top.`);

  const heading = (pattern: string) => new RegExp(`^(?:#+\\s*)?(?:${pattern})(?=\\s*(?::|$|[&/|]))`, "i");
  const sections = [
    { name: "Experience or Projects", re: heading("(?:work |professional |relevant )?experience|employment(?: history)?|work history|internships?|projects?|volunteer(?:ing)?") },
    { name: "Education", re: heading("education|academic background|qualifications?|certifications?") },
    { name: "Skills", re: heading("(?:technical |key |core )?skills|competenc(?:y|ies)|technologies") },
  ];
  const lacking = sections.filter((section) => !lines.some((line) => section.re.test(line))).map((section) => section.name);
  results.sections = result(!lacking.length ? "pass" : lacking.length === 1 ? "warn" : "fail", "Experience or Projects, Education and Skills headings are all present.", `Add a clear heading for: ${lacking.join(", ")}. Plain names such as "Education" are the easiest for software to find.`);

  const years = count(text, YEAR) + Math.max(0, count(text, /\[masked-phone\]/g) - 1) * 2;
  results.dates = result(years >= 2 ? "pass" : years === 1 ? "warn" : "fail", "Dates are present.", years ? "Only one date found. Give every role, project and course a start and end date, such as Jan 2024 to Mar 2025." : "No dates found. Give every role, project and course a start and end date, such as Jan 2024 to Mar 2025.");

  const wide = lines.filter((line) => /\S {3,}\S|\t/.test(line) || (line.match(/\|/g)?.length ?? 0) >= 3).length;
  results.columns = result(wide >= 3 && wide / lines.length > 0.25 ? "fail" : wide >= 2 ? "warn" : "pass", "The text reads in one straight column.", `${plural(wide, "line")} look like columns or a table (large gaps or many bars). Software can read them out of order, so use one column of plain lines.`);

  const odd = count(text, SYMBOLS);
  results.symbols = result(odd >= 5 ? "fail" : odd >= 1 ? "warn" : "pass", "No odd symbols or broken characters.", `${plural(odd, "odd symbol")} found, such as icons, boxes or broken characters. Swap them for plain bullets and words.`);

  const content = lines.filter((line) => words(line) >= 4);
  const long = content.filter((line) => words(line) > 30).length;
  const longShare = content.length ? long / content.length : 0;
  results.bullets = !content.length
    ? { status: "warn", tip: "No full lines to read. Write each bullet as one short line." }
    : result(longShare > 0.5 ? "fail" : longShare > 0.2 ? "warn" : "pass", "Bullets are short enough to scan.", `${plural(long, "line")} run past 30 words. Keep each bullet to one or two lines.`);

  const filler = count(text, FILLER);
  results.filler = result(filler >= 3 ? "fail" : filler >= 1 ? "warn" : "pass", "No filler phrases found.", `Found ${plural(filler, "filler word")} such as "team player" or "various". Replace each with a specific fact.`);

  results.length = result(wordCount < 60 ? "fail" : wordCount < 150 ? "warn" : wordCount <= 1100 ? "pass" : wordCount <= 1500 ? "warn" : "fail", `About ${wordCount} words, a sensible length.`, wordCount < 150 ? `Only ${plural(wordCount, "word")}. Add the projects, tools and results that back your skills.` : `About ${wordCount} words. Cut it to one or two pages by dropping the oldest or least relevant items.`);

  const checks: AtsCheck[] = ATS_CHECKS.map((item) => ({ id: item.id, group: item.group, label: item.label, ...results[item.id] }));
  return { score: atsScore(checks), checks, keywordsFound: found, keywordsMissing: missing, fixes: topFixes(checks), note: atsNote(checks.length) };
}

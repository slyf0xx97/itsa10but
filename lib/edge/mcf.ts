import { matchRole, type DemandJob, type Pay } from "./demand.ts";

/**
 * MyCareersFuture is Singapore's government job portal. Its public search returns up to 100 postings with the skills each employer tagged
 * and the advertised pay, but no description text. So skills are counted from the tags and the title, with the same catalog matcher as
 * everywhere else, and the numbers say "tagged", never "required". Pure parsing: the Worker and scripts/build-role-demand.ts do the fetching.
 */
export const MCF_URL = "https://api.mycareersfuture.gov.sg/v2/search?limit=100&page=0";
export const mcfBody = (role: string) => JSON.stringify({ search: role, limit: 100, page: 0 });

type Raw = { title?: unknown; skills?: unknown; salary?: { minimum?: unknown; maximum?: unknown; type?: { salaryType?: unknown } } };

const percentile = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))];
const hundred = (value: number) => Math.round(value / 100) * 100;

/** Percentiles of the monthly mid-points. Under 5 postings with a monthly range gives undefined: too few to call a range. */
export function summarisePay(mids: number[]): Pay | undefined {
  const sorted = mids.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  return sorted.length >= 5 ? { low: hundred(percentile(sorted, 0.25)), mid: hundred(percentile(sorted, 0.5)), high: hundred(percentile(sorted, 0.75)), n: sorted.length } : undefined;
}

/** Postings whose title names the role (every word, as matchRole reads it), as their tagged skills, and the pay summary of those same postings. */
export function jobsFromMcf(json: unknown, role: string): { jobs: DemandJob[]; pay: Pay | undefined } {
  const results = (json as { results?: unknown } | null)?.results;
  const jobs: DemandJob[] = [];
  const mids: number[] = [];
  for (const item of Array.isArray(results) ? (results as Raw[]) : []) {
    const title = typeof item?.title === "string" ? item.title.replace(/\s+/g, " ").trim().slice(0, 120) : "";
    if (!title || matchRole(title, [role]) === null) continue;
    const tags = (Array.isArray(item.skills) ? item.skills : []).flatMap((skill) => (typeof (skill as { skill?: unknown })?.skill === "string" ? [(skill as { skill: string }).skill.trim().slice(0, 60)] : [])).slice(0, 40);
    // The title is only used to pick the postings. Counting it would make the role's own skill show up in every posting.
    jobs.push({ title: "", text: tags.join("; ") });
    const { minimum, maximum, type } = item.salary ?? {};
    if (type?.salaryType === "Monthly" && Number(minimum) > 0 && Number(maximum) >= Number(minimum)) mids.push((Number(minimum) + Number(maximum)) / 2);
  }
  return { jobs, pay: summarisePay(mids) };
}

import { plainJobText, safeJobUrl, jobHtml, type JobListing } from "./job-types.ts";
type RawJob = Record<string, unknown>;
type Job = {
  id: string;
  source: JobListing["source"];
  workplace?: JobListing["workplace"];
  companyDomain?: string;
  title: string;
  company: string;
  region: string;
  type: string;
  summary: string;
  description: string;
  url: string;
  publishedAt: string | null;
  logoUrl: string;
};

const string = (value: unknown) => typeof value === "string" ? value.trim() : "";
const employerDomain = (value: unknown) => { try { return new URL(safeUrl(value)).hostname; } catch { return ""; } };
const safeUrl = safeJobUrl;
const plainText = plainJobText;
const isoDate = (value: unknown) => {
  const date = new Date(typeof value === "number" ? value < 100_000_000_000 ? value * 1000 : value : string(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

async function himalayas(query: string, level: string, scope: string): Promise<Job[]> {
  const url = new URL("https://himalayas.app/jobs/api/search");
  url.searchParams.set("q", query);
  if (scope === "singapore") url.searchParams.set("country", "SG");
  if (level === "entry") url.searchParams.set("seniority", "Entry-level");
  url.searchParams.set("sort", "recent");
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Himalayas returned ${response.status}`);
  const data = await response.json() as { jobs?: RawJob[] };
  return (data.jobs ?? []).slice(0, 10).map((item) => ({
    id: `himalayas:${string(item.guid) || safeUrl(item.applicationLink)}`,
    source: "Himalayas" as const,
    title: string(item.title),
    company: string(item.companyName),
    companyDomain: employerDomain(item.companyWebsite),
    region: Array.isArray(item.locationRestrictions) && item.locationRestrictions.length
      ? item.locationRestrictions.map((place) => typeof place === "object" && place !== null ? string((place as RawJob).name) : string(place)).filter(Boolean).join(", ")
      : "Worldwide, check timezone",
    type: string(item.employmentType),
    summary: plainText(item.excerpt).slice(0, 240),
    description: plainText(item.description),
    url: safeUrl(item.guid) || safeUrl(item.applicationLink),
    publishedAt: isoDate(item.pubDate),
    logoUrl: safeUrl(item.companyLogo),
  })).filter((item) => item.title && item.url);
}

async function jobicy(query: string, scope: string): Promise<Job[]> {
  const url = new URL("https://jobicy.com/api/v2/remote-jobs");
  url.searchParams.set("count", "10");
  url.searchParams.set("tag", query.slice(0, 50));
  if (scope === "singapore") url.searchParams.set("geo", "singapore");
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Jobicy returned ${response.status}`);
  const data = await response.json() as { jobs?: RawJob[]; success?: boolean };
  if (data.success === false) throw new Error("Jobicy couldn't complete this search");
  return (data.jobs ?? []).slice(0, 10).map((item) => ({
    id: `jobicy:${String(item.id ?? "")}`,
    source: "Jobicy" as const,
    title: string(item.jobTitle),
    company: string(item.companyName),
    companyDomain: employerDomain(item.companyWebsite),
    region: string(item.jobGeo) || "Check location eligibility",
    type: Array.isArray(item.jobType) ? item.jobType.map(string).filter(Boolean).join(", ") : "",
    summary: plainText(item.jobExcerpt).slice(0, 240),
    description: plainText(item.jobDescription),
    url: safeUrl(item.url),
    publishedAt: isoDate(item.pubDate),
    logoUrl: safeUrl(item.companyLogo),
  })).filter((item) => item.title && item.url);
}


async function arbeitnow(): Promise<Job[]> {
  const response = await fetch("https://www.arbeitnow.com/api/job-board-api", { headers: { Accept: "application/json" }, next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Arbeitnow returned ${response.status}`);
  const data = await response.json() as { data?: RawJob[] };
  return (data.data ?? []).map(item => ({
    id: `arbeitnow:${string(item.slug)}`, source: "Arbeitnow" as const,
    title: string(item.title), company: string(item.company_name), companyDomain: employerDomain(item.company_website), region: string(item.location) || "Check location eligibility",
    workplace: item.remote === true ? "remote" as const : "on-site" as const,
    type: Array.isArray(item.job_types) ? item.job_types.map(string).join(", ").toLowerCase() : "",
    summary: plainText(item.description).slice(0, 240), description: plainText(item.description), url: safeUrl(item.url),
    publishedAt: isoDate(item.created_at), logoUrl: "",
  })).filter(item => item.title && item.url);
}

async function remotive(): Promise<Job[]> {
  // One shared cached URL across search terms: Remotive asks for at most four fetches/day.
  const response = await fetch("https://remotive.com/api/remote-jobs", { headers: { Accept: "application/json" }, next: { revalidate: 21600 }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Remotive returned ${response.status}`);
  const data = await response.json() as { jobs?: RawJob[] };
  return (data.jobs ?? []).map(item => ({
    id: `remotive:${String(item.id ?? "")}`, source: "Remotive" as const,
    title: string(item.title), company: string(item.company_name), companyDomain: employerDomain(item.company_website), region: string(item.candidate_required_location) || "Check location eligibility",
    workplace: "remote" as const, type: string(item.job_type).replaceAll("_", "-"),
    summary: plainText(item.description).slice(0, 240), description: plainText(item.description),
    url: safeUrl(item.url), publishedAt: isoDate(item.publication_date), logoUrl: safeUrl(item.company_logo),
  })).filter(item => item.title && item.url);
}

function normalize(job: Job): JobListing {
  const description = plainText(job.description);
  return { ...job, companyDomain: job.companyDomain ?? "", location: job.region,
    workplace: job.workplace ?? "remote", type: job.type.toLowerCase().replace(/[_ ]+/g, "-"),
    postedAt: job.publishedAt, applyUrl: job.url, description, descriptionHtml: jobHtml(description),
    logoUrl: job.logoUrl || (job.companyDomain ? `https://${job.companyDomain}/favicon.ico` : ""),
  };
}

export const jobAdapters = [
  { source: "Himalayas", load: (q: string, level: string, scope: string) => himalayas(q, level, scope) },
  { source: "Jobicy", load: (q: string, _level: string, scope: string) => jobicy(q, scope) },
  { source: "Arbeitnow", load: arbeitnow },
  { source: "Remotive", load: remotive },
] as const;

export async function searchJobSources(query: string, level: string, scope: string) {
  const results = await Promise.allSettled(jobAdapters.map(adapter => adapter.load(query, level, scope)));
  return {
    jobs: results.flatMap(result => result.status === "fulfilled" ? result.value.map(normalize) : []),
    sources: results.map((result, index) => ({ source: jobAdapters[index].source, available: result.status === "fulfilled", count: result.status === "fulfilled" ? result.value.length : 0 })),
  };
}

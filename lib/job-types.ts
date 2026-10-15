export type JobSource = "Himalayas" | "Jobicy" | "Arbeitnow" | "Remotive" | "The Muse" | "LinkedIn paste";
export type JobListing = {
  id: string; title: string; company: string; companyDomain: string; logoUrl: string;
  location: string; workplace: "on-site" | "hybrid" | "remote" | "unknown";
  type: string; postedAt: string | null; applyUrl: string; source: JobSource;
  /** Escaped plain text, never untrusted upstream HTML. */
  descriptionHtml: string;
  // Compatibility aliases for the current search UI.
  region: string; summary: string; description: string; url: string; publishedAt: string | null;
};

export function safeJobUrl(value: unknown): string {
  try { const url = new URL(typeof value === "string" ? value : ""); return url.protocol === "https:" && !url.username && !url.password ? url.toString() : ""; } catch { return ""; }
}
export function plainJobText(value: unknown): string {
  return (typeof value === "string" ? value : "").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/?(?:p|div|li|h[1-6]|br)\b[^>]*>/gi, "\n").replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim().slice(0, 15000);
}
export const jobHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />");

export function filterJobs(jobs: JobListing[], filters: { query: string; scope: string; level: string; location?: string; workplace?: string; type?: string; days?: number }, now = Date.now()) {
  const terms = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
  const seen = new Set<string>();
  return jobs.filter(job => {
    const searchable = `${job.title} ${job.company} ${job.description}`.toLowerCase();
    if (!terms.every(term => searchable.includes(term))) return false;
    if (filters.scope === "singapore" && !/singapore|worldwide|anywhere|global/i.test(job.location)) return false;
    if (filters.location && !job.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.level === "entry" && !/junior|entry|intern|graduate|associate|trainee|apprentice/i.test(`${job.title} ${job.type}`)) return false;
    if (filters.workplace && job.workplace !== filters.workplace) return false;
    if (filters.type && !job.type.includes(filters.type)) return false;
    if (filters.days && (!job.postedAt || Date.parse(job.postedAt) < now - filters.days * 86400000 || Date.parse(job.postedAt) > now)) return false;
    const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}`;
    if (seen.has(key)) return false; seen.add(key); return true;
  }).sort((a,b) => Number(/singapore/i.test(b.location)) - Number(/singapore/i.test(a.location)) || (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));
}

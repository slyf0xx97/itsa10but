import { catalog, scrub, termRegex, type SkillSeed } from "../catalog.ts";

/** Pure counting for the market-demand table. The Worker cron and scripts/build-role-demand.ts both use it, so the two always agree. */
export const DEMAND_ROLES = [
  "Data analyst", "Data scientist", "Data engineer", "Machine learning engineer", "Software engineer", "Frontend developer", "Backend developer",
  "Cloud engineer", "DevOps engineer", "QA engineer", "Cybersecurity analyst", "SOC analyst", "Business analyst", "Product manager", "UX designer",
] as const;

export type DemandJob = { title: string; text: string };
/** Advertised monthly pay in Singapore dollars: the 25th, 50th and 75th percentile of the postings' mid-points, from `n` postings that state a monthly range. */
export type Pay = { low: number; mid: number; high: number; n: number };
export type RoleDemand = { role: string; sample: number; updated: string; skills: { name: string; share: number }[]; pay?: Pay };
/** `roles` counts skills in the text of remote postings (Himalayas, Jobicy). `sg` counts the employer-tagged skills on Singapore postings (MyCareersFuture). */
export type DemandTable = { roles: Record<string, RoleDemand>; sg: Record<string, RoleDemand> };


/** One role per hour, in turn, so each cron run does a small amount of work. */
export const roleToRefresh = (now: number): string => DEMAND_ROLES[Math.floor(now / 3_600_000) % DEMAND_ROLES.length];

/** Share (whole percent) of the postings that name each catalog skill. Same whole-word rule as hasTerm. Skills named in no posting are left out. */
export function countDemand(role: string, jobs: DemandJob[], updated: string, skills: SkillSeed[] = catalog, pay?: Pay): RoleDemand {
  // The same matcher as the scan (word forms, and phrases like "the rest of" blanked out), one scrub per posting.
  const texts = jobs.map((job) => scrub(`${job.title}\n${job.text}`));
  const counted = skills
    .map(({ name, terms }) => ({ name, share: texts.length ? Math.round((100 * texts.filter((text) => terms.some((term) => termRegex(term).test(text))).length) / texts.length) : 0 }))
    .filter((row) => row.share > 0)
    .sort((a, b) => b.share - a.share);
  return { role, sample: jobs.length, updated, skills: counted, ...(pay ? { pay } : {}) };
}

/** The tracked role that the role text is about: every word of the role must appear near the top of the text. The longest match wins, and no match gives null. */
export function matchRole(roleText: string, roles: readonly string[] = DEMAND_ROLES): string | null {
  const head = ` ${roleText.slice(0, 160).toLowerCase().replace(/[^a-z0-9+#]+/g, " ")} `;
  const fits = roles.filter((role) => role.toLowerCase().split(" ").every((word) => head.includes(` ${word} `) || head.includes(` ${word}s `)));
  return fits.sort((a, b) => b.length - a.length)[0] ?? null;
}

/** Keeps a browser or API reply to what the table promises: known roles, whole percents, short lists. */
export function cleanTable(raw: unknown): DemandTable {
  const table = raw as { roles?: Record<string, unknown>; sg?: Record<string, unknown> } | null;
  return { roles: cleanRows(table?.roles), sg: cleanRows(table?.sg) };
}

const money = (value: unknown) => { const n = Math.round(Number(value) / 100) * 100; return Number.isFinite(n) && n > 0 && n < 1_000_000 ? n : 0; };

function cleanRows(source: Record<string, unknown> | undefined): Record<string, RoleDemand> {
  const rows: Record<string, RoleDemand> = {};
  for (const role of DEMAND_ROLES) {
    const row = source?.[role] as Partial<RoleDemand> | undefined;
    if (!row || !Array.isArray(row.skills)) continue;
    const skills = row.skills.flatMap((item) => (typeof item?.name === "string" && Number.isFinite(item.share) ? [{ name: item.name.slice(0, 40), share: Math.max(0, Math.min(100, Math.round(item.share))) }] : [])).slice(0, 30);
    const [low, mid, high] = [money(row.pay?.low), money(row.pay?.mid), money(row.pay?.high)];
    const n = Math.max(0, Math.trunc(Number(row.pay?.n)) || 0);
    rows[role] = { role, sample: Math.max(0, Math.trunc(Number(row.sample)) || 0), updated: typeof row.updated === "string" ? row.updated.slice(0, 10) : "", skills, ...(low && mid && high && low <= mid && mid <= high && n > 0 ? { pay: { low, mid, high, n } } : {}) };
  }
  return rows;
}

const plain = (html: unknown, max: number) => String(html ?? "").slice(0, max * 2).replace(/<[^>]*>/g, " ").replace(/&[#\w]+;/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const clip = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** The two free feeds' search URLs for a role. */
export const feedUrls = (role: string) => {
  const q = encodeURIComponent(role);
  return { himalayas: `https://himalayas.app/jobs/api/search?q=${q}&sort=recent`, jobicy: `https://jobicy.com/api/v2/remote-jobs?count=10&tag=${q}` };
};

/** Postings from the two feeds' JSON. At most 12 per feed and 3,000 characters each, to stay inside the Worker's small CPU budget. */
export function postingsFromFeeds(himalayas: unknown, jobicy: unknown): DemandJob[] {
  const rows = (data: unknown): Record<string, unknown>[] => ((data as { jobs?: unknown } | null)?.jobs instanceof Array ? (data as { jobs: Record<string, unknown>[] }).jobs : []).slice(0, 12);
  return [
    ...rows(himalayas).map((job) => ({ title: clip(job?.title, 120), text: plain(job?.description, 3000) })),
    ...rows(jobicy).map((job) => ({ title: clip(job?.jobTitle, 120), text: plain(job?.jobDescription, 3000) })),
  ].filter((job) => job.title && job.text);
}

/** Fewer postings than this is too small a sample to publish. */
export const MIN_SAMPLE = 5;

/** For each role keeps the row with the later date; on a tie the first table wins, and a row under the minimum sample never wins over one that meets it. */
export function mergeTables(first: DemandTable, second: DemandTable): DemandTable {
  const merge = (a: Record<string, RoleDemand>, b: Record<string, RoleDemand>) => {
    const rows: Record<string, RoleDemand> = {};
    for (const role of DEMAND_ROLES) {
      const both = [a[role], b[role]].filter((row): row is RoleDemand => Boolean(row));
      const usable = both.filter((row) => row.sample >= MIN_SAMPLE);
      const best = (usable.length ? usable : both).reduce<RoleDemand | undefined>((top, row) => (!top || row.updated > top.updated ? row : top), undefined);
      if (best) rows[role] = best;
    }
    return rows;
  };
  return { roles: merge(first.roles, second.roles), sg: merge(first.sg, second.sg) };
}

/**
 * Builds lib/role-demand.json: for each tracked role, the share of recent public postings (Himalayas and Jobicy free feeds) that name each catalog skill.
 * Runs on this machine, costs nothing and needs no key. The live Worker keeps the same table fresher; this file is the offline fallback.
 *   npm run demand
 */
import { writeFileSync } from "node:fs";
import { DEMAND_ROLES, countDemand, feedUrls, postingsFromFeeds, type RoleDemand } from "../lib/edge/demand.ts";
import { MCF_URL, jobsFromMcf, mcfBody } from "../lib/edge/mcf.ts";
import { catalog } from "../lib/catalog.ts";

const get = async (url: string): Promise<unknown> => {
  try {
    const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "Itsa10but-demand/1.0 (+https://ghernie.com/projects/itsa10but)" }, signal: AbortSignal.timeout(15000) });
    return response.ok ? await response.json() : null;
  } catch { return null; }
};

const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10); // Singapore date
const roles: Record<string, RoleDemand> = {};
const sg: Record<string, RoleDemand> = {};
const getSg = async (role: string) => {
  try {
    const response = await fetch(MCF_URL, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "Itsa10but-demand/1.0 (+https://ghernie.com/projects/itsa10but)" }, body: mcfBody(role), signal: AbortSignal.timeout(20000) });
    return jobsFromMcf(response.ok ? await response.json() : null, role);
  } catch { return { jobs: [], pay: undefined }; }
};
for (const role of DEMAND_ROLES) {
  const urls = feedUrls(role);
  const jobs = postingsFromFeeds(await get(urls.himalayas), await get(urls.jobicy));
  roles[role] = countDemand(role, jobs, today);
  const mcf = await getSg(role);
  if (mcf.jobs.length) sg[role] = countDemand(role, mcf.jobs, today, catalog, mcf.pay);
  console.log(`  Singapore: ${mcf.jobs.length} postings${mcf.pay ? `, pay S$${mcf.pay.low}-${mcf.pay.high} (median ${mcf.pay.mid}, n=${mcf.pay.n})` : ""}`);
  console.log(`${role}: ${jobs.length} postings, top ${roles[role].skills.slice(0, 3).map((row) => `${row.name} ${row.share}%`).join(", ") || "none"}`);
  await new Promise((resolve) => setTimeout(resolve, 1500)); // be gentle with free feeds
}
writeFileSync(new URL("../lib/role-demand.json", import.meta.url), JSON.stringify({ roles, sg }, null, 1) + "\n");
console.log("Wrote lib/role-demand.json");

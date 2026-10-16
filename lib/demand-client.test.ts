import assert from "node:assert/strict";
import { test } from "node:test";
import { demandLine, loadDemand, payLine } from "./demand-client.ts";
import type { DemandTable } from "./edge/demand.ts";

const table: DemandTable = { sg: {}, roles: {
  "Data analyst": { role: "Data analyst", sample: 22, updated: "2026-10-16", skills: [{ name: "SQL", share: 64 }] },
  "SOC analyst": { role: "SOC analyst", sample: 3, updated: "2026-10-16", skills: [{ name: "SIEM", share: 90 }] },
} };

test("the line names the share, the sample, the role and the date", () => {
  assert.equal(demandLine(table, "Junior Data Analyst", "SQL"), "Named in 64% of 22 recent Data analyst postings on free remote job feeds, 16 Oct.");
  assert.equal(demandLine(table, "Data analyst", "Java"), "Not named in any of 22 recent Data analyst postings on free remote job feeds, 16 Oct.");
});

test("Singapore postings come first, with the tag wording, and the remote line is the fallback", () => {
  const withSg: DemandTable = { ...table, sg: { "Data analyst": { role: "Data analyst", sample: 67, updated: "2026-10-16", skills: [{ name: "SQL", share: 40 }], pay: { low: 3900, mid: 5300, high: 8000, n: 67 } }, "SOC analyst": { role: "SOC analyst", sample: 4, updated: "2026-10-16", skills: [] } } };
  assert.equal(demandLine(withSg, "Data analyst", "SQL"), "Tagged in 40% of 67 recent Singapore Data analyst postings on MyCareersFuture, 16 Oct.");
  assert.equal(demandLine(withSg, "Data analyst", "Java"), "Not tagged in any of 67 recent Singapore Data analyst postings on MyCareersFuture, 16 Oct.");
  assert.equal(demandLine(withSg, "SOC analyst", "SIEM"), null, "4 Singapore postings is too few, and the remote sample is too small as well");
  assert.equal(demandLine(table, "Data analyst", "SQL")?.includes("remote"), true);
});

test("the pay line gives the range, the sample and the median, and only when there is a range", () => {
  const withSg: DemandTable = { ...table, sg: { "Data analyst": { role: "Data analyst", sample: 67, updated: "2026-10-16", skills: [], pay: { low: 3900, mid: 5300, high: 8000, n: 67 } } } };
  assert.equal(payLine(withSg, "Junior Data Analyst"), "Advertised pay for Data analyst in Singapore: S$3,900 to S$8,000 a month, the middle half of 67 postings (median S$5,300), 16 Oct. Postings only, not an offer.");
  assert.equal(payLine(table, "Data analyst"), null);
  assert.equal(payLine(null, "Data analyst"), null);
  assert.equal(payLine(withSg, "Barista"), null);
});

test("no line for an unknown role, a missing table or a sample that is too small", () => {
  assert.equal(demandLine(table, "Barista", "SQL"), null);
  assert.equal(demandLine(null, "Data analyst", "SQL"), null);
  assert.equal(demandLine(table, "SOC analyst", "SIEM"), null);
});

test("the table loads once, and a failed load is tried again", async () => {
  let calls = 0;
  const ok = (async () => { calls += 1; return new Response(JSON.stringify({ roles: table.roles })); }) as unknown as typeof fetch;
  const bad = (async () => { calls += 1; return new Response("nope", { status: 500 }); }) as unknown as typeof fetch;
  assert.equal(await loadDemand(bad), null);
  const first = await loadDemand(ok);
  assert.equal(first?.roles["Data analyst"].sample, 22);
  await loadDemand(ok);
  assert.equal(calls, 2, "one failed call, one good call, then the cached table");
});

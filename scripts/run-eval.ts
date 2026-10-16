// Prints native-scan accuracy on the labelled cases in lib/eval/cases.ts. Run with `npm run eval`.
import { cases } from "../lib/eval/cases.ts";
import { evaluate, type Rates } from "../lib/eval/run.ts";

const pct = (n: number) => `${(n * 100).toFixed(0)}%`.padStart(5);
const row = (label: string, r: Rates & { cases: number; failures?: number }) =>
  `${label.padEnd(22)}${String(r.cases).padStart(5)}${pct(r.resumePrecision)}${pct(r.resumeRecall)}${pct(r.proofPrecision)}${pct(r.proofRecall)}${pct(r.mentionOvercredit)}${pct(r.demandPrecision)}${pct(r.demandRecall)}${String(r.failures ?? "").padStart(6)}`;

const report = evaluate(cases);
console.log(`${"category".padEnd(22)}${"cases".padStart(5)}${"resP".padStart(5)}${"resR".padStart(5)}${"prfP".padStart(5)}${"prfR".padStart(5)}${"ovr".padStart(5)}${"demP".padStart(5)}${"demR".padStart(5)}${"fails".padStart(6)}`);
for (const [name, c] of Object.entries(report.byCategory)) console.log(row(name, c));
console.log(row("ALL", { ...report, failures: report.failures.length }));
console.log("\nresP/resR: résumé skill detected (evidence > 0) vs gold. prfP/prfR: strong proof (>= 45) vs skills the résumé shows. ovr: mention-only skills scored >= 45. demP/demR: posting demand > 0 vs gold.");
console.log(`Cut off by the six-skill limit, not counted as misses: résumé ${report.resCut}, proof ${report.proofCut}, demand ${report.demCut}.`);
console.log(`Quotes checked: ${report.quotesChecked}, not found in source: ${report.quoteBad}.\n`);
for (const f of report.failures) console.log(`${f.caseId.padEnd(18)}${f.kind.padEnd(22)}${f.skill.padEnd(22)}${f.reason}`);

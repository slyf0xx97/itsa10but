import type { Credits, DayCounts } from "./stats.ts";

/** The numbers the admin page shows. Counts and totals only: no keys, no résumé or role text, no visitor addresses. */
export type AdminStats = {
  today: string;
  counters: DayCounts[];
  usage: { allTime: { runs: number; in_tokens: number; out_tokens: number } | null; byModel: { day: string; model: string; provider: string; runs: number; in_tokens: number; out_tokens: number; ms: number; fallbacks: number }[] };
  firecrawl: { keySet: boolean; dailyCap: number; credits: Credits | null };
  workersAi: { dailyCap: number };
};

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string);
const n = (value: number | null | undefined) => (value == null ? "–" : Number(value).toLocaleString("en-SG"));
const cap = (value: number) => (value === 0 ? "off" : "of " + n(value) + " a day");

const CSS = `body{margin:0;background:#e8f4fb;color:#12343f;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:64rem;margin:0 auto;padding:1.5rem 1rem 3rem}h1{margin:0 0 .25rem;font-size:1.8rem}h2{margin:1.6rem 0 .4rem;font-size:1.3rem}p{margin:.25rem 0 .6rem}.note{color:#3b5662}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:.7rem;margin:.6rem 0 0;padding:0;list-style:none}.card{display:grid;gap:.2rem;align-content:start;padding:.8rem .9rem;border:1.5px solid rgb(31 36 48/18%);border-radius:14px;background:#fff}.card span{color:#3b5662;font-weight:700}.card b{font-size:1.9rem;line-height:1.1;font-variant-numeric:lining-nums tabular-nums}.card small{color:#3b5662;font-size:.95rem}
.wrap{overflow-x:auto;border:1.5px solid rgb(31 36 48/18%);border-radius:14px;background:#fff}table{width:100%;border-collapse:collapse;font-variant-numeric:lining-nums tabular-nums}th,td{padding:.5rem .8rem;border-bottom:1px solid rgb(31 36 48/12%);text-align:right;white-space:nowrap}th:first-child,td:nth-child(2){text-align:left}thead th{background:#d8eef9}tbody tr:last-child>*{border-bottom:0}`;

const card = (title: string, value: string, note = "") => `<li class="card"><span>${esc(title)}</span><b>${esc(value)}</b>${note ? `<small>${esc(note)}</small>` : ""}</li>`;

/** The whole admin page as one HTML string with its own styles. Every value is escaped. */
export function renderAdmin(stats: AdminStats, email: string): string {
  const today = stats.counters.find((day) => day.day === stats.today)?.counts ?? {};
  const credits = stats.firecrawl.credits;
  const all = stats.usage.allTime;
  const creditNote = credits ? `of ${n(credits.plan)}${credits.periodEnd ? ", plan renews " + credits.periodEnd.slice(0, 10) : ""}` : stats.firecrawl.keySet ? "Firecrawl did not answer" : "No site key on the Worker";
  const dayRows = stats.counters.length
    ? stats.counters.map((day) => `<tr><th scope="row">${esc(day.day)}</th><td>${n(day.counts["site-day"] ?? 0)}</td><td>${n(day.counts.own ?? 0)}</td><td>${n(day.counts.firecrawl ?? 0)}</td><td>${n(day.counts.roleai ?? 0)}</td></tr>`).join("")
    : `<tr><td colspan="5">No counters yet.</td></tr>`;
  const modelRows = stats.usage.byModel.length
    ? stats.usage.byModel.map((row) => `<tr><th scope="row">${esc(row.day)}</th><td>${esc(row.model || "–")} <small>(${esc(row.provider)})</small></td><td>${n(row.runs)}</td><td>${n(row.in_tokens)}</td><td>${n(row.out_tokens)}</td><td>${n(row.fallbacks)}</td><td>${n(Math.round((row.ms ?? 0) / 1000))}</td></tr>`).join("")
    : `<tr><td colspan="7">No Claude runs logged yet.</td></tr>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Itsa10but usage</title><style>${CSS}</style></head><body><main>
<h1>Itsa10but usage</h1><p class="note">Signed in as ${esc(email)}. Credits, Firecrawl calls and Claude runs, read from the edge Worker. Day counters keep 3 days and the token log 90.</p>
<h2>Today (${esc(stats.today)}, Singapore time)</h2>
<ul class="cards">${[
    card("Firecrawl credits left", n(credits?.remaining), creditNote),
    card("Firecrawl calls (site key)", n(today.firecrawl ?? 0), cap(stats.firecrawl.dailyCap)),
    card("Claude runs (site key)", n(today["site-day"] ?? 0), "daily cap is set on Vercel"),
    card("Claude runs (visitor keys)", n(today.own ?? 0), "their keys, their cost"),
    card("Workers AI role reads", n(today.roleai ?? 0), cap(stats.workersAi.dailyCap)),
    card("Tokens, all time", n((all?.in_tokens ?? 0) + (all?.out_tokens ?? 0)), `${n(all?.runs ?? 0)} runs, ${n(all?.in_tokens ?? 0)} in, ${n(all?.out_tokens ?? 0)} out`),
  ].join("")}</ul>
<h2>Counters by day</h2>
<div class="wrap"><table><thead><tr><th scope="col">Day</th><th scope="col">Site runs</th><th scope="col">Visitor-key runs</th><th scope="col">Firecrawl</th><th scope="col">Workers AI</th></tr></thead><tbody>${dayRows}</tbody></table></div>
<h2>Tokens by day and model</h2>
<p class="note">Last 30 days, from the usage log. Cost is not calculated here: multiply by your provider's current price.</p>
<div class="wrap"><table><thead><tr><th scope="col">Day</th><th scope="col">Model</th><th scope="col">Runs</th><th scope="col">Tokens in</th><th scope="col">Tokens out</th><th scope="col">Fallbacks</th><th scope="col">Seconds</th></tr></thead><tbody>${modelRows}</tbody></table></div>
</main></body></html>`;
}

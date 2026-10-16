import { estimateCost } from "@/lib/model-prices";

export type UsageRow = { agent: string; inputTokens: number; outputTokens: number; ms: number; model?: string };

const seconds = (ms: number) => (ms / 1000).toFixed(1);
const dollars = (value: number | null) => (value === null ? "n/a" : value < 0.01 ? "<$0.01" : "$" + value.toFixed(2));

/** What an API boost run used: tokens, time and an estimated cost per agent, with a total once the run is done. Counts only; no text from the résumé or role. */
export function UsagePanel({ rows, done }: { rows: UsageRow[]; done: boolean }) {
  const cost = (row: UsageRow) => estimateCost(row.model, row.inputTokens, row.outputTokens);
  const costs = rows.map(cost);
  const total = {
    inputTokens: rows.reduce((sum, row) => sum + row.inputTokens, 0),
    outputTokens: rows.reduce((sum, row) => sum + row.outputTokens, 0),
    ms: rows.reduce((sum, row) => sum + row.ms, 0),
    cost: costs.some((value) => value === null) ? null : costs.reduce<number>((sum, value) => sum + (value ?? 0), 0),
  };
  return <section className="usage-panel" aria-label="API boost usage">
    <h3>What this run used</h3>
    <div className="usage-scroll">
      <table>
        <thead><tr><th scope="col">Agent</th><th scope="col">Tokens in</th><th scope="col">Tokens out</th><th scope="col">Seconds</th><th scope="col">Est. cost</th></tr></thead>
        <tbody>
          {rows.map((row, i) => <tr key={row.agent}><th scope="row">{row.agent}</th><td>{row.inputTokens.toLocaleString("en-US")}</td><td>{row.outputTokens.toLocaleString("en-US")}</td><td>{seconds(row.ms)}</td><td>{dollars(costs[i])}</td></tr>)}
        </tbody>
        {done && <tfoot><tr><th scope="row">Total</th><td>{total.inputTokens.toLocaleString("en-US")}</td><td>{total.outputTokens.toLocaleString("en-US")}</td><td>{seconds(total.ms)}</td><td>{dollars(total.cost)}</td></tr></tfoot>}
      </table>
    </div>
    <p className="usage-note">Cost is an estimate from OpenRouter’s listed prices. Your provider’s bill is the real figure.</p>
  </section>;
}

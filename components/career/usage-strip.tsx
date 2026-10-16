import { PixelCoin } from "@/components/career/pixel-icons";
import { COIN_SLOTS, coinHalves, rowCost, shortCost, shortSeconds, shortTokens, totalOf, type UsageRow } from "@/lib/usage-coins";

/** The coins for one spend: full coins, one half coin if the count is odd, then empty slots. Decorative; the text beside it carries the numbers. */
function CoinRow({ tokens, big = false }: { tokens: number; big?: boolean }) {
  const halves = coinHalves(tokens);
  const size = big ? 24 : 18;
  return <span className={"rd-coin-row" + (big ? " big" : "")} aria-hidden="true">
    {Array.from({ length: COIN_SLOTS }, (_, i) => {
      if (halves >= (i + 1) * 2) return <PixelCoin key={i} size={size} />;
      if (halves === i * 2 + 1) return <span key={i} className="rd-coin-half"><PixelCoin empty size={size} /><span className="rd-coin-clip"><PixelCoin size={size} /></span></span>;
      return <PixelCoin key={i} empty size={size} />;
    })}
  </span>;
}

/** Under one reader card: what that agent spent. While it works the coins are empty; when it is done they fill. */
export function CardCoins({ row, working }: { row: UsageRow | undefined; working: boolean }) {
  const tokens = row ? row.inputTokens + row.outputTokens : 0;
  return <div className={"rd-coins" + (row ? " done" : "")}>
    <CoinRow tokens={tokens} />
    {row
      ? <p className="rd-coin-text"><span>{shortTokens(row.inputTokens)} in · {shortTokens(row.outputTokens)} out</span><span>{shortSeconds(row.ms)} · {shortCost(rowCost(row))}</span></p>
      : <p className="rd-coin-text"><span>{working ? "Spending…" : "Not run yet"}</span></p>}
  </div>;
}

/** Under the four cards: the run's total, once at least one agent has finished. Says plainly that the cost is an estimate. */
export function RunTotal({ rows, done }: { rows: UsageRow[]; done: boolean }) {
  if (!rows.length) return null;
  const total = totalOf(rows);
  return <div className="rd-total" role="status">
    <CoinRow tokens={total.inputTokens + total.outputTokens} big />
    <p className="rd-total-text">
      <b>{done ? "This run used" : "So far this run has used"}</b>
      <span>{shortTokens(total.inputTokens)} tokens in{total.cachedTokens > 0 ? ` (${shortTokens(total.cachedTokens)} reused from cache)` : ""} · {shortTokens(total.outputTokens)} out · {shortSeconds(total.ms)} · {shortCost(total.cost)}</span>
    </p>
    <p className="rd-total-note">Cost is an estimate from OpenRouter’s listed prices. Your provider’s bill is the real figure.</p>
  </div>;
}

import { estimateCost } from "./model-prices.ts";

/** One agent's spend in a live run: counts and time only. */
export type UsageRow = { agent: string; inputTokens: number; outputTokens: number; ms: number; model?: string; cacheReadTokens?: number; cacheWriteTokens?: number };

/** The estimated cost of one agent, counting what it reused from the cache at the lower rate. */
export const rowCost = (row: UsageRow): number | null => estimateCost(row.model, row.inputTokens, row.outputTokens, row.cacheReadTokens, row.cacheWriteTokens);

export const COIN_SLOTS = 6;
/** One full coin is this many tokens (input and output together). Half a coin is half of that. */
export const TOKENS_PER_COIN = 5000;

/** How many halves of a coin to fill, from 0 to COIN_SLOTS * 2. Any spend at all shows at least half a coin. */
export function coinHalves(tokens: number): number {
  if (!(tokens > 0)) return 0;
  return Math.min(COIN_SLOTS * 2, Math.max(1, Math.ceil(tokens / (TOKENS_PER_COIN / 2))));
}

/** 940 stays "940"; 12,930 becomes "12.9k". */
export function shortTokens(tokens: number): string {
  if (tokens < 1000) return String(Math.max(0, Math.round(tokens)));
  const thousands = tokens / 1000;
  return (thousands >= 100 ? Math.round(thousands) : Math.round(thousands * 10) / 10) + "k";
}

export const shortSeconds = (ms: number): string => (ms < 9500 ? (ms / 1000).toFixed(1) : String(Math.round(ms / 1000))) + " s";

/** "about $0.04", "under $0.01", or "no price listed" for a model without a listed price. */
export function shortCost(dollars: number | null): string {
  if (dollars === null) return "no price listed";
  return dollars < 0.01 ? "under $0.01" : "about $" + dollars.toFixed(2);
}

export function totalOf(rows: UsageRow[]): { inputTokens: number; outputTokens: number; cachedTokens: number; ms: number; cost: number | null } {
  const costs = rows.map((row) => rowCost(row));
  return {
    inputTokens: rows.reduce((sum, row) => sum + row.inputTokens, 0),
    outputTokens: rows.reduce((sum, row) => sum + row.outputTokens, 0),
    cachedTokens: rows.reduce((sum, row) => sum + (row.cacheReadTokens ?? 0), 0),
    ms: rows.reduce((sum, row) => sum + row.ms, 0),
    cost: rows.length === 0 || costs.some((cost) => cost === null) ? null : costs.reduce<number>((sum, cost) => sum + (cost ?? 0), 0),
  };
}

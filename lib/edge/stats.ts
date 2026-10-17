/** Pure shaping for the admin stats: the Worker's D1 counters and Firecrawl's credit answer, cleaned before they reach the page. Counts only. */

export type LimitRow = { id: string; span: string; count: number };
export type DayCounts = { day: string; counts: Record<string, number> };

/**
 * `limits` ids are "bucket|day" (daily caps) or "bucket|hour|visitor hash" (hourly caps). Both roll up to one number per bucket per Singapore day,
 * so "own" reads as the runs on a visitor's own key that day. The visitor hash never leaves this function.
 */
export function countersByDay(rows: LimitRow[]): DayCounts[] {
  const days = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const bucket = String(row.id).split("|")[0];
    const day = String(row.span).slice(0, 10);
    const count = Math.max(0, Math.trunc(Number(row.count)) || 0);
    if (!/^[a-z-]{1,24}$/.test(bucket) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const counts = days.get(day) ?? {};
    counts[bucket] = (counts[bucket] ?? 0) + count;
    days.set(day, counts);
  }
  return [...days].sort(([a], [b]) => (a < b ? 1 : -1)).map(([day, counts]) => ({ day, counts }));
}

export type Credits = { remaining: number | null; plan: number | null; periodEnd: string | null };

const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null);

/** Firecrawl's credit-usage answer, in either spelling (remainingCredits or remaining_credits). Anything else is null. */
export function cleanCredits(raw: unknown): Credits | null {
  const data = (raw as { data?: Record<string, unknown> } | null)?.data;
  if (!data || typeof data !== "object") return null;
  const remaining = num(data.remainingCredits ?? data.remaining_credits);
  const plan = num(data.planCredits ?? data.plan_credits);
  const end = data.billingPeriodEnd ?? data.billing_period_end;
  if (remaining === null && plan === null) return null;
  return { remaining, plan, periodEnd: typeof end === "string" && end.length <= 40 ? end : null };
}

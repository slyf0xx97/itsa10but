/** Pure shaping for the daily "Latest in AI" refresh. The Worker cron and the tests both use it. */
export type AiPick = { kind: "Model" | "Research" | "Finding"; title: string; text: string; publisher: string; published: string; url: string };
export type SnapshotDoc = { checked: string; ai: AiPick[] };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const clip = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** "16 Oct 2026" for an ISO timestamp, in Singapore time. Empty for anything that is not a date. */
export function sgDate(iso: unknown): string {
  const time = typeof iso === "string" ? Date.parse(iso) : NaN;
  if (Number.isNaN(time)) return "";
  const d = new Date(time + 8 * 3_600_000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const kindOf = (title: string): AiPick["kind"] => (/\b(releases?|launch\w*|unveils?|model|gpt|gemini|claude|llama)\b/i.test(title) ? "Model" : /\b(research|paper|proofs?|maths?|math)\b/i.test(title) ? "Research" : "Finding");

/** News results from a Firecrawl search to at most `max` picks. Only https links with a title count; the text is the source's own snippet, not a summary of ours. */
export function aiPicks(json: unknown, max = 4): AiPick[] {
  const news = (json as { data?: { news?: unknown } } | null)?.data?.news;
  const out: AiPick[] = [];
  for (const row of Array.isArray(news) ? news : []) {
    const r = row as { title?: unknown; snippet?: unknown; url?: unknown; date?: unknown };
    const title = clip(r.title, 120);
    let host = "";
    try { const u = new URL(String(r.url)); if (u.protocol === "https:") host = u.hostname.replace(/^www\./, ""); } catch { /* skip */ }
    if (!title || !host || out.some((p) => p.url === r.url)) continue;
    out.push({ kind: kindOf(title), title, text: clip(r.snippet, 220), publisher: host, published: clip(r.date, 30), url: String(r.url) });
    if (out.length === max) break;
  }
  return out;
}

/** What an API reply may carry: a date and picks that pass the same shape checks, or null. */
export function cleanSnapshot(value: unknown): SnapshotDoc | null {
  const v = value as { checked?: unknown; ai?: unknown } | null;
  const checked = typeof v?.checked === "string" && sgDate(v.checked) ? v.checked : "";
  if (!checked) return null;
  return { checked, ai: aiPicks({ data: { news: Array.isArray(v?.ai) ? v!.ai : [] } }, 4) };
}

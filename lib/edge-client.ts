/**
 * Server-side client for the itsa10but edge Worker (worker/). Only the Vercel routes use it, with a shared secret; the browser never
 * calls the Worker. Every call is short, fails closed to null, and never carries résumé text, role text or a model key. A visitor's
 * Firecrawl key is forwarded in a header so their own credits pay for their own run.
 */
export type Edge = { url: string; secret: string; fetchImpl?: typeof fetch };

type Env = Record<string, string | undefined>;

export function edgeFromEnv(env: Env = process.env): Edge | undefined {
  const url = env.EDGE_URL?.trim().replace(/\/+$/, "");
  const secret = env.EDGE_SECRET?.trim();
  // https only, except a Worker running on this machine for local testing.
  return url && secret && /^(https:\/\/|http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$))/.test(url) ? { url, secret } : undefined;
}

/** POSTs JSON to the Worker and returns the parsed answer, or null on any failure. */
export async function edgeCall<T = unknown>(edge: Edge, path: string, body: unknown, options: { firecrawlKey?: string; timeoutMs?: number } = {}): Promise<T | null> {
  try {
    const response = await (edge.fetchImpl ?? fetch)(edge.url + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-edge-secret": edge.secret, ...(options.firecrawlKey ? { "x-firecrawl-key": options.firecrawlKey } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options.timeoutMs ?? 9000),
      cache: "no-store",
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

/** GETs JSON from the Worker (the shared secret in a header) and returns it, or null on any failure. */
export async function edgeGet<T = unknown>(edge: Edge, path: string, timeoutMs = 4000): Promise<T | null> {
  try {
    const response = await (edge.fetchImpl ?? fetch)(edge.url + path, { headers: { "x-edge-secret": edge.secret }, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

export type UsageLogRow = { agent: string; model?: string; provider: string; inputTokens: number; outputTokens: number; ms: number; fallback: boolean };

/** The usage log must never slow or break a run, so callers do not wait for it; the promise is returned so a serverless host can keep the function alive until it lands. Counts and timings only. */
export function logUsage(edge: Edge | undefined, runId: string, rows: UsageLogRow[]): Promise<unknown> {
  return edge && rows.length ? edgeCall(edge, "/usage", { runId, rows }, { timeoutMs: 4000 }) : Promise.resolve();
}

/** Takes one slot from the shared counters. Returns null when the edge can't be reached, so the caller falls back to its in-memory limiter. */
export async function edgeLimit(edge: Edge, bucket: string, visitor: string, max: number, window: "day" | "hour"): Promise<{ ok: boolean } | null> {
  const answer = await edgeCall<{ ok?: boolean }>(edge, "/limit", { bucket, visitor, max, window }, { timeoutMs: 3000 });
  return answer && typeof answer.ok === "boolean" ? { ok: answer.ok } : null;
}

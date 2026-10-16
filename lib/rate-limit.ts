/**
 * Soft in-app spend guard for live mode. Memory is per server instance, so this
 * is a backstop behind the Vercel Firewall rule and the key spend limits, not a
 * replacement for them (upgrade path: Upstash).
 */
import { edgeLimit, type Edge } from "./edge-client.ts";

export type LimiterOptions = { perVisitorMax: number; perVisitorWindowMs: number; dailyCap: number; now?: () => number };
export type LimitResult = { ok: true } | { ok: false; reason: "visitor" | "daily" };

export function createLimiter(options: LimiterOptions) {
  const now = options.now ?? Date.now;
  const visitors = new Map<string, number[]>();
  let day = "";
  let today = 0;
  const rollDay = () => {
    const key = new Date(now()).toISOString().slice(0, 10);
    if (key !== day) { day = key; today = 0; }
  };
  return {
    /** Counts the run when it returns ok. */
    take(visitor: string): LimitResult {
      rollDay();
      const cutoff = now() - options.perVisitorWindowMs;
      for (const [key, hits] of visitors) {
        const fresh = hits.filter((hit) => hit > cutoff);
        if (fresh.length) visitors.set(key, fresh); else visitors.delete(key);
      }
      if (today >= options.dailyCap) return { ok: false, reason: "daily" };
      const hits = visitors.get(visitor) ?? [];
      if (hits.length >= options.perVisitorMax) return { ok: false, reason: "visitor" };
      hits.push(now());
      visitors.set(visitor, hits);
      today += 1;
      return { ok: true };
    },
    /** True when today's cap is used up (does not count a run). */
    dailyCapReached(): boolean { rollDay(); return today >= options.dailyCap; },
  };
}

const intFrom = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

/** `live`: this site's own key can run the agents. `ownKey`: a visitor's own key can (always true here; the page also sets it false when the status call fails). */
export type ModeStatus = { live: boolean; reason?: string; ownKey: boolean };

type Env = Record<string, string | undefined>;

/** Reasons are fixed strings: nothing from the environment is echoed back. */
export function liveStatus(env: Env, limiter?: { dailyCapReached(): boolean }): ModeStatus {
  const ownKey = true;
  if (env.LIVE_AGENTS_ENABLED?.trim() !== "true") return { live: false, reason: "Claude agents are switched off on this site.", ownKey };
  if (!env.ANTHROPIC_API_KEY?.trim()) return { live: false, reason: "This site has no Claude API key set.", ownKey };
  if (limiter?.dailyCapReached()) return { live: false, reason: "Today's Claude runs are used up. Try again tomorrow.", ownKey };
  return { live: true, ownKey };
}

export function limiterFromEnv(env: Env) {
  return createLimiter({ perVisitorMax: intFrom(env.LIVE_AGENTS_PER_VISITOR, 3), perVisitorWindowMs: 60 * 60 * 1000, dailyCap: intFrom(env.LIVE_AGENTS_DAILY_CAP, 50) });
}

/** Platform-provided client IP only. A client-set x-forwarded-for chain is never trusted. */
export function visitorKey(headers: { get(name: string): string | null }): string {
  const value = headers.get("x-vercel-forwarded-for") ?? headers.get("x-real-ip") ?? "";
  return /^[0-9a-f:.]{3,45}$/i.test(value.trim()) ? value.trim() : "unknown";
}

/** Own-key runs spend the visitor's Anthropic money, not the site's, so there is no daily cap. The per-visitor limit still protects the server's compute and Firecrawl key. */
export function ownKeyLimiterFromEnv(env: Env) {
  return createLimiter({ perVisitorMax: intFrom(env.LIVE_OWN_KEY_PER_VISITOR, 10), perVisitorWindowMs: 60 * 60 * 1000, dailyCap: Number.POSITIVE_INFINITY });
}

// One limiter per server instance, shared by /api/mode and /api/agents/stream.
let shared: ReturnType<typeof limiterFromEnv> | undefined;
export const sharedLimiter = () => (shared ??= limiterFromEnv(process.env));
let sharedOwn: ReturnType<typeof ownKeyLimiterFromEnv> | undefined;
export const sharedOwnKeyLimiter = () => (sharedOwn ??= ownKeyLimiterFromEnv(process.env));

/**
 * Takes one run slot. With the edge Worker the counters are shared across every Vercel instance and the daily cap rolls over at
 * midnight in Singapore. If the edge can't be reached, this instance's in-memory limiter decides instead.
 */
export async function takeRun(options: { edge?: Edge; ownKey: boolean; visitor: string; env: Env; fallback: { take(visitor: string): LimitResult } }): Promise<LimitResult> {
  const { edge, ownKey, visitor, env } = options;
  if (edge) {
    if (ownKey) {
      const hour = await edgeLimit(edge, "own", visitor, intFrom(env.LIVE_OWN_KEY_PER_VISITOR, 10), "hour");
      if (hour) return hour.ok ? { ok: true } : { ok: false, reason: "visitor" };
    } else {
      const day = await edgeLimit(edge, "site-day", visitor, intFrom(env.LIVE_AGENTS_DAILY_CAP, 50), "day");
      if (day && !day.ok) return { ok: false, reason: "daily" };
      const hour = day ? await edgeLimit(edge, "site", visitor, intFrom(env.LIVE_AGENTS_PER_VISITOR, 3), "hour") : null;
      if (day && hour) return hour.ok ? { ok: true } : { ok: false, reason: "visitor" };
    }
  }
  return options.fallback.take(visitor);
}

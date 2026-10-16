import { anthropicClient } from "@/lib/anthropic-client";
import { runLiveAgents, validateLiveBody, type LiveClient } from "@/lib/live-agents";
import { edgeFromEnv } from "@/lib/edge-client";
import { liveStatus, sharedLimiter, sharedOwnKeyLimiter, takeRun, visitorKey } from "@/lib/rate-limit";
import { checkModelChoice } from "@/lib/model-choice";
import { isAuthRejection, readVisitorKeys, scrubKeys } from "@/lib/visitor-keys";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const headers = { "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no", "X-Content-Type-Options": "nosniff" };
const REJECTED = {
  anthropic: "Anthropic rejected that key. Showing the native scan result instead.",
  openrouter: "OpenRouter rejected that key. Showing the native scan result instead.",
};

/**
 * Live Claude agents as NDJSON, same event shapes as api/engine/stream. Order: validate,
 * visitor keys (headers only), host check, then either the visitor's own key or this site's
 * key (kill switch, daily cap), limiter, run. Nothing from the body or a key is logged or echoed.
 */
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 150_000) return Response.json({ error: "That request is too big." }, { status: 413, headers });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "We couldn't read that request." }, { status: 400, headers }); }
  const checked = validateLiveBody(body);
  if (!checked.ok) return Response.json({ error: checked.error }, { status: 400, headers });
  const supplied = readVisitorKeys(request.headers);
  if (!supplied.ok) return Response.json({ error: supplied.error }, { status: 400, headers });
  const visitorKeys = supplied.keys;

  const status = liveStatus(process.env, sharedLimiter());

  const ownModelKey = visitorKeys.openrouter ?? visitorKeys.anthropic;
  const provider = visitorKeys.openrouter ? "openrouter" : "anthropic";
  const ownKey = Boolean(ownModelKey);
  // The model choice is not a secret, so it rides in the body. It is checked here and nothing unchecked reaches the upstream request. The site key keeps the recommended mix.
  const chosen = checkModelChoice((body as { model?: unknown } | null)?.model, ownKey ? provider : "site");
  if (!chosen.ok) return Response.json({ error: chosen.error }, { status: 400, headers });
  if (!ownKey && !status.live) {
    const error = `${status.reason} You can paste your own Anthropic or OpenRouter key in Agent power, in the header.`;
    return Response.json({ error, fallback: "rules" }, { status: 503, headers });
  }
  const edge = edgeFromEnv();
  const taken = await takeRun({ edge, ownKey, visitor: visitorKey(request.headers), env: process.env, fallback: ownKey ? sharedOwnKeyLimiter() : sharedLimiter() });
  if (!taken.ok) {
    const error = taken.reason === "daily" ? "Today's Claude runs are used up. Try again tomorrow." : "You have used your Claude runs for now. Try again later.";
    return Response.json({ error, fallback: "rules" }, { status: 429, headers });
  }

  const apiKey = ownKey ? ownModelKey! : process.env.ANTHROPIC_API_KEY!.trim();
  // The site's Firecrawl key is only spent on runs the site has switched on for itself.
  const siteFirecrawl = process.env.LIVE_AGENTS_ENABLED?.trim() === "true" ? process.env.FIRECRAWL_API_KEY?.trim() || undefined : undefined;
  const firecrawlKey = visitorKeys.firecrawl ?? siteFirecrawl;

  let rejected = false;
  const base = anthropicClient(apiKey, provider);
  const client: LiveClient = {
    async create(req, signal) {
      try { return await base.create(req, signal); }
      catch (error) { if (isAuthRejection(error)) rejected = true; throw error; }
    },
  };

  const encoder = new TextEncoder();
  const runId = crypto.randomUUID().slice(0, 8);
  const line = (event: unknown) => encoder.encode(scrubKeys(JSON.stringify(event), visitorKeys) + "\n");
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const events = runLiveAgents(checked.resumes, checked.job, { client, firecrawlKey, edge, provider, model: chosen.model, linkedinUrl: checked.linkedinUrl, signal: request.signal, runId });
        for await (const event of events) {
          // The runner reports a refused key as a generic outage; say what happened.
          controller.enqueue(line(ownKey && rejected && event.type === "notice" ? { ...event, message: REJECTED[provider] } : event));
        }
      } catch {
        controller.enqueue(line({ type: "error", error: "The live run couldn't finish." }));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { ...headers, "Content-Type": "application/x-ndjson; charset=utf-8" } });
}

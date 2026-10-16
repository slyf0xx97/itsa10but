import { after } from "next/server";
import { anthropicClient } from "@/lib/anthropic-client";
import { openRouterChatClient } from "@/lib/openrouter-chat-client";
import { geminiClient } from "@/lib/gemini-client";
import { runLiveAgents, validateLiveBody, type LiveClient } from "@/lib/live-agents";
import { edgeFromEnv } from "@/lib/edge-client";
import { liveStatus, sharedLimiter, sharedOwnKeyLimiter, takeRun, visitorKey } from "@/lib/rate-limit";
import { DEFAULT_MODELS, checkAgentModels, checkModelChoice } from "@/lib/model-choice";
import { isAuthRejection, readVisitorKeys, scrubKeys } from "@/lib/visitor-keys";
import { TURNSTILE_HEADER, verifyTurnstile } from "@/lib/turnstile";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const headers = { "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no", "X-Content-Type-Options": "nosniff" };
const REJECTED = {
  anthropic: "Anthropic rejected that key. Showing the native scan result instead.",
  openrouter: "OpenRouter rejected that key. Showing the native scan result instead.",
  gemini: "Google rejected that key. Showing the native scan result instead.",
} as const;
// A 429 usually means the key's own quota. On Google's free plan that is only a few requests a minute, far fewer than four agents need.
const LIMITED = {
  anthropic: "Anthropic is limiting this key right now. Showing the native scan result instead.",
  openrouter: "OpenRouter is limiting this key right now. Showing the native scan result instead.",
  gemini: "Google is limiting this key right now. The free Gemini plan allows only a few requests a minute, so the agents can't finish. Showing the native scan result instead.",
} as const;

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

  const ownModelKey = visitorKeys.openrouter ?? visitorKeys.gemini ?? visitorKeys.anthropic;
  const provider = visitorKeys.openrouter ? "openrouter" : visitorKeys.gemini ? "gemini" : "anthropic";
  const ownKey = Boolean(ownModelKey);
  // The model choice is not a secret, so it rides in the body. It is checked here and nothing unchecked reaches the upstream request. The site key keeps the recommended mix.
  const chosen = checkModelChoice((body as { model?: unknown } | null)?.model, ownKey ? provider : "site");
  if (!chosen.ok) return Response.json({ error: chosen.error }, { status: 400, headers });
  // A pick for single agents is checked the same way, agent by agent. The site key takes none.
  const perAgent = checkAgentModels((body as { agentModels?: unknown } | null)?.agentModels, ownKey ? provider : "site");
  if (!perAgent.ok) return Response.json({ error: perAgent.error }, { status: 400, headers });
  if (!ownKey && !status.live) {
    const error = `${status.reason} You can paste your own Anthropic, OpenRouter or Gemini key in Agent power, in the header.`;
    return Response.json({ error, fallback: "rules" }, { status: 503, headers });
  }
  if (!(await verifyTurnstile(request.headers.get(TURNSTILE_HEADER), process.env, visitorKey(request.headers)))) {
    return Response.json({ error: "The bot check did not pass. Reload the page and try again.", fallback: "rules" }, { status: 403, headers });
  }
  const edge = edgeFromEnv();
  const taken = await takeRun({ edge, ownKey, visitor: visitorKey(request.headers), env: process.env, fallback: ownKey ? sharedOwnKeyLimiter() : sharedLimiter() });
  if (!taken.ok) {
    const error = taken.reason === "daily" ? "Today's API boost runs are used up. Try again tomorrow." : "You have used your API boost runs for now. Try again later.";
    return Response.json({ error, fallback: "rules" }, { status: 429, headers });
  }

  const apiKey = ownKey ? ownModelKey! : process.env.ANTHROPIC_API_KEY!.trim();
  // Only a visitor's own Firecrawl key is forwarded. The site's key lives in the edge Worker, which counts its daily use.
  const firecrawlKey = visitorKeys.firecrawl;

  let rejected = false;
  let limited = false;
  // On OpenRouter, Claude models keep the Anthropic-style path (prompt caching); every other model goes through chat completions so its thinking can be turned down.
  const claudeBase = provider === "gemini" ? geminiClient(apiKey) : anthropicClient(apiKey, provider);
  const chatBase = provider === "openrouter" ? openRouterChatClient(apiKey) : null;
  const base: LiveClient = chatBase ? { create: (req, signal) => (/^(?:anthropic\/)?claude-/i.test(req.model) ? claudeBase : chatBase).create(req, signal) } : claudeBase;
  const client: LiveClient = {
    async create(req, signal) {
      try { return await base.create(req, signal); }
      catch (error) { if (isAuthRejection(error)) rejected = true; else if ((error as { status?: unknown } | null)?.status === 429) limited = true; throw error; }
    },
  };

  const encoder = new TextEncoder();
  const runId = crypto.randomUUID().slice(0, 8);
  const line = (event: unknown) => encoder.encode(scrubKeys(JSON.stringify(event), visitorKeys) + "\n");
  // The usage log is sent after the stream ends; `after` keeps the function alive until it has landed.
  const background: Promise<unknown>[] = [];
  let finished = () => {};
  const done = new Promise<void>((resolve) => { finished = resolve; });
  after(() => done);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const events = runLiveAgents(checked.resumes, checked.job, { client, firecrawlKey, edge, provider, paceMs: 220, track: (task) => background.push(task), model: chosen.model ?? (ownKey ? DEFAULT_MODELS[provider] : undefined), agentModels: perAgent.models, linkedinUrl: checked.linkedinUrl, signal: request.signal, runId });
        for await (const event of events) {
          // The runner reports a refused key as a generic outage; say what happened.
          controller.enqueue(line(ownKey && (rejected || limited) && event.type === "notice" ? { ...event, message: rejected ? REJECTED[provider] : LIMITED[provider] } : event));
        }
      } catch {
        controller.enqueue(line({ type: "error", error: "The live run couldn't finish." }));
      } finally {
        controller.close();
        void Promise.allSettled(background).then(() => finished());
      }
    },
  });
  return new Response(stream, { headers: { ...headers, "Content-Type": "application/x-ndjson; charset=utf-8" } });
}

import { edgeCall, edgeFromEnv, edgeLimit } from "@/lib/edge-client";
import { ROLE_MIN, pickSkills } from "@/lib/edge/role-skills";
import { visitorKey } from "@/lib/rate-limit";
import { TURNSTILE_HEADER, verifyTurnstile } from "@/lib/turnstile";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const MAX_BODY = 20_000;

/**
 * Skills the role text names that the catalog lacks, read by a small Cloudflare Workers AI model through the edge Worker.
 * Only the role text travels: never a résumé. Every name is checked again here against the text, so a model answer can't add a skill
 * the posting doesn't contain. Any failure, a missing Worker, an exhausted free allowance or a failed bot check gives an empty list, and the native scan carries on with its text rules.
 */
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return Response.json({ skills: [], error: "That request is too large." }, { status: 413, headers });
  // A chunked request has no Content-Length, so the size is checked on the text as well, before it is parsed.
  const raw = await request.text();
  if (raw.length > MAX_BODY) return Response.json({ skills: [], error: "That request is too large." }, { status: 413, headers });
  const body = (() => { try { return JSON.parse(raw) as { job?: unknown } | null; } catch { return null; } })();
  const job = typeof body?.job === "string" ? body.job.trim() : "";
  if (job.length < ROLE_MIN || job.length > 15_000) return Response.json({ skills: [], error: "Add the role text first." }, { status: 400, headers });
  const visitor = visitorKey(request.headers);
  if (!(await verifyTurnstile(request.headers.get(TURNSTILE_HEADER), process.env, visitor))) return Response.json({ skills: [], error: "The bot check did not pass." }, { status: 403, headers });
  const edge = edgeFromEnv();
  if (!edge) return Response.json({ skills: [], off: true }, { headers });
  const slot = await edgeLimit(edge, "roleai", visitor, 20, "hour");
  if (slot && !slot.ok) return Response.json({ skills: [], error: "Too many role reads this hour." }, { status: 429, headers });
  const answer = await edgeCall<{ skills?: unknown; off?: boolean }>(edge, "/role-skills", { job }, { timeoutMs: 12_000 });
  return Response.json({ skills: pickSkills(answer?.skills, job), off: !answer || answer.off === true }, { headers });
}

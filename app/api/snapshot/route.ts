import { edgeFromEnv, edgeGet } from "@/lib/edge-client";
import { cleanSnapshot } from "@/lib/edge/snapshot";

export const dynamic = "force-dynamic";

/**
 * The day the sources were last checked and this week's AI headlines, both written by the Worker's daily cron. Public, no visitor input,
 * so the CDN keeps a copy for an hour. With no Worker or no stored check the reply is empty and the page keeps its built-in text and date.
 */
export async function GET() {
  const edge = edgeFromEnv();
  const live = edge ? await edgeGet<{ snapshot?: unknown }>(edge, "/snapshot") : null;
  return Response.json(cleanSnapshot(live?.snapshot) ?? {}, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}

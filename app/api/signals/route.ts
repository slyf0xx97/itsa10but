import { fetchNativeNews } from "@/lib/native-scraper";
import { visitorKey } from "@/lib/rate-limit";
import { refreshNews } from "@/lib/signals-news";
import { readVisitorKeys } from "@/lib/visitor-keys";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

/**
 * Latest Singapore tech hiring headlines from a fixed allowlist of news and government sites.
 * Our own feed reader (lib/native-scraper.ts) runs with no key. A Firecrawl search adds results when a key exists:
 * the visitor's own in the x-firecrawl-key header, or this site's key when LIVE_AGENTS_ENABLED=true.
 * No body is read and no model runs. Replies hold headlines, dates, sources and snippets only.
 */
export async function POST(request: Request) {
  const supplied = readVisitorKeys(request.headers);
  if (!supplied.ok) return Response.json({ error: supplied.error }, { status: 400, headers });
  const reply = await refreshNews({ keys: supplied.keys, env: process.env, visitor: visitorKey(request.headers), native: (max) => fetchNativeNews(max) });
  return Response.json(reply.body, { status: reply.status, headers });
}

import { NextResponse } from "next/server";
import { handleMcp } from "@/lib/mcp-server";
import { searchJobSources } from "@/lib/job-adapters";
import { filterJobs } from "@/lib/job-types";
import { fetchNativeNews } from "@/lib/native-scraper";
import { visitorKey } from "@/lib/rate-limit";
import { refreshNews as refreshNewsCore } from "@/lib/signals-news";
import { readVisitorKeys } from "@/lib/visitor-keys";
export const dynamic = "force-dynamic";

// Stateless Streamable-HTTP MCP endpoint: one JSON-RPC message per POST.
async function searchJobs(query: string) {
  const result = await searchJobSources(query, "all", "worldwide");
  const jobs = filterJobs(result.jobs, { query, level: "all", scope: "worldwide" }).slice(0, 10)
    .map(({ title, company, location, workplace, type, postedAt, applyUrl, source }) => ({ title, company, location, workplace, type, postedAt, applyUrl, source }));
  return { jobs, sources: result.sources, note: "Live feed snapshot; confirm the posting is still open and that you are eligible for the location." };
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 }); }
  if (Array.isArray(body)) return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Batches are not supported." } }, { status: 400 });
  // The refresh tool follows the same rules as /api/signals: the native feed reader needs no key, and a Firecrawl key comes from the request header only.
  const supplied = readVisitorKeys(request.headers);
  const refreshNews = async () => supplied.ok
    ? refreshNewsCore({ keys: supplied.keys, env: process.env, visitor: visitorKey(request.headers), native: (max) => fetchNativeNews(max) })
    : { status: 400, body: { error: supplied.error } };
  const reply = await handleMcp(body as Parameters<typeof handleMcp>[0], { searchJobs, refreshNews });
  return reply ? NextResponse.json(reply, { headers: { "Cache-Control": "no-store" } }) : new Response(null, { status: 202 });
}

export function GET() {
  return new Response("This MCP server answers POST only.", { status: 405, headers: { Allow: "POST" } });
}

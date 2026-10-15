import { NextRequest, NextResponse } from "next/server";
import { searchJobSources } from "@/lib/job-adapters";
import { filterJobs } from "@/lib/job-types";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = params.get("q")?.trim() ?? "";
  const level = params.get("level") ?? "all", scope = params.get("scope") ?? "singapore";
  const workplace = params.get("workplace") || undefined, type = params.get("type") || undefined;
  const days = Number(params.get("days") || 0);
  if (query.length < 3 || query.length > 50 || !["all", "entry"].includes(level) || !["singapore", "worldwide"].includes(scope)
    || (workplace && !["remote", "hybrid", "on-site"].includes(workplace)) || (type && !["internship", "full-time", "part-time", "contract"].includes(type)) || ![0,1,7,30].includes(days)) {
    return NextResponse.json({ error: "Use 3 to 50 search characters and the job filters on the page." }, { status: 400 });
  }
  const result = await searchJobSources(query, level, scope);
  if (result.sources.every(source => !source.available)) return NextResponse.json({ error: "The job feeds are unavailable. Try again shortly or paste a job description.", sources: result.sources }, { status: 502 });
  const jobs = filterJobs(result.jobs, { query, level, scope, workplace, type, days, location: params.get("location") ?? undefined }).slice(0, 100);
  return NextResponse.json({ jobs, sources: result.sources, searchedAt: new Date().toISOString(), partial: result.sources.some(source => !source.available),
    scope: "Himalayas, Jobicy and Remotive remote feeds; Arbeitnow Europe. Confirm location eligibility. Remotive listings are delayed by 24 hours.",
    excludedSources: [{ source: "MyCareersFuture", reason: "Public API reuse permission not verified; use the search link." }, { source: "The Muse", reason: "API terms require app registration; use the search link." }],
  }, { headers: { "Cache-Control": "private, max-age=60" } });
}

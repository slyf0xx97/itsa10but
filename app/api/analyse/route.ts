import { NextResponse } from "next/server";
import { previewAnalysis } from "@/lib/preview-analysis";
import type { Resume } from "@/lib/analysis-types";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { resumes?: Resume[]; job?: string };
    if (!Array.isArray(body.resumes) || body.resumes.length < 1 || body.resumes.length > 3 || !body.resumes.every((item) => typeof item.name === "string" && typeof item.text === "string" && item.text.trim().length >= 25 && item.text.length <= 30000) || typeof body.job !== "string" || body.job.trim().length < 30 || body.job.length > 15000) return NextResponse.json({ error: "Add 1 to 3 readable résumés and a job description of at least 30 characters." }, { status: 400 });
    const result = previewAnalysis(body.resumes, body.job);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The analysis couldn't finish.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

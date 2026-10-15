import { runSimulatedEngine } from "@/lib/simulated-engine";
import type { Resume } from "@/lib/analysis-types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { resumes?: Resume[]; job?: string };
  try {
    body = (await request.json()) as { resumes?: Resume[]; job?: string };
  } catch {
    return Response.json({ error: "We couldn't read that request." }, { status: 400 });
  }
  if (
    !Array.isArray(body.resumes) || body.resumes.length < 1 || body.resumes.length > 3 ||
    !body.resumes.every((item) => typeof item.name === "string" && typeof item.text === "string" && item.text.trim().length >= 25 && item.text.length <= 30000) ||
    typeof body.job !== "string" || body.job.trim().length < 30 || body.job.length > 15000
  ) {
    return Response.json({ error: "Add 1 to 3 readable résumés and a job description of at least 30 characters." }, { status: 400 });
  }

  const resumes = body.resumes;
  const job = body.job;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (value: unknown) => controller.enqueue(encoder.encode(JSON.stringify(value) + "\n"));
      try {
        for await (const event of runSimulatedEngine(resumes, job, { stepDelayMs: 260, paceMs: 0 })) {
          if (request.signal.aborted) break;
          send(event);
        }
      } catch (error) {
        send({ type: "error", error: error instanceof Error ? error.message : "The check couldn't finish." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

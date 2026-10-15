import { fetchTechEntries } from "@/lib/native-scraper";
import { visitorKey } from "@/lib/rate-limit";
import { SKILL_NEWS_MAX_BODY, answerSkillNews } from "@/lib/skill-news";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

/**
 * Recent tech and AI articles for 1 to 3 skills, for the tips under "Tips and tricks". Our own feed reader
 * (lib/native-scraper.ts) reads a fixed list of public feeds with no key, and the skill's catalog terms pick the articles.
 * The body holds skill names only, checked against the skill catalog. No résumé text, key or cookie is read and no model runs.
 */
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > SKILL_NEWS_MAX_BODY) return Response.json({ error: "That request is too large." }, { status: 413, headers });
  const reply = await answerSkillNews({ bodyText: await request.text(), visitor: visitorKey(request.headers), read: () => fetchTechEntries() });
  return Response.json(reply.body, { status: reply.status, headers });
}

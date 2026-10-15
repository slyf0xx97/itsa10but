import { liveStatus, sharedLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Tells the page what can run: `live` is this site's own key, `ownKey` is a visitor's key. Reasons are fixed text; no key material is ever returned. */
export async function GET() {
  return Response.json(liveStatus(process.env, sharedLimiter()), { headers: { "Cache-Control": "no-store" } });
}

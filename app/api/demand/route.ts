import { edgeFromEnv, edgeGet } from "@/lib/edge-client";
import { cleanTable, mergeTables } from "@/lib/edge/demand";
import fallback from "@/lib/role-demand.json";

export const dynamic = "force-dynamic";

/**
 * The market-demand table: for each tracked role, the share of recent public postings that name each skill. Public data with no visitor input,
 * so it is cached at the edge for an hour. The Worker's live table wins per role when it is newer; the committed file fills the rest.
 */
export async function GET() {
  const edge = edgeFromEnv();
  const live = edge ? await edgeGet<unknown>(edge, "/demand") : null;
  const table = mergeTables(cleanTable(live), cleanTable(fallback));
  return Response.json(table, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}

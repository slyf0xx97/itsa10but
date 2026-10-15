import { mcpToolCatalog } from "./mcp-tools.ts";
import { runSafetyCheck } from "./safety.ts";
import { previewAnalysis } from "./preview-analysis.ts";
import { snapshotForMcp } from "./sg-snapshot.ts";

export const METHOD_LABEL = "keyless retrieval + rules";
// The signals tool reads a fixed snapshot. With refresh it reads published feeds of an allowlist of sites with our own feed reader (no key), and a Firecrawl key adds a search. No model is involved either way.
export const SIGNALS_METHOD_LABEL = "static sourced snapshot, native feed reader for news, optional Firecrawl search, no model";
const PROTOCOL_VERSION = "2025-03-26";
// read_itsa10but_analysis reads the visible browser dashboard, so it stays WebMCP only.
const serverTools = mcpToolCatalog.filter((tool) => tool.name !== "read_itsa10but_analysis");

type JsonRpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } };
export type McpDeps = {
  searchJobs: (query: string) => Promise<object>;
  /** One news refresh under the same key and limit rules as POST /api/signals. Left out where it cannot run. */
  refreshNews?: () => Promise<{ status: number; body: Record<string, unknown> }>;
};

const rpcError = (id: JsonRpcRequest["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const toolResult = (id: JsonRpcRequest["id"], payload: unknown, isError = false) => ({ jsonrpc: "2.0", id: id ?? null, result: { content: [{ type: "text", text: JSON.stringify(payload) }], isError } });

/** Handles one JSON-RPC message. Returns null for notifications, which get no reply. */
export async function handleMcp(message: JsonRpcRequest, deps: McpDeps): Promise<object | null> {
  const { id, method, params } = message ?? {};
  if (message?.jsonrpc !== "2.0" || typeof method !== "string") return rpcError(id, -32600, "Invalid request");
  if (id === undefined) return null;
  if (method === "initialize") return { jsonrpc: "2.0", id, result: { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: { name: "itsa10but", version: "1.0.0" } } };
  if (method === "ping") return { jsonrpc: "2.0", id, result: {} };
  if (method === "tools/list") return { jsonrpc: "2.0", id, result: { tools: serverTools.map(({ name, title, description, inputSchema, readOnlyHint }) => ({ name, title, description, inputSchema, annotations: { readOnlyHint } })) } };
  if (method !== "tools/call") return rpcError(id, -32601, `Method not found: ${method}`);

  const args = params?.arguments ?? {};
  if (params?.name === "search_itsa10but_jobs") {
    const query = typeof args.query === "string" ? args.query.trim() : "";
    if (query.length < 3 || query.length > 50) return toolResult(id, { error: "query must be 3 to 50 characters." }, true);
    return toolResult(id, { method: METHOD_LABEL, ...(await deps.searchJobs(query)) });
  }
  if (params?.name === "get_itsa10but_sg_signals") {
    if (args.refresh !== undefined && typeof args.refresh !== "boolean") return toolResult(id, { error: "refresh must be true or false." }, true);
    const snapshot = { method: SIGNALS_METHOD_LABEL, note: "A dated snapshot with a named source on every figure. Nothing is estimated and no model ran.", ...snapshotForMcp() };
    if (args.refresh !== true) return toolResult(id, { ...snapshot, news: "Set refresh to true to fetch the latest headlines from a fixed list of Singapore sources. No key is needed. A Firecrawl key in the x-firecrawl-key header adds more results." });
    if (!deps.refreshNews) return toolResult(id, { ...snapshot, news: { error: "Live news isn't available here." } });
    const { status, body } = await deps.refreshNews();
    return toolResult(id, { ...snapshot, news: status === 200 ? { ...body, label: "Latest news from a fixed list of Singapore sources. Headlines and snippets are the sources' own words." } : body });
  }
  if (params?.name === "analyse_itsa10but_profile") {
    const texts = args.resumes, job = args.job;
    // Same limits as app/api/analyse/route.ts.
    if (!Array.isArray(texts) || texts.length < 1 || texts.length > 3 || !texts.every((t) => typeof t === "string" && t.trim().length >= 25 && t.length <= 30000) || typeof job !== "string" || job.trim().length < 30 || job.length > 15000) {
      return toolResult(id, { error: "Send 1 to 3 résumé texts (25 to 30,000 characters each) and a job description (30 to 15,000 characters)." }, true);
    }
    const safety = runSafetyCheck(texts.map((text: string, i: number) => ({ id: `mcp-${i + 1}`, name: `Résumé ${i + 1}`, text })), job);
    const analysis = previewAnalysis(safety.maskedResumes, safety.maskedJob);
    return toolResult(id, { method: METHOD_LABEL, note: "Retrieval and text rules, not a Claude run. Scores are text-evidence indexes, not hiring probabilities.", safety: { piiMasked: safety.piiFound, injectionFlags: safety.injectionFlags, stored: false }, analysis });
  }
  return rpcError(id, -32602, `Unknown tool: ${params?.name}`);
}

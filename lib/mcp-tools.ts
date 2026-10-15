export type McpToolSchema = { type: "object"; properties: Record<string, unknown>; required?: string[]; additionalProperties: false };

export type McpToolDescriptor = {
  name: string;
  title: string;
  description: string;
  inputSchema: McpToolSchema;
  readOnlyHint: boolean;
};

/**
 * The canonical description of every WebMCP tool itsa10but registers with
 * `document.modelContext`. The live registration stays in the career
 * workspace component; this list is the shared source of truth an MCP panel
 * can render without re-deriving the tool shapes.
 */
export const mcpToolCatalog: McpToolDescriptor[] = [
  {
    name: "read_itsa10but_analysis",
    title: "Read Itsa10but analysis",
    description: "Read the visible skill map and action path without exposing uploaded résumé text.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
  },
  {
    name: "search_itsa10but_jobs",
    title: "Search current remote jobs",
    description: "Search Himalayas and Jobicy remote roles without accessing résumé text.",
    inputSchema: { type: "object", properties: { query: { type: "string", minLength: 3, maxLength: 50 } }, required: ["query"], additionalProperties: false },
    readOnlyHint: true,
  },
  {
    name: "get_itsa10but_sg_signals",
    title: "Singapore hiring signals",
    description: "Read the dated, sourced snapshot of Singapore tech hiring signals (IMDA, MOM, Indeed, PwC), with IMDA's definition of AI skills and a short list of the latest AI models, research and findings. With refresh set to true it also returns the latest headlines from a fixed list of Singapore news and labour sites, read from their published feeds by our own reader with no key. A Firecrawl key in the x-firecrawl-key header adds search results. No model runs and no figure is estimated.",
    inputSchema: { type: "object", properties: { refresh: { type: "boolean" } }, additionalProperties: false },
    readOnlyHint: true,
  },
  {
    name: "analyse_itsa10but_profile",
    title: "Compare résumés with a role",
    description: "Compare one to three supplied résumé texts with a role and update the visible dashboard. The result includes an ATS-style check of the résumé wording and format, a rule of thumb and not a real employer system.",
    inputSchema: {
      type: "object",
      properties: {
        resumes: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
        job: { type: "string" },
      },
      required: ["resumes", "job"],
      additionalProperties: false,
    },
    readOnlyHint: false,
  },
];

export type McpToolCallRecord = {
  id: string;
  tool: string;
  input: unknown;
  startedAt: string;
  finishedAt?: string;
  ok?: boolean;
  summary?: string;
};

const MAX_LOG_ENTRIES = 20;
let callLog: McpToolCallRecord[] = [];

/** Records the start of a tool call and returns its log entry id. */
export function recordMcpCallStart(tool: string, input: unknown): string {
  const id = `${tool}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  callLog = [{ id, tool, input, startedAt: new Date().toISOString() }, ...callLog].slice(0, MAX_LOG_ENTRIES);
  return id;
}

/** Marks a previously started call as finished, with its outcome. */
export function recordMcpCallEnd(id: string, ok: boolean, summary?: string): void {
  callLog = callLog.map((entry) => (entry.id === id ? { ...entry, finishedAt: new Date().toISOString(), ok, summary } : entry));
}

/** Returns the call log, newest first. */
export function getMcpCallLog(): McpToolCallRecord[] {
  return [...callLog];
}

export function clearMcpCallLog(): void {
  callLog = [];
}

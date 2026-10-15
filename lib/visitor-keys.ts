/**
 * Visitor-supplied API keys. They arrive in request headers only (never the body or URL),
 * live in memory for one request, and are never logged, stored or echoed.
 * The model key is either an Anthropic key or an OpenRouter key, one at a time.
 */
export type VisitorKeys = { anthropic?: string; openrouter?: string; firecrawl?: string };

const SHAPE = /^[A-Za-z0-9_.\-]+$/;
const LIMITS = {
  anthropic: { min: 20, max: 400, label: "Anthropic" },
  openrouter: { min: 20, max: 400, label: "OpenRouter" },
  firecrawl: { min: 8, max: 200, label: "Firecrawl" },
} as const;

export function readVisitorKeys(headers: { get(name: string): string | null }): { ok: true; keys: VisitorKeys } | { ok: false; error: string } {
  const keys: VisitorKeys = {};
  for (const [field, name] of [["anthropic", "x-anthropic-key"], ["openrouter", "x-openrouter-key"], ["firecrawl", "x-firecrawl-key"]] as const) {
    const value = (headers.get(name) ?? "").trim();
    if (!value) continue;
    const { min, max, label } = LIMITS[field];
    // The error is fixed text: the key is never repeated back.
    if (value.length < min || value.length > max || !SHAPE.test(value)) return { ok: false, error: `That ${label} key does not look right. Check it and paste it again.` };
    keys[field] = value;
  }
  if (keys.anthropic && keys.openrouter) return { ok: false, error: "Send one model key at a time." };
  return { ok: true, keys };
}

/** Defence in depth: removes any supplied key from text before it leaves the server. */
export function scrubKeys(text: string, keys: VisitorKeys): string {
  let out = text;
  for (const key of [keys.anthropic, keys.openrouter, keys.firecrawl]) if (key) out = out.split(key).join("[removed]");
  return out;
}

/** The Anthropic SDK sets `status` on its API errors; 401 means the key was refused. */
export const isAuthRejection = (error: unknown) => (error as { status?: unknown } | null)?.status === 401;

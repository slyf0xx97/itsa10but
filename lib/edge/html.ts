/** Pure helpers for the edge Worker: URL guard, HTML to plain text, SGT day buckets. No platform APIs, so Node tests cover them. */

const BLOCK = /<\/(p|div|li|ul|ol|h[1-6]|section|article|header|footer|tr|br)>|<br\s*\/?>/gi;
const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " ", "&apos;": "'" };

/** https only, a real hostname (no IP literal, localhost or internal suffix), no credentials, no odd ports. */
export function publicHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") || /(^|\.)(localhost|local|internal|lan|home|corp)$/.test(host)) return null;
  url.hash = "";
  return url.toString();
}

/** A line that is mostly code or JSON (settings pasted into the page), not prose: long, with many quotes, braces and colons. */
const isDataBlob = (line: string) => line.length > 80 && (line.match(/["{}[\]:\\]/g)?.length ?? 0) / line.length > 0.12;

/** Readable text from a page: scripts, styles and tags dropped, block tags become line breaks, entities decoded, capped. */
export function htmlToText(html: string, max = 6000): string {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "";
  // The page's own main content when it has one, so menus, banners and footers stay out.
  const main = /<(main|article)\b[\s\S]*?<\/\1>/i.exec(html)?.[0];
  const body = (main && main.length > 400 ? main : html)
    .replace(/<(script|style|noscript|svg|nav|footer|form|iframe|head)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(BLOCK, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, (entity) => ENTITIES[entity] ?? " ")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_match, code: string) => { const point = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : parseInt(code, 10); return point > 31 && point < 0x10ffff ? String.fromCodePoint(point) : " "; })
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .split("\n").filter((line) => !isDataBlob(line)).join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const head = title.replace(/\s+/g, " ").trim();
  return (head && !body.startsWith(head) ? `${head}\n\n${body}` : body).slice(0, max);
}

/** The calendar day in Singapore (UTC+8) as YYYY-MM-DD, so daily caps reset at midnight SGT. */
export const sgtDay = (now: number): string => new Date(now + 8 * 3_600_000).toISOString().slice(0, 10);
/** The hour in Singapore as YYYY-MM-DDTHH, for per-visitor hourly buckets. */
export const sgtHour = (now: number): string => new Date(now + 8 * 3_600_000).toISOString().slice(0, 13);

/** A stable short cache key for a query or URL. */
export async function cacheKey(prefix: string, value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase().replace(/\s+/g, " "));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return prefix + ":" + [...new Uint8Array(digest)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

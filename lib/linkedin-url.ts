const LINKEDIN_HOST = /(^|\.)linkedin\.com$/i;
const JOB_ID = /^\d{6,15}$/;

/** Returns the numeric job id when the whole input is one HTTP(S) LinkedIn job URL. */
export function extractLinkedinJobId(input: string): string | null {
  let value = input.trim();
  if (!value) return null;
  // A short paste with the link inside it ("Data Analyst at Acme https://www.linkedin.com/jobs/view/123…") still counts. A long paste is a description, not a link.
  if (/\s/.test(value)) {
    const found = /(?:https?:\/\/)?(?:[\w-]+\.)?linkedin\.com\/[^\s"'<>)]+/i.exec(value);
    if (!found || value.length > 400 || value.length - found[0].length > 150) return null;
    value = found[0];
  }
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value) && /^(?:[\w-]+\.)?linkedin\.com\//i.test(value)) value = "https://" + value;

  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || !LINKEDIN_HOST.test(url.hostname) || url.username || url.password) return null;

  const view = /^(?:\/comm)?\/jobs\/view\/([^/]+)\/?$/i.exec(url.pathname);
  if (view) {
    const id = /(?:^|[-_])(\d{6,15})$/.exec(view[1])?.[1];
    return id && JOB_ID.test(id) ? id : null;
  }

  const isCollection = /^\/jobs\/collections(?:\/|$)/i.test(url.pathname);
  const isSearch = /^\/jobs\/search(?:-results)?\/?$/i.test(url.pathname);
  if (isCollection || isSearch) {
    const id = url.searchParams.get("currentJobId");
    return id && JOB_ID.test(id) ? id : null;
  }

  return null;
}

export function guestPostingUrl(id: string): string {
  if (!JOB_ID.test(id)) throw new Error("Not a LinkedIn job id.");
  return `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`;
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", ndash: "–", mdash: "—", hellip: "…",
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const point = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(point) && point > 0 && point < 0x110000 ? String.fromCodePoint(point) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

function htmlToText(fragment: string): string {
  const withBreaks = fragment
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(?:br|p|\/p|li|\/li)\b[^>]*>/gi, "\n")
    .replace(/<\/(?:div|h[1-6]|ul|ol)>/gi, "\n")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(withBreaks)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
    .join("\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function attribute(tag: string, name: string): string {
  const match = new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i").exec(tag);
  return match?.[2] ?? "";
}

function elementByClass(html: string, className: RegExp): string {
  const openings = /<([a-z][a-z0-9:-]*)\b[^>]*>/gi;
  let opening: RegExpExecArray | null;
  while ((opening = openings.exec(html))) {
    const classes = attribute(opening[0], "class");
    if (!className.test(classes)) continue;

    const tag = opening[1].toLowerCase();
    const tokenPattern = new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi");
    tokenPattern.lastIndex = openings.lastIndex;
    let depth = 1;
    let token: RegExpExecArray | null;
    while ((token = tokenPattern.exec(html))) {
      if (/^<\//.test(token[0])) depth--;
      else if (!/\/\s*>$/.test(token[0])) depth++;
      if (depth === 0) return html.slice(openings.lastIndex, token.index);
    }
  }
  return "";
}

function metaContent(html: string, property: string): string {
  const metas = /<meta\b[^>]*>/gi;
  let meta: RegExpExecArray | null;
  while ((meta = metas.exec(html))) {
    const name = attribute(meta[0], "property") || attribute(meta[0], "name");
    if (name.toLowerCase() === property.toLowerCase()) return htmlToText(attribute(meta[0], "content"));
  }
  return "";
}

/** Pulls title, company, location and description from LinkedIn guest-API HTML. */
export function htmlToJobText(html: string): { title: string; company: string; location: string; description: string } {
  const titleMarkup = elementByClass(html, /(?:^|\s)top-card-layout__title(?:\s|$)/i);
  const title = htmlToText(titleMarkup) || metaContent(html, "og:title");
  const company = htmlToText(elementByClass(html, /(?:^|\s)(?:topcard__org-name-link|top-card-layout__company-name)(?:\s|$)/i));
  const location = htmlToText(elementByClass(html, /(?:^|\s)(?:topcard__flavor--bullet|top-card-layout__location)(?:\s|$)/i));
  const description = htmlToText(elementByClass(html, /(?:^|\s)(?:show-more-less-html__markup|description__text)(?:\s|$)/i));
  return { title, company, location, description };
}

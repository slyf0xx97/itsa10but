import { jobHtml, type JobListing } from "./job-types.ts";
import { runSafetyCheck } from "./safety.ts";

export type PastedJob = JobListing;

/** Local text rules only. Never resolves or fetches a pasted URL. */
export function parseLinkedinPaste(input: string) {
  const safety = runSafetyCheck([], input);
  let applyUrl = "";
  for (const match of input.matchAll(/https:\/\/[^\s<>]+/g)) {
    try {
      const url = new URL(match[0]);
      if ((url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com")) && /^\/jobs\/view\//.test(url.pathname)) {
        url.search = ""; url.hash = ""; applyUrl = url.toString(); break;
      }
    } catch { /* Invalid links are text, never navigation targets. */ }
  }
  const lines = input.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const noise = /^(?:\(?\d+\)?\s*notifications?.*|Home|My Network|Jobs|Messaging|Notifications|Me|For Business|Try Premium.*|Easy Apply|Apply|Save|Share|Show more|Show less|Promoted(?:\s*[·•].*)?|(?:\d+|Over \d+)\s+applicants?.*|.*\bfollowers?\b.*|.*\bago\b.*|See how you compare.*|About the job|Company logo|.* logo)$/i;
  const clean = lines.filter(line => !noise.test(line) && !/^https?:\/\//i.test(line));
  const marker = lines.findIndex(line => /^About the job$/i.test(line));
  const header = marker >= 0 ? lines.slice(0, marker).filter(line => !noise.test(line) && !/^https?:\/\//i.test(line)) : [];
  const workplace = input.match(/\b(on-site|hybrid|remote)\b/i)?.[1].toLowerCase() as JobListing["workplace"] | undefined ?? "unknown";
  const type = input.match(/\b(full-time|part-time|internship|contract|temporary)\b/i)?.[1].toLowerCase() ?? "";
  const locationLine = header.find(line => /\b(Singapore|Worldwide)\b|\s[·•]\s|,/.test(line)) ?? "";
  const location = locationLine.split(/[·•(]/)[0].trim();
  const names = header.filter(line => line !== locationLine && !/^(on-site|hybrid|remote|full-time|part-time|internship|contract|temporary)$/i.test(line));
  const looksLikeRole = (value: string) => /\b(analyst|engineer|developer|designer|scientist|architect|administrator|specialist|associate|intern|manager|consultant|researcher)\b/i.test(value);
  const titleFirst = names.length > 1 && looksLikeRole(names[0]) && !looksLikeRole(names[1]);
  const description = (marker >= 0 ? lines.slice(marker + 1).filter(line => !noise.test(line)) : clean).join("\n");
  const job: PastedJob = { id: "linkedin-paste", source: "LinkedIn paste", companyDomain: "", logoUrl: "", postedAt: null, publishedAt: null, region: location, summary: description.slice(0,240), url: applyUrl, descriptionHtml: jobHtml(description), title: titleFirst ? names[0] : names[1] ?? "", company: titleFirst ? names[1] : names[0] ?? "", location, workplace, type, description, applyUrl };
  return { job, injectionFlags: safety.injectionFlags, needsText: !description, message: !description ? "Link saved. Paste the job text too, because LinkedIn pages aren't fetched." : "Parsed in your browser. Review and correct the fields before checking your fit." };
}

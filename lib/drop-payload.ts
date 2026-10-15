/** What a drag and drop carried, and which zone a dropped file belongs in. Pure, so it runs under node --test. */
export type DropPayload =
  | { kind: "files"; files: File[] }
  | { kind: "link"; url: string }
  | { kind: "text"; text: string }
  | { kind: "none" };

const LINK = /^https?:\/\/[^\s]+$/i;

/** Files win over a link, a link wins over plain text. A uri-list skips its "#" comment lines. */
export function classifyDrop(input: { files: File[]; uriList: string; text: string }): DropPayload {
  if (input.files.length) return { kind: "files", files: input.files };
  const uri = input.uriList.split(/\r?\n/).map((line) => line.trim()).find((line) => line && !line.startsWith("#"));
  if (uri && LINK.test(uri)) return { kind: "link", url: uri };
  const text = input.text.trim();
  if (LINK.test(text)) return { kind: "link", url: text };
  return text ? { kind: "text", text: input.text } : { kind: "none" };
}

const SUPPORTED = /\.(txt|md|pdf)$/i;
const RESUME_WORDS = /(^|[^a-z])(resume|résumé|cv|curriculum[ _-]?vitae)([^a-z]|$)/i;
const JOB_WORDS = /(^|[^a-z])(jd|job[ _-]?(description|posting|ad|listing|spec)|posting|vacancy|role[ _-]?description)([^a-z]|$)/i;

export const looksLikeResume = (name: string) => RESUME_WORDS.test(name);
export const looksLikeJob = (name: string) => JOB_WORDS.test(name) && !RESUME_WORDS.test(name);

export const UNSUPPORTED_FILE = "That file type won't work. Use a PDF, TXT or MD file.";

type Named = { name: string };
export type FilePick<T> = { file?: T; message: string };

function pick<T extends Named>(files: T[], wrong: (name: string) => boolean, wrongMessage: string, one: string): FilePick<T> {
  const supported = files.filter((file) => SUPPORTED.test(file.name));
  if (!supported.length) return { message: UNSUPPORTED_FILE };
  const file = supported.find((item) => !wrong(item.name));
  if (!file) return { message: wrongMessage };
  return { file, message: files.length > 1 ? `Only one ${one} at a time, so ${file.name} was used.` : "" };
}

/** The résumé box takes the first PDF, TXT or MD that doesn't look like a job posting. */
export const pickResumeFile = <T extends Named>(files: T[]) =>
  pick(files, looksLikeJob, "That looks like a job posting. Drop it in the role box instead.", "résumé");

/** The role box takes the first PDF, TXT or MD that doesn't look like a résumé. */
export const pickJobFile = <T extends Named>(files: T[]) =>
  pick(files, looksLikeResume, "That looks like a résumé. Drop it in the résumé box instead.", "job file");

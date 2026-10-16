/**
 * Word forms for catalog terms, so "dashboards", "visualising" and "analyses" count the way "dashboard", "visualization" and "analysis" do.
 * Only plain English words are widened (the list below). Tool and product names stay exact on purpose: "Spark" must not match "sparked interest",
 * and "Java" must not match "javas". Pure and import-free so the edge Worker can use it.
 */
const WIDEN = new Set([
  "dashboard", "report", "test", "endpoint", "wireframe", "prototype", "spreadsheet", "pipeline", "warehouse", "incident",
  "visualisation", "visualization", "analysis", "analytics", "vulnerability", "document", "documentation", "pull request", "user story", "pivot table",
  "api", "stakeholder", "present", "presentation", "unit test", "data pipeline", "data warehouse",
]);

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Spelling and inflection variants of one lowercase word, itself included. */
export function formsOf(word: string): string[] {
  const out = new Set<string>([word]);
  if (/ysis$/.test(word)) out.add(word.replace(/ysis$/, "yses"));
  if (/y$/.test(word) && word.length > 4) { out.add(word.slice(0, -1) + "ies"); out.add(word.slice(0, -1) + "ied"); }
  if (/(?:ion|ics)$/.test(word)) out.add(word + "s");
  else if (/(?:s|x|ch|sh)$/.test(word)) out.add(word + "es");
  else if (!/y$/.test(word)) out.add(word + "s");
  if (/^[a-z]+$/.test(word) && word.length >= 4 && !/(?:ion|ics|ysis|y)$/.test(word)) { out.add(word + "ing"); out.add(word + "ed"); }
  // British and American spelling: visualisation and visualization, analyse and analyze.
  for (const form of [...out]) {
    if (/iz(?=[aeio])/.test(form)) out.add(form.replace(/iz(?=[aeio])/g, "is"));
    if (/is(?=ation|ing|ed|e\b)/.test(form)) out.add(form.replace(/is(?=ation|ing|ed|e\b)/g, "iz"));
  }
  return [...out];
}

/** A regex source for a term: whole-word match, with the last word widened when it is on the list. */
export function termSource(term: string): string {
  const lower = term.toLowerCase();
  const space = lower.lastIndexOf(" ");
  const head = space >= 0 ? lower.slice(0, space + 1) : "";
  const last = space >= 0 ? lower.slice(space + 1) : lower;
  const widen = WIDEN.has(lower) || WIDEN.has(last);
  const body = widen ? `(?:${formsOf(last).map(escape).join("|")})` : escape(last);
  // A lone "*" in a term stands for exactly one word ("analysed * data" matches "analysed customer data").
  return escape(head).replace(/\\\*/g, "[a-z]+") + body;
}

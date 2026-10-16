import { catalog } from "./preview-analysis.ts";
import type { PixelIconName } from "../components/career/pixel-icons.tsx";

export const LOGO_CAPTION = "Logos show common example tools. They don't mean you've used them.";

export type SkillArt = {
  /** Devicon filenames in public/tool-logos; empty means draw `icon` instead. */
  logos: string[];
  /** Drawn fallback, always set. */
  icon: PixelIconName;
};

const art = (logos: string[], icon: PixelIconName): SkillArt => ({ logos, icon });

/** Rules for a skill name that is not in the catalogue (a live run names its own skills): the first one whose words appear picks a drawn icon. Nothing falls back to a star. */
const ICON_RULES: [words: string[], icon: PixelIconName][] = [
  [["sql", "database", "data ", "analytics", "excel", "spreadsheet", "tableau", "power bi", "etl", "pipeline"], "data"],
  [["dashboard", "visuali", "metrics", "kpi"], "dashboard"],
  [["machine learning", "deep learning", "ai ", " ai", "model", "nlp", "llm", "statistic"], "ml"],
  [["cloud", "aws", "azure", "gcp", "devops", "docker", "kubernetes", "infrastructure", "deploy"], "cloud"],
  [["network", "tcp", "dns", "firewall"], "network"],
  [["siem", "security", "soc ", "threat", "monitor", "splunk"], "siem"],
  [["incident", "response", "forensic", "risk"], "incident"],
  [["test", "qa", "quality"], "testing"],
  [["report", "writing", "documentation", "document"], "report"],
  [["communicat", "stakeholder", "present", "collaborat", "team", "leadership", "customer", "client"], "communication"],
  [["api", "python", "java", "script", "code", "coding", "programming", "software", "engineering", "react", "node", "git", "backend", "frontend"], "api"],
  [["research", "problem", "analy"], "search"],
];

/** A drawn icon for any skill name; "compass" when no rule fits. */
export function iconFor(name: string): PixelIconName {
  const text = ` ${name.trim().toLowerCase()} `;
  return ICON_RULES.find(([words]) => words.some((word) => text.includes(word)))?.[1] ?? "compass";
}

const byName: Record<string, SkillArt> = {
  python: art(["python-original.svg"], "api"),
  javascript: art(["javascript-original.svg"], "api"),
  react: art(["react-original.svg"], "api"),
  apis: art([], "api"),
  testing: art(["jest-plain.svg"], "testing"),
  sql: art(["postgresql-original.svg"], "data"),
  "data analysis": art(["pandas-original.svg"], "data"),
  dashboards: art([], "dashboard"),
  "machine learning": art(["scikitlearn-original.svg"], "ml"),
  "deep learning": art([], "ml"),
  mlops: art(["docker-original.svg"], "cloud"),
  networking: art([], "network"),
  linux: art(["linux-original.svg"], "gear"),
  siem: art([], "siem"),
  "incident response": art([], "incident"),
  cloud: art(["amazonwebservices-original-wordmark.svg", "azure-original.svg", "googlecloud-original.svg"], "cloud"),
  communication: art([], "communication"),
  reporting: art([], "report"),
};

// Pasted live-mode names match only when they are literally the product.
const products: Record<string, string> = {
  typescript: "typescript-original.svg",
  docker: "docker-original.svg",
  git: "git-original.svg",
  kubernetes: "kubernetes-original.svg",
};

export type SkillLink = {
  url: string;
  /** "official": the site of the named product itself. "reference": an example tool or a neutral explainer, shown as "Learn more". */
  kind: "official" | "reference";
};
const official = (url: string): SkillLink => ({ url, kind: "official" });
const reference = (url: string): SkillLink => ({ url, kind: "reference" });

// Static, hard-coded https links. Never built from model or user text.
const links: Record<string, SkillLink> = {
  python: official("https://www.python.org/"),
  react: official("https://react.dev/"),
  linux: official("https://www.kernel.org/"),
  typescript: official("https://www.typescriptlang.org/"),
  docker: official("https://www.docker.com/"),
  kubernetes: official("https://kubernetes.io/"),
  // JavaScript has no single official site, and these skills are only named after an example tool.
  javascript: reference("https://developer.mozilla.org/en-US/docs/Web/JavaScript"),
  sql: reference("https://www.postgresql.org/"),
  cloud: reference("https://aws.amazon.com/"),
  git: reference("https://github.com/"),
  testing: reference("https://jestjs.io/"),
  "data analysis": reference("https://pandas.pydata.org/"),
  "machine learning": reference("https://scikit-learn.org/"),
  "deep learning": reference("https://pytorch.org/"),
  mlops: reference("https://ml-ops.org/"),
  // Concepts with no product: one neutral explainer each.
  apis: reference("https://developer.mozilla.org/en-US/docs/Web/API"),
  networking: reference("https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/How_does_the_Internet_work"),
  siem: reference("https://csrc.nist.gov/glossary/term/security_information_and_event_management"),
  "incident response": reference("https://csrc.nist.gov/pubs/sp/800/61/r2/final"),
  dashboards: reference("https://www.nngroup.com/articles/dashboards-preattentive/"),
  communication: reference("https://developers.google.com/tech-writing"),
  reporting: reference("https://www.plainlanguage.gov/"),
};

/** Link for a skill name, or null for anything outside the fixed list (including model-supplied names). */
export function officialUrl(name: string): SkillLink | null {
  const key = name.trim().toLowerCase();
  return Object.hasOwn(links, key) ? links[key] : null;
}

/** `exists` lets the caller drop logos whose file is missing; the default trusts the mapping. */
export function skillArt(name: string, exists: (file: string) => boolean = () => true): SkillArt {
  const key = name.trim().toLowerCase();
  const inCatalogue = catalog.some((skill) => skill.name.toLowerCase() === key);
  const found = (inCatalogue && byName[key]) || (products[key] ? art([products[key]], iconFor(key)) : art([], iconFor(key)));
  // All or nothing: a partial logo set would misstate the example.
  return { ...found, logos: found.logos.every(exists) ? found.logos : [] };
}

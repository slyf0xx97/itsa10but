import { elevateGroups } from "./level-up-resources.ts";
import { officialUrl } from "./skill-art.ts";

/**
 * Where a skill's "learn this" button goes. If Stage 4 (Level up) has a resource for it, the page scrolls there and opens that card.
 * If not, the button opens an outside page in a new tab: the skill's own site when we know it, else a search for a free beginner course.
 * Every rule below names a resource id that exists in lib/level-up-resources.ts (a test checks this).
 */
export type LearnTarget =
  | { kind: "level-up"; resourceId: string; resourceName: string; groupIndex: number }
  | { kind: "external"; url: string };

const RULES: [words: string[], resourceId: string][] = [
  [["sql", "database", "postgres", "mysql"], "sqlbolt"],
  [["deep learning", "neural", "pytorch", "tensorflow"], "deeplearning-ai"],
  [["machine learning", "mlops", "scikit", "model"], "ml-crash-course"],
  [["python"], "python-tutorial"],
  [["javascript", "typescript", "react", "html", "css", "frontend", "front-end", "web"], "mdn-learn"],
  [["aws", "amazon web"], "aws-skill-builder"],
  [["azure"], "azure-fundamentals"],
  [["cloud", "devops", "docker", "kubernetes"], "cloud-resume-challenge"],
  [["linux", "shell", "bash", "command line"], "linux-intro"],
  [["siem", "soc ", "security", "threat", "incident", "forensic", "malware"], "tryhackme"],
  [["network", "tcp", "dns"], "networkchuck"],
  [["git", "github", "version control"], "github-skills"],
  [["data analysis", "pandas", "excel", "analytics", "statistic", "tableau", "dashboard", "visuali"], "kaggle-learn"],
  [["communicat", "writing", "documentation", "report", "present", "stakeholder"], "technical-writing"],
  [["interview"], "interviewing-io"],
  [["algorithm", "data structure", "coding", "programming", "problem solving"], "neetcode"],
];

const STAND_IN: Record<string, string> = { networkchuck: "yt-networkchuck" };

/** The Level up resource for a skill name, if there is one. */
function resourceFor(name: string): { id: string; name: string; groupIndex: number } | null {
  const text = ` ${name.trim().toLowerCase()} `;
  const hit = RULES.find(([words]) => words.some((word) => text.includes(word)));
  if (!hit) return null;
  const id = STAND_IN[hit[1]] ?? hit[1];
  for (const [groupIndex, group] of elevateGroups.entries()) {
    const resource = group.resources.find((item) => item.id === id);
    if (resource) return { id, name: resource.name, groupIndex };
  }
  return null;
}

/** An https search for a free beginner course on the skill. Built from the skill name only after it is encoded, so nothing in it can change the address. */
export const courseSearchUrl = (name: string): string => `https://www.google.com/search?q=${encodeURIComponent(`learn ${name.trim().slice(0, 60)} free beginner course`)}`;

export function learnTarget(name: string): LearnTarget {
  const resource = resourceFor(name);
  if (resource) return { kind: "level-up", resourceId: resource.id, resourceName: resource.name, groupIndex: resource.groupIndex };
  const link = officialUrl(name);
  return { kind: "external", url: link ? link.url : courseSearchUrl(name) };
}

/** The window event the Level up section listens for. */
export const LEARN_EVENT = "itsa10but:learn";
export type LearnDetail = { resourceId: string; groupIndex: number };

import { termSource } from "./word-forms.ts";
/** The skill seed list and the whole-word matcher. Pure (it needs only word-forms.ts), so the edge Worker can use them without the scoring code. */
export type SkillSeed = { name: string; terms: string[]; tip: string; proof: string };
export const catalog: SkillSeed[] = [
  { name: "Python", terms: ["python", "pandas", "numpy", "django", "flask", "fastapi", "jupyter"], tip: "Build a small Python workflow that solves a real task.", proof: "Public repository and short write-up" },
  { name: "SQL", terms: ["sql", "postgres", "postgresql", "mysql", "sqlite", "bigquery", "t-sql", "pl/sql", "relational database"], tip: "Answer a real question using a small relational dataset.", proof: "Queries and findings" },
  { name: "Data analysis", terms: ["data analysis", "analytics", "data analyst", "exploratory", "data analytics", "business intelligence", "data cleaning", "data cleansing", "analysed data", "analyzed data", "analysing data", "analyzing data", "analyse data", "analyze data", "analysed * data", "analyzed * data", "analysing * data", "analyzing * data", "analyse * data", "analyze * data"], tip: "Analyse a public dataset and explain three findings.", proof: "Notebook and one-page insight brief" },
  { name: "Dashboards", terms: ["dashboard", "tableau", "power bi", "visualisation", "visualization", "looker", "metabase", "grafana", "data visualization"], tip: "Build a dashboard with a clear decision it supports.", proof: "Dashboard link and design notes" },
  { name: "Machine learning", terms: ["machine learning", "model training", "scikit", "prediction", "xgboost", "random forest", "feature engineering", "trained a * model", "trained the * model", "trained * models", "classifier", "classifiers", "predictive model", "predictive models", "supervised learning", "unsupervised learning", "ml model", "ml models"], tip: "Train and evaluate a baseline model on a public dataset.", proof: "Model card and evaluation notebook" },
  { name: "Deep learning", terms: ["deep learning", "pytorch", "tensorflow", "keras", "neural network", "neural networks", "llm", "large language model", "computer vision"], tip: "Train a small neural network on a public dataset and compare it with a simple baseline.", proof: "Notebook with training curves and a short write-up" },
  { name: "MLOps", terms: ["mlops", "mlflow", "model deployment", "model serving", "kubeflow", "model monitoring", "containerised the model", "containerized the model", "served the model", "served a model", "deployed the model", "deployed a model", "deployed models", "deploying models", "deploy models"], tip: "Package a trained model in a container and serve it through a small API.", proof: "Container file, API link and README" },
  { name: "Communication", terms: ["communication", "stakeholder", "present", "presentation", "storytelling", "plain language", "explain findings", "explained findings", "explain results", "explained results", "explain * findings", "explained * findings", "explaining * findings"], tip: "Present a technical finding to a nontechnical audience.", proof: "Slides and recorded explanation" },
  { name: "JavaScript", terms: ["javascript", "typescript", "node.js", "nodejs", "vue", "angular", "ecmascript"], tip: "Ship a small web feature with clear user value.", proof: "Deployed feature and code link" },
  { name: "React", terms: ["react", "next.js", "frontend", "reactjs", "react.js", "redux"], tip: "Build one accessible interface from a short brief.", proof: "Live demo and repository" },
  { name: "APIs", terms: ["api", "rest", "graphql", "endpoint", "restful", "openapi", "web service"], tip: "Integrate an API and handle empty and error states.", proof: "Working integration and README" },
  { name: "Testing", terms: ["testing", "unit test", "integration test", "qa", "pytest", "jest", "selenium", "cypress", "playwright", "test automation"], tip: "Add meaningful tests around a real feature.", proof: "Passing test run and coverage notes" },
  { name: "Networking", terms: ["networking", "network", "tcp", "wireshark", "dns", "dhcp", "firewall", "vpn", "cisco", "ccna"], tip: "Map traffic in a safe lab and explain what happened.", proof: "Annotated packet capture and write-up" },
  { name: "Linux", terms: ["linux", "bash", "shell", "ubuntu", "debian", "command line"], tip: "Automate a repeatable Linux administration task.", proof: "Script and runbook" },
  { name: "SIEM", terms: ["siem", "splunk", "sentinel", "elastic security", "qradar", "log analysis", "security monitoring"], tip: "Investigate a safe simulated alert in a SIEM lab.", proof: "Alert timeline and annotated screenshots" },
  { name: "Incident response", terms: ["incident", "triage", "soc", "security operations", "threat hunting", "digital forensics", "blue team"], tip: "Work through a simulated incident from alert to closure.", proof: "Incident report with timeline" },
  { name: "Cloud", terms: ["aws", "azure", "gcp", "cloud", "amazon web services", "google cloud", "ec2", "terraform", "docker", "kubernetes", "k8s", "helm"], tip: "Deploy a small service with basic access controls.", proof: "Architecture diagram and deployment notes" },
  { name: "Reporting", terms: ["report", "documentation", "write-up", "report writing", "technical writing"], tip: "Write a concise report from one technical project.", proof: "One-page report with evidence links" },
  { name: "Excel", terms: ["microsoft excel", "ms excel", "excel spreadsheet", "pivot table", "vlookup", "xlookup", "google sheets", "spreadsheet", "excel"], tip: "Turn a messy sheet into a clean model with a pivot table and a chart.", proof: "Workbook with a short note on what it answers" },
  { name: "Git", terms: ["git", "github", "gitlab", "version control", "pull request", "ci/cd"], tip: "Keep one project in Git with small commits and a pull request.", proof: "Repository link with a readable history" },
  { name: "Java", terms: ["java", "spring boot", "spring framework", "kotlin", "jvm", "maven", "gradle"], tip: "Build a small Java command line or Spring Boot service with tests.", proof: "Repository with a README and passing tests" },
  { name: "Data engineering", terms: ["data engineering", "data engineer", "etl", "elt", "data pipeline", "data warehouse", "airflow", "dbt", "spark"], tip: "Build a small pipeline that loads, cleans and stores a public dataset.", proof: "Pipeline repository and a diagram of the steps" },
  { name: "Statistics", terms: ["statistics", "statistical", "hypothesis test", "hypothesis testing", "regression analysis", "a/b test", "confidence interval", "probability"], tip: "Test one question on real data and explain the result in plain words.", proof: "Notebook with the method, the result and its limits" },
  { name: "UX design", terms: ["ux design", "ui/ux", "ux research", "user research", "usability", "wireframe", "wireframes", "figma", "prototype"], tip: "Redesign one screen after watching three people use it.", proof: "Before and after screens with what you learned" },
  { name: "Agile", terms: ["agile", "scrum", "kanban", "sprint planning", "product backlog", "user stories", "jira"], tip: "Run a short sprint on a team project with a visible board.", proof: "Board screenshot and a short retrospective" },
  { name: "Security fundamentals", terms: ["cybersecurity", "cyber security", "information security", "owasp", "vulnerability", "penetration testing", "encryption", "iso 27001"], tip: "Find and fix three common web flaws in a practice app.", proof: "Short write-up of each flaw and its fix" },
];

/**
 * Phrases that look like a skill word but are not one. Each match is blanked to spaces of the same length (so positions stay put) before any term is
 * looked for: "reacts to alerts" is not React, "2022 to present" is not Communication, "the rest of the team" is not REST, and "professional networking" is not Networking.
 */
const SCRUBS: RegExp[] = [
  /\breact\s+(?:to|on|quickly|fast|promptly|swiftly|calmly|well|positively|professionally|effectively|constructively|when|if|appropriately|accordingly)\b/gi,
  /(?:\b(?:at|until|till|the)\s+|[-–—]\s*|\b(?:19|20)\d\d\s+to\s+)present\b|\bpresent\s+(?:day|time|role|position|employer|company|date|moment)\b/gi,
  /\b(?:the\s+)?rest\s+of\b|\bthe\s+rest\b|\brest\s+(?:assured|day|room|area)\b/gi,
  /\b(?:professional|business|personal|social|alumni|industry)\s+network(?:s|ing)?\b/gi,
  /\b(?:bug|ticket|issue|support|defect|customer)\s+triage\b/gi,
  /\b(?:report|reports|reported|reporting)\s+(?:to|directly|into)\b/gi,
  /\bexcel\s+(?:in|at|as|under|when)\b|\b(?:to|will|can|could|would|should|must|able to|ability to)\s+excel\b/gi,
];

let lastText = "";
let lastScrubbed = "";
/** The text with the phrases above blanked out. The last answer is kept, because one text is checked against many terms in a row. */
export function scrub(text: string): string {
  if (text === lastText) return lastScrubbed;
  lastText = text;
  lastScrubbed = SCRUBS.reduce((current, rule) => current.replace(rule, (hit) => " ".repeat(hit.length)), text);
  return lastScrubbed;
}

const regexes = new Map<string, RegExp>();
/** The whole-word, case-insensitive matcher for one term, with plain words widened to their plural, -ing, -ed and spelling variants. */
export function termRegex(term: string): RegExp {
  let regex = regexes.get(term);
  if (!regex) regexes.set(term, (regex = new RegExp(`(?:^|[^a-z0-9])${termSource(term)}(?=$|[^a-z0-9])`, "i")));
  return regex;
}

export const hasTerm = (text: string, term: string) => termRegex(term).test(scrub(text));

/** The words of `text` that a term matched, lowercased, as written there: "dashboards" for "dashboard", "analysed customer data" for "analysed * data". */
export function foundWord(text: string, term: string): string {
  const hit = termRegex(term).exec(scrub(text));
  if (!hit) return term;
  const lead = /^[a-z0-9]/i.test(hit[0]) ? 0 : 1; // the match may begin with the one boundary character before the word
  return text.slice(hit.index + lead, hit.index + hit[0].length).toLowerCase();
}

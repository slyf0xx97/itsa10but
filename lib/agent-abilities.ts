import type { ReaderName } from "./simulated-engine.ts";

/**
 * What each reader can do, as plain data for the reader stepper.
 * Live abilities use the tool names in lib/agents/*.ts (and docs/agents.md); their lane id is the tool name.
 * Rules abilities are the text-rules steps; their id is the lane id the rules engine reports.
 * Nothing here is a claim the runners do not back: rules mode has no web and no model.
 */
export type Mode = "rules" | "live";
export type AbilityKind = "web" | "local" | "rules";
export type Ability = { id: string; label: string; kind: AbilityKind; description: string; tool?: string; /** File in public/assets/icons/abilities/. */ iconFile: string };
export type AgentLane = { id: string; label: string; mode: Mode };
export type AgentProfile = {
  name: ReaderName;
  job: string;
  abilities: Ability[];
  lanes: AgentLane[];
};

const web = (tool: string, label: string, description: string, iconFile: string): Ability => ({ id: tool, tool, label, kind: "web", description, iconFile });
const local = (tool: string, label: string, description: string, iconFile: string): Ability => ({ id: tool, tool, label, kind: "local", description, iconFile });
const rules = (id: string, label: string, description: string, iconFile: string): Ability => ({ id, label, kind: "rules", description, iconFile });
const lane = (id: string, label: string, mode: Mode): AgentLane => ({ id, label, mode });

const searchPassages = local("search_resume_passages", "Résumé search", "Looks through snippets of your résumé with personal details masked. No web.", "search-passages.svg");

export const AGENT_PROFILES: Record<ReaderName, AgentProfile> = {
  "Role Scout": {
    name: "Role Scout",
    job: "Reads the job posting and lists the skills it asks for.",
    abilities: [
      web("firecrawl_search", "Web search", "Searches the web for what this kind of role needs and for the employer's published values.", "web-search.svg"),
      web("firecrawl_scrape", "Page reader", "Opens a page its own search found. It can't open any other link.", "read-page.svg"),
      web("read_linkedin_posting", "LinkedIn posting", "Reads the public posting for a LinkedIn link you gave.", "linkedin.svg"),
      rules("role-read", "Read role text", "Reads the role text you pasted, with personal details masked.", "read-role.svg"),
      rules("role-terms", "Match skill terms", "Looks for known skill terms in the role text.", "match-terms.svg"),
      rules("role-rank", "Rank demand", "Orders skills by how often and how firmly the role asks.", "rank-demand.svg"),
      rules("company-detect", "Company check", "Looks for a known employer in the posting and shows its published values.", "read-role.svg"),
    ],
    lanes: [
      lane("role-read", "Reading the role text", "rules"),
      lane("role-terms", "Matching skill terms", "rules"),
      lane("role-rank", "Ranking what the role asks for", "rules"),
      lane("company-detect", "Checking for the company's values", "rules"),
      lane("read_linkedin_posting", "Reading the LinkedIn posting", "live"),
      lane("firecrawl_search", "Searching the web", "live"),
      lane("firecrawl_scrape", "Reading a web page", "live"),
    ],
  },
  "Experience Finder": {
    name: "Experience Finder",
    job: "Looks in your résumé for proof of each skill, scores it and flags weak proof.",
    abilities: [
      searchPassages,
      rules("resume-search", "Search snippets", "Searches your résumé for each skill's terms.", "search-passages.svg"),
      rules("quote-verify", "Verify quotes", "Checks that each quote appears word for word in your résumé.", "verify-quotes.svg"),
      rules("evidence-score", "Score evidence", "Scores each skill from its checked snippet.", "score-evidence.svg"),
      rules("doubt-flag", "Flag weak proof", "Flags skills where proof is well below what the role asks.", "flag-proof.svg"),
    ],
    lanes: [
      lane("resume-search", "Searching snippets for each skill", "rules"),
      lane("quote-verify", "Checking each quote is literal", "rules"),
      lane("evidence-score", "Scoring the evidence", "rules"),
      lane("doubt-flag", "Flagging weak proof", "rules"),
      lane("search_resume_passages", "Searching your résumé", "live"),
    ],
  },
  Recruiter: {
    name: "Recruiter",
    job: "Checks your résumé the way hiring software (ATS) would, then points out what to fix in wording and format.",
    abilities: [
      rules("ats-parse", "Parse check", "Checks that contact details, headings and dates can be read.", "split-resume.svg"),
      rules("ats-keywords", "Keyword match", "Looks for the role's skill words in your text.", "match-terms.svg"),
      rules("ats-wording", "Wording check", "Looks for action verbs, numbers and filler phrases.", "rank-demand.svg"),
      rules("ats-format", "Format check", "Looks for columns, odd symbols, long bullets and length.", "flag-proof.svg"),
    ],
    lanes: [
      lane("ats-parse", "Checking the résumé can be parsed", "rules"),
      lane("ats-keywords", "Matching the role's keywords", "rules"),
      lane("ats-wording", "Checking the wording", "rules"),
      lane("ats-format", "Checking the format", "rules"),
    ],
  },
  "Action Planner": {
    name: "Action Planner",
    job: "Turns your biggest gap into one project you can show.",
    abilities: [
      web("firecrawl_search", "Web search", "Searches for a learning link. Sees skill names and numbers, never your résumé.", "web-search.svg"),
      rules("gap-rank", "Rank gaps", "Orders skills by what the role asks minus what your résumé shows.", "rank-gaps.svg"),
      rules("quest-match", "Match tips", "Pairs each real gap with a short tip.", "match-quests.svg"),
      rules("match-formula", "Work out the match", "Weights each skill by how much the role asks to get the overall percentage.", "rank-demand.svg"),
    ],
    lanes: [
      lane("gap-rank", "Ranking the gaps", "rules"),
      lane("quest-match", "Matching tips to gaps", "rules"),
      lane("match-formula", "Working out the match", "rules"),
      lane("firecrawl_search", "Searching for a learning link", "live"),
    ],
  },
};

const wanted = (kind: AbilityKind, mode: Mode) => (mode === "rules" ? kind === "rules" : kind !== "rules");

export const abilitiesFor = (name: ReaderName, mode: Mode) => AGENT_PROFILES[name].abilities.filter((item) => wanted(item.kind, mode));
export const lanesFor = (name: ReaderName, mode: Mode) => AGENT_PROFILES[name].lanes.filter((item) => item.mode === mode);
export const laneLabel = (name: ReaderName, id: string) => AGENT_PROFILES[name].lanes.find((item) => item.id === id)?.label ?? id;

import type { ReaderName } from "./simulated-engine.ts";

/**
 * What the Stage 2 reader cards show about each API boost agent.
 * A static copy of lib/agents/*.ts (tools, limits) so the browser bundle does not import the server-side specs.
 * It holds no model ids: the visitor picks the model, so the UI never names one per agent. lib/agent-facts.test.ts fails if it drifts from AGENT_SPECS.
 * Plain-language "sees", "returns", the card type, tagline, moves, strong-at and can't lines follow docs/agents.md.
 */
export type AgentFact = {
  name: ReaderName;
  /** Short badge on the card ribbon. */
  type: string;
  /** One line split in three so the middle part can be highlighted: before, key phrase, after. */
  tagline: [string, string, string];
  /** The three moves on the card face: a pixel icon file in public/assets/icons/abilities/, a 2 to 4 word label and a short line (6 words at most). Same names in native scan and API boost. */
  moves: { icon: string; label: string; detail: string }[];
  /** API boost tools, shown only in the card's details: name, its own call cap (left out when it equals the total budget) and a 2 to 5 word label. */
  tools: { name: string; cap?: number; label: string }[];
  /** Whether the agent gets to read the masked résumé text, through a tool or directly (shown as the Résumé access pip). */
  resumeAccess: boolean;
  sees: string;
  returns: string;
  /** What it does best, from what it returns. */
  strongAt: string;
  /** What it cannot do, from the tools and inputs it is not given. */
  cant: string;
  /** Tool calls across the whole run. */
  toolCalls: number;
  /** Time limit in seconds. */
  seconds: number;
};

/** The tools that reach the public web. The other tools only read the masked text. */
export const WEB_TOOLS = ["read_linkedin_posting", "firecrawl_search", "firecrawl_scrape"];

export const hasWeb = (fact: AgentFact) => fact.tools.some((tool) => WEB_TOOLS.includes(tool.name));
export const readsResume = (fact: AgentFact) => fact.tools.some((tool) => tool.name === "search_resume_passages");

export const AGENT_FACTS: AgentFact[] = [
  {
    name: "Role Scout",
    type: "WEB SCOUT",
    tagline: ["Reads the ", "job posting", " and pulls out the skills"],
    moves: [
      { icon: "read-role.svg", label: "Read the posting", detail: "Lists what the role asks" },
      { icon: "web-search.svg", label: "Search the web", detail: "Adds a market note" },
      { icon: "rank-demand.svg", label: "Rank the skills", detail: "Most asked-for skills first" },
    ],
    tools: [
      { name: "read_linkedin_posting", cap: 1, label: "Read the LinkedIn post" },
      { name: "firecrawl_search", cap: 1, label: "Search the web" },
      { name: "firecrawl_scrape", cap: 1, label: "Open a found page" },
    ],
    resumeAccess: false,
    sees: "The role text with personal details masked. Never your résumé.",
    returns: "The job title, 3 to 8 skills with how much each is asked for and a role quote, and a market note.",
    strongAt: "Ranking skills by how much the role asks, with quotes",
    cant: "Can't see your résumé",
    toolCalls: 4,
    seconds: 40,
  },
  {
    name: "Experience Finder",
    type: "RÉSUMÉ FINDER",
    tagline: ["Hunts your ", "résumé", " for proof of each skill"],
    moves: [
      { icon: "search-passages.svg", label: "Search your résumé", detail: "Finds the line behind each skill" },
      { icon: "score-evidence.svg", label: "Score each proof", detail: "Rates how strong it is" },
      { icon: "flag-proof.svg", label: "Flag weak proof", detail: "Marks claims that need more" },
    ],
    tools: [{ name: "search_resume_passages", label: "Search your résumé" }],
    resumeAccess: true,
    sees: "The Scout's skills and the résumé lines picked for each one. It can search for more.",
    returns: "For each skill, a proof score and a résumé quote. Also weak-proof flags and the \"but\" line.",
    strongAt: "Scoring proof and flagging weak proof",
    cant: "Can't use the web",
    toolCalls: 1,
    seconds: 45,
  },
  {
    name: "Recruiter",
    type: "SCREENING",
    tagline: ["Checks your résumé the way ", "hiring software (ATS)", " would"],
    moves: [
      { icon: "read-page.svg", label: "Read your file", detail: "Can software read the text?" },
      { icon: "match-terms.svg", label: "Match role keywords", detail: "Are the role's words in yours?" },
      { icon: "pick-passage.svg", label: "Fix wording and format", detail: "Top fixes to make first" },
    ],
    tools: [],
    resumeAccess: true,
    sees: "The role's skill names and your whole résumé with personal details masked. Not the Finder's notes.",
    returns: "Checks marked passed, to check or to fix, the keywords found and missing, and the top three fixes.",
    strongAt: "Catching wording, keyword and format problems",
    cant: "Can't use the web or see the Finder's résumé notes",
    toolCalls: 0,
    seconds: 35,
  },
  {
    name: "Action Planner",
    type: "PLANNER",
    tagline: ["Turns your gaps into ", "practical tips and tricks", " to work on"],
    moves: [
      { icon: "rank-gaps.svg", label: "Find the biggest gap", detail: "Where proof falls short" },
      { icon: "web-search.svg", label: "Search for courses", detail: "Finds a link to learn from" },
      { icon: "match-quests.svg", label: "Pick practical tips", detail: "Short tips you can act on" },
    ],
    tools: [{ name: "firecrawl_search", label: "Search the web" }],
    resumeAccess: false,
    sees: "The role title and your gaps as numbers. Never your résumé text.",
    returns: "Verdict and four to six tips, each with an optional link.",
    strongAt: "Turning a gap into a project you can show",
    cant: "Sees only numbers, never your résumé text",
    toolCalls: 1,
    seconds: 25,
  },
];

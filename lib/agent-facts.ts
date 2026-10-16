import type { ReaderName } from "./simulated-engine.ts";

/**
 * What the Stage 2 reader cards show about each API boost agent.
 * A static copy of lib/agents/*.ts (tools, limits) so the browser bundle does not import the server-side specs.
 * It holds no model ids: the visitor picks the model, so the UI never names one per agent. lib/agent-facts.test.ts fails if it drifts from AGENT_SPECS.
 * Plain-language summary, in and out chips, does-well and can't lists, the card type, tagline and moves follow docs/agents.md.
 */
/** One chip in the popup flow: an icon file in public/assets/icons/abilities/, a 1 to 5 word label, and whether it only happens in API boost. */
export type FlowItem = { icon: string; label: string; boost?: true };

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
  /** One plain line: what the reader does and why it matters to the visitor. */
  summary: string;
  /** What it looks at, as chips. Also read by the How it works tooltip. */
  sees: string;
  looksAt: FlowItem[];
  /** What it gives back, as chips. */
  gives: FlowItem[];
  /** What it does well: short items, each a card with a tick. */
  does: string[];
  /** What it cannot do, from the tools and inputs it is not given: short items, each a card with a cross. */
  cannot: string[];
  /** Short extra facts: what it never sees, what its score means. */
  goodToKnow: string[];
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
    summary: "Reads the job post and lists the skills it asks for, so the other readers know what to look for.",
    sees: "The role text with personal details masked. Never your résumé.",
    looksAt: [
      { icon: "read-role.svg", label: "The role text (masked)" },
      { icon: "web-search.svg", label: "Company pages on the web", boost: true },
    ],
    gives: [
      { icon: "rank-demand.svg", label: "A ranked list of skills" },
      { icon: "verify-quotes.svg", label: "A role quote for each skill" },
      { icon: "web-search.svg", label: "A short market note", boost: true },
    ],
    does: ["Ranks skills by how much the role asks", "Backs each skill with a quote from the role text"],
    cannot: ["See your résumé", "Say how well you match"],
    goodToKnow: ["It never sees your résumé."],
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
    summary: "Searches your résumé for proof of each skill and scores how strong that proof is.",
    sees: "The Scout's skills and the résumé lines picked for each one. It can search for more.",
    looksAt: [
      { icon: "rank-demand.svg", label: "The Scout's skill list" },
      { icon: "search-passages.svg", label: "Résumé lines (masked)" },
    ],
    gives: [
      { icon: "score-evidence.svg", label: "A proof score for each skill" },
      { icon: "verify-quotes.svg", label: "A résumé quote for each skill" },
      { icon: "flag-proof.svg", label: "Flags on weak proof" },
    ],
    does: ["Scores how strong your proof is", "Flags claims that need more proof"],
    cannot: ["Use the web"],
    goodToKnow: ["It starts with the lines picked for each skill.", "In API boost it can search for more."],
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
    summary: "Checks your résumé the way hiring software (ATS) would, then lists the fixes to make first.",
    sees: "The role's skill names and your whole résumé with personal details masked. Not the Finder's notes.",
    looksAt: [
      { icon: "rank-demand.svg", label: "The role's skill names" },
      { icon: "read-page.svg", label: "Your whole résumé (masked)" },
    ],
    gives: [
      { icon: "flag-proof.svg", label: "Checks marked pass, check or fix" },
      { icon: "match-terms.svg", label: "Keywords found and missing" },
      { icon: "pick-passage.svg", label: "The top three fixes" },
    ],
    does: ["Catches wording, keyword and format problems", "Shows which role keywords your résumé has"],
    cannot: ["Use the web", "See the Finder's résumé notes"],
    goodToKnow: ["It is a rule-of-thumb check, not a real employer's system.", "Its score says how ready your résumé is. It never says your chance of being hired."],
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
    summary: "Turns your biggest gaps into short tips you can act on, with a link to learn from.",
    sees: "The role title and your gaps as numbers. Never your résumé text.",
    looksAt: [
      { icon: "read-role.svg", label: "The role title" },
      { icon: "rank-gaps.svg", label: "Your gaps, as numbers" },
      { icon: "web-search.svg", label: "A web search for courses", boost: true },
    ],
    gives: [
      { icon: "score-evidence.svg", label: "A short verdict" },
      { icon: "match-quests.svg", label: "Four to six practical tips" },
      { icon: "web-search.svg", label: "A link to learn from", boost: true },
    ],
    does: ["Turns a gap into a project you can show", "Picks short tips you can act on"],
    cannot: ["See your résumé text"],
    goodToKnow: ["It sees skill names and numbers only.", "Tip links need web search, so some can be missing."],
    toolCalls: 1,
    seconds: 25,
  },
];

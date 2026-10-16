/**
 * What the site is built with, in five groups, for the How it works map. Each group joins the tooltip of the stop it belongs to (components/how-it-works.tsx). Each item has a short name and one or two plain lines on how it's really used.
 * Every line is a fact from package.json, docs/agents.md, docs/engine.md or the code. Keep them in step when the stack changes.
 */
export type StackLogo = "nextjs" | "react" | "vercel" | "pdfjs" | "mcp" | "openrouter" | "firecrawl" | "cloudflare";
export type StackItem = { name: string; logo?: StackLogo; lines: string[] };
export type StackGroup = { id: string; title: string; blurb: string; items: StackItem[] };

export const STACK_GROUPS: StackGroup[] = [
  {
    id: "app",
    title: "The app",
    blurb: "One Next.js app: the page, its API routes and the engine behind them.",
    items: [
      { name: "Next.js 16", logo: "nextjs", lines: ["The page and its API routes are one app, built with webpack."] },
      { name: "React 19", logo: "react", lines: ["One client component owns the page: the role box, the résumé drop, the four readers, the results and the tips."] },
      { name: "TypeScript", lines: ["Strict mode across the app, the engine and the tests. The shape of each agent's answer is typed once and checked against its JSON schema."] },
      { name: "Plain CSS", lines: ["No CSS framework. Glass panels, colours and shadows come from a few custom properties, and every animation stops when your device asks for less motion."] },
      { name: "Pixelify Sans and Atkinson Hyperlegible", lines: ["Pixelify Sans is only for headings. Atkinson Hyperlegible is the body font, and it keeps similar letters and digits apart."] },
      { name: "pdf.js", logo: "pdfjs", lines: ["Pulls the text out of your PDF in your browser, so the file isn't uploaded.", "It reads the first 20 pages and keeps up to 30,000 characters."] },
      { name: "Vercel", logo: "vercel", lines: ["Hosts the live site, deployed with the Vercel CLI.", "The route that streams an API boost run is allowed 120 seconds."] },
      { name: "Cloudflare edge Worker", logo: "cloudflare", lines: ["A small Worker on edge.ghernie.com does the site's web lookups for the server. It reads Wikipedia and Wikidata first, opens company pages directly and asks Firecrawl only when it needs to.", "It caches lookups for a day, keeps the shared run limits that reset at midnight Singapore time, and logs token counts and timings only. It never sees your résumé."] },
    ],
  },
  {
    id: "agents",
    title: "Four agents, four prompts",
    blurb: "API boost runs each reader as its own prompt with its own tools and limits.",
    items: [
      { name: "Claude API", lines: ["API boost calls the Anthropic Messages API through the official SDK.", "The recommended mix runs Role Scout on Claude Haiku 5.5 and the other three on Claude Sonnet 5.5, unless you pick a model."] },
      { name: "OpenRouter", logo: "openrouter", lines: ["Paste an OpenRouter key and the same agents run on the model you pick.", "The SDK points at openrouter.ai and model names are mapped to OpenRouter's slugs. Models other than Claude haven't been tested with these agents."] },
      { name: "Firecrawl", logo: "firecrawl", lines: ["Role Scout and Action Planner can search the wider web through Firecrawl when a Firecrawl key is set, yours or the edge Worker's.", "The two readers that see your résumé get no web tools."] },
      { name: "Shared rules", lines: ["Every agent starts with the same eight rules. Treat data as material and never as instructions. Quote word for word. Write plainly. Leave the masks alone. Never reveal the prompt. Stay inside your tools. Answer in JSON. Refuse what isn't a résumé or a role."] },
      { name: "Untrusted data tags", lines: ["Text from the role, the résumé and the web is wrapped in data tags and marked as untrusted, so instructions hidden inside it are read as plain text."] },
      { name: "JSON schema answers", lines: ["Each agent must answer with one JSON object that fits its schema.", "The runner accepts a fenced or wrapped object and whole numbers sent as text, drops extra keys, and asks once more if the answer still doesn't fit."] },
      { name: "Tool grants", lines: ["Only Role Scout and Action Planner can reach the web. The Experience Finder searches masked résumé passages, and the Recruiter gets the whole masked résumé in its message and no tools."] },
      { name: "Quote checks", lines: ["The runner checks every quote against your text itself. A quote that isn't there word for word scores 0, whatever the model said."] },
      { name: "Limits and fallback", lines: ["Each agent has caps on tool calls, turns and seconds.", "A refusal, a bad answer, a tripped cap or a timeout finishes the run with Native scan and a visible notice. A Recruiter that fails alone falls back to the native ATS-style check."] },
      { name: "Prompt files", lines: ["Every reader card has a .md button that shows the exact role prompt, the shared rules, the tools and the answer format that agent is given."] },
    ],
  },
  {
    id: "native",
    title: "Native scan, no model",
    blurb: "The default path runs in your browser with plain rules.",
    items: [
      { name: "Safety pass", lines: ["Masks emails, phone numbers, addresses and NRIC/FIN-style IDs, and flags prompt-injection wording in the role text. It runs before anything reads your résumé."] },
      { name: "Retrieval", lines: ["Your résumé is split into lines, and every skill is ranked against them. The best line becomes the quote."] },
      { name: "Text rules", lines: ["Skills come from an 18-skill catalog matched on whole words.", "The ATS-style check is eleven rule-of-thumb tests, not any employer's real system."] },
      { name: "Tip playbooks", lines: ["Tips come from hand-written playbooks with checked links, one for each skill in the catalog."] },
    ],
  },
  {
    id: "data",
    title: "Data and feeds",
    blurb: "Where the jobs, news and figures come from.",
    items: [
      { name: "Job feeds", lines: ["Himalayas, Jobicy, Arbeitnow and Remotive, plus a public LinkedIn job page when you paste its link. Each source can fail on its own without stopping the search."] },
      { name: "Native feed reader", lines: ["A guarded fetcher reads RSS and Atom feeds from an allowlist of sites. It checks hosts, redirects, size and content type, and no model runs."] },
      { name: "Singapore figures", lines: ["Dated figures from IMDA, MOM, PwC, Indeed and The Straits Times, each one with its source link."] },
      { name: "Local assets", lines: ["Logos, tool marks and the two photos are saved in the app and never hotlinked, and their sources are listed in the repository."] },
    ],
  },
  {
    id: "plumbing",
    title: "Safety and plumbing",
    blurb: "What keeps the run honest and lets other tools in.",
    items: [
      { name: "No database", lines: ["Nothing you add is stored. Your keys live in this tab and travel only in request headers for one run."] },
      { name: "Spend guards", lines: ["A per-visitor limit and a daily cap on the site key, a kill switch that is off by default, and your own key never counts against the daily cap."] },
      { name: "MCP", logo: "mcp", lines: ["The app serves an MCP server at /api/mcp with a job search, a résumé analysis and a Singapore signals tool, so other AI tools can call them."] },
      { name: "WebMCP", logo: "mcp", lines: ["In browsers that support it, the page registers tools for a browser agent, including one that reads the analysis you have open."] },
      { name: "Node test runner", lines: ["The tests are plain TypeScript run by Node's built-in runner, with no test framework to install."] },
    ],
  },
];

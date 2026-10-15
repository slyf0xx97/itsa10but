# Itsa10but

Itsa10but is a career workspace for computer science and information systems students, early career technologists and people moving into tech. You give it one to three résumés and a role. It shows the evidence behind every skill and suggests a small project that closes your biggest gap.

It's an entry for the AI Lodge Hackathon 2026, Productivity & Workflows track.

- Live site: https://ghernie.com/projects/itsa10but
- MCP endpoint: https://ghernie.com/projects/itsa10but/api/mcp

The site runs without an API key by default. The AI agents option (called API boost) is opt-in. A visitor can paste their own Anthropic or OpenRouter key, or use the site key when the deployment has it switched on.

## 1. Problem statement

Students and career switchers apply to roles without knowing which of their claims a recruiter can check. A line like "worked with SQL" reads the same as a shipped project, and most feedback tools return one score with no explanation. Applicants then guess what to learn next.

This hurts most for people with no industry contacts to ask, such as first-year students and mid-career switchers. A recruiter's first look at a résumé often takes only seconds, so a vague claim gets little time to prove itself.

## 2. Solution overview

One page walks through the whole job. You pick a role, add a résumé or choose a sample, read what four agents found, inspect the skills, then pick a next step.

Every skill score sits next to the exact quote from the résumé and from the role that produced it. If no quote matches, the page says so and the skill scores 0 for that source. A score shows how much proof the text holds. It does not predict whether you'll get hired.

Before you upload anything, the page shows a labelled sample for Alex, a made-up AI / Machine Learning Engineer candidate. Nothing in the sample is presented as yours.

## 3. Key features

- Four agents that run in order. Role Scout, Experience Finder, Recruiter and Action Planner each pass notes to the next one. Each has a short card with its three moves, and "Strengths, limits & tools" opens the full detail in a popup.
- Four summary cards under "Your résumé is a 10! But…", one per agent. They show the skills the role asks for and which ones you have, the ATS-style score, and three tips and tricks to close your gaps.
- A "See full findings" popup on each card. It has a badge for the mode that ran (Native scan, API boost or Sample), a legend, the steps the reader took, and the quotes with their sources.
- Tips and tricks in the Action Planner card. Each tip is a numbered row with its skill and a tick box that stays in your browser. Opening a row shows how to do it, what to show and the related skill, then up to three free lessons and the latest articles on that skill. The articles load only when you open a tip. A Refresh button looks again, and the page says they were found with our own feed reader with no key. A link at the bottom jumps to Level up.
- Skills with evidence: a radar of your proof per skill, a ranked list with the role's ask, your proof and a verdict, tool logos and learning links. Each skill opens to the quotes and rule points behind its score.
- An ATS-style check. ATS means applicant tracking system, the software many employers use to read résumés. The Recruiter reads your résumé cold and scores it against eleven rule-of-thumb checks. It isn't any employer's real system.
- Company values. When the role names a company on a short checked list, or one found on the web in API boost, a card shows the values that company publishes and how to show them.
- Plain-word tooltips on terms such as ATS, proof, gap and match. They open on hover, focus or tap.
- Three ways to add a role: paste a LinkedIn job link, paste the posting text, or upload a PDF, TXT or MD file. The server reads a public LinkedIn posting and says so when LinkedIn won't share it. A "Play sample" button runs a made-up résumé and job from start to finish.
- A header with pixel tabs (Check, Results, Level up, How it works) and a progress trail along the bottom that ends at Level up. "How it works" is its own section with a single flowchart, and each box has a tooltip.
- Level up: strengths assessments, MySkillsFuture tools, training, résumé help and job-search links, as a checklist you can tick off.
- Singapore hiring signals: dated figures from IMDA, MOM, PwC and Indeed (via The Business Times), each linked to its source, a row of tech and AI news sites, and a See more latest news and sources popup. The popup has a Refresh news button and grouped links to Singapore data, news, job boards, tech feeds and courses.
- An MCP server, so other agents can call the job search and the analysis.
- Keyboard access, reduced-motion support, readable type and mobile layouts.

## 4. AI integration

The page has two modes. The label on every result names the one that ran.

- Native scan is the default and needs no API key. It uses retrieval and text rules and makes no model call. The interface says so. The table below describes this mode.
- API boost is opt-in. You pick it with the "Agent power" control in the header, a toggle switch with "Native scan" on the left and "API boost" on the right. Both names are always visible, the knob slides to the picked side and the picked name is bold. Its "?" button opens a "Two ways to run" popup. Beside it a status says what will run, with a short title and a tooltip: "Native scan, no key used" (the four agents run on simple rules, so they are less powerful), "Add your API key", or "API boost is on" (powered by your Anthropic or OpenRouter key, with the model if you chose one, or by this site's key).

Turning API boost on opens a panel for your own Anthropic or OpenRouter key in one field (a key starting `sk-or-` is treated as OpenRouter) and an optional Firecrawl key. Once a key is in, a Model menu appears. With an Anthropic key it lists Claude Haiku 5.5, Sonnet 5.5 and Opus 5.5. With an OpenRouter key it lists those three plus GPT-5.6 Terra, Gemini 3.8 Flash and DeepSeek V4.1 Flash (checked against OpenRouter's catalogue on 15 October 2026), and a "Custom model id" field for any `provider/model-name`. The default, Recommended mix, is Haiku 5.5 on Role Scout and Sonnet 5.5 on the other three. The pick applies to all four agents, is sent in the request body as `model`, and the server checks it in `lib/model-choice.ts` before anything is sent upstream (a bad id gets a 400). The site key always uses the recommended mix. The results say "API boost, recommended mix" on the default, or "API boost, {model}" when you picked one. They never print a model name you did not choose. Models that aren't Claude haven't been tested with these agents. If one breaks the answer format, times out or refuses, the run falls back to Native scan with a notice. The Firecrawl key is labelled "Optional: Firecrawl key". Without one, Role Scout and Action Planner are given no web tools and skip the web, nothing is sent to Firecrawl, and the results say that web search was off. A run on your key doesn't need `LIVE_AGENTS_ENABLED`, a server key or the daily cap. Without a visitor key, API boost still works when the server has `LIVE_AGENTS_ENABLED=true` and an `ANTHROPIC_API_KEY`. On the Cloudflare build the option is off and the page stays on Native scan.

`GET /api/mode` returns `{ live, reason?, ownKey }`. `live` says whether the site key can be used. `ownKey` says whether a visitor key can be used on this host.

`POST /api/signals` powers the Refresh news button in the Latest news and sources popup. Our own feed reader (`lib/native-scraper.ts`) runs first and needs no key. It reads the published RSS feeds of The Straits Times, CNA, The Business Times, Vulcan Post, e27 and Indeed Hiring Lab, plus MOM's public press-release page, keeps recent stories about work and tech, and returns `{ title, source, url, date, snippet }` items from allowlisted hosts only. It fetches over https from exact hosts, refuses private, loopback and link-local addresses, re-checks every redirect, caps redirects, time and size, checks the content type, strips all markup and identifies itself with a User-Agent. If a Firecrawl key is present (the visitor's own in the `x-firecrawl-key` header, or the site's `FIRECRAWL_API_KEY` when `LIVE_AGENTS_ENABLED=true`), a Firecrawl search adds results. The reply says which method ran. Results are cached for 10 minutes, each visitor gets a per-hour limit, and no model runs, so nothing is summarised or turned into a number. IMDA and the Jobs-Skills Portal publish no feed that our reader can use, so they are links in the popup only.

`POST /api/skill-news` powers the "Latest on {skill}" lists under each tip. The body holds 1 to 3 skill names and nothing else. Each name must be one of the 17 skills in the catalog, and a body with any other field, or over 600 characters, is refused, so no résumé or role text can travel with it. The same native reader (`fetchTechEntries` in `lib/native-scraper.ts`) reads the RSS or Atom feeds of seven sites from the Tech and AI news feeds group (Hugging Face Blog, Simon Willison's Weblog, The Verge AI, MIT Technology Review AI, Import AI, The Pragmatic Engineer and Latent Space) with the same guards as above, on its own fixed host list. One read is cached for 15 minutes and shared by every visitor, so a Refresh inside that time reuses it. Each visitor gets 20 lookups an hour. A skill's catalog terms pick the articles (`lib/skill-news.ts`): the title names the skill, or the text uses two different terms, and everyday words like "rest" or "react" are left out. A skill with no match says so and keeps its free lessons. Links go only to the seven hosts. No key is read and no model runs.

| Stage | What it does | Code |
| --- | --- | --- |
| Safety pass | Masks emails, phone numbers, addresses and NRIC/FIN-style IDs, then flags prompt-injection patterns in the role text | `lib/safety.ts` |
| Retrieval | Splits the masked résumé into passages and ranks them against each skill and the role text | `lib/rag.ts` |
| Four readers | Run in a fixed order with a handoff before each, then a `complete` event carries the full analysis. Every event is marked `simulated: true` except the real safety event | `lib/simulated-engine.ts` |
| Grounding rule | A quote that isn't a literal match in the source text scores 0 | `verifyQuote`, `scoreWithGrounding` in `lib/rag.ts` |

### API boost

Four agents run in order through `lib/live-agents.ts`. The server streams their progress from `POST /api/agents/stream` as NDJSON. Each agent is a typed spec in `lib/agents/` with its own model, tool grants and hard limits. [`docs/agents.md`](docs/agents.md) lists them.

| Agent | Tools |
| --- | --- |
| Role Scout | `read_linkedin_posting` (only the link the visitor gave), `firecrawl_search`, `firecrawl_scrape` |
| Experience Finder | `search_resume_passages` (local, over the masked résumé) |
| Recruiter | None. The whole masked résumé is in its message |
| Action Planner | `firecrawl_search` |

The two agents that read the résumé have no network tool, and the two that reach the web never see the résumé. The runner checks every quote against the submitted text itself, and a quote that isn't a literal match scores 0.

A refusal, a malformed answer, a tripped limit or a timeout ends the run with the rules engine and a visible notice. That result is labelled as Native scan. `api/analyse` and `api/analyse/stream` are keyless only. They remain for programmatic use and tests.

### Agents and MCP

`POST /api/mcp` is a stateless Streamable-HTTP MCP endpoint with three tools: `search_itsa10but_jobs`, `analyse_itsa10but_profile` and `get_itsa10but_sg_signals`. The first two reply with `method: "keyless retrieval + rules"`. The analysis tool masks personal data and flags injection text first. The signals tool returns the dated, sourced Singapore snapshot with a method label that says no model ran. The snapshot includes IMDA's definition of AI skills. With `refresh: true` it also returns latest headlines from our own feed reader with no key, under the same limits as `/api/signals`, and a Firecrawl key in the `x-firecrawl-key` header adds search results. A fourth tool, `read_itsa10but_analysis`, reads the open dashboard and works through WebMCP in supporting browsers only.

To add the server to Claude Code:

    claude mcp add --transport http itsa10but https://<your-app>/api/mcp

For Claude Desktop, add the same URL as a custom connector.

## 5. External tools and datasets

- [Himalayas Remote Jobs API](https://himalayas.app/docs/remote-jobs-api) and [Jobicy Jobs API](https://jobicy.com/jobs-rss-feed) for role search, plus the Arbeitnow and Remotive feeds. Himalayas says its API refreshes within a 24-hour window, so "live" means a live feed query and not instant publication.
- Public LinkedIn job pages, through the guest posting endpoint for a pasted `/jobs/view/` link. The server reads them without a login or cookies and only fetches a URL it rebuilds from the numeric job id. If LinkedIn blocks the request, the app asks you to paste the text and never claims it imported a description it couldn't read.
- For the Singapore hiring signals card (checked 15 Oct 2026, all in `lib/sg-snapshot.ts`): [IMDA Digital Economy Report 2026](https://www.imda.gov.sg/resources/press-releases-factsheets-and-speeches/sgde-ar-2026) (5 Oct 2026) and [2025](https://www.imda.gov.sg/resources/press-releases-factsheets-and-speeches/factsheets/2025/ar-sgde-2025) (6 Oct 2025), [MOM Job Vacancies 2025](https://www.mom.gov.sg/newsroom/press-releases/2026/0320-job-vacancies-report-2025) (20 Mar 2026), [PwC Singapore AI Jobs Barometer](https://www.mynewsdesk.com/sg/pwc-singapore/pressreleases/ai-roles-command-wage-premiums-across-sectors-in-singapore-starting-at-32-percent-underscoring-ai-as-a-key-driver-of-talent-value-pwcs-ai-job-barometer-3454090) (15 Jun 2026), IMDA's [2026 report PDF](https://www.imda.gov.sg/assets/8e4d9951-bc53-4612-80ba-77ee4feaa6da.pdf) for the AI skills definition (page 24, note 13), [Indeed's January 2026 figures as reported by The Business Times](https://www.businesstimes.com.sg/singapore/singapore-job-postings-hit-7-month-high-ai-demand-surges-jobs-site-indeed) (11 Mar 2026), the [Jobs-Skills Portal Skills Insights 2026](https://jobsandskills.swda.gov.sg/insights/tae-conference) and [The Straits Times on AI salaries](https://www.straitstimes.com/singapore/ai-salaries-in-singapore-rise-as-demand-for-talent-grows-phd-not-always-required) (10 Jun 2026). The figures are dated snapshots, not a ranking or forecast.
- [Devicon](https://github.com/devicons/devicon) tool marks under the MIT license (`public/tool-logos/LICENSE.devicon.txt`).
- pdf.js reads PDF résumés in the browser. The app is built with Next.js 16 and React.
- The character artwork is original and was generated for this project. [`assets/README.md`](assets/README.md) lists every asset and its source.

## 6. Installation and setup

Node.js 22.13 or newer is required.

    npm ci
    npm run dev

Open the address Next.js prints. Choose a sample or search for a role, then add one to three PDF, TXT or MD résumés. PDFs need selectable text, so scanned images don't work.

To try API boost locally, create `.env.local` and set these. Every `.env*` file is gitignored, so the repo has no `.env.example`.

- `LIVE_AGENTS_ENABLED=true`: the kill switch. Unset or any other value keeps the site key off.
- `ANTHROPIC_API_KEY`: server only.
- `FIRECRAWL_API_KEY`: server only and optional. Without it the agents can't search the web. Refresh news still works with no key through our own feed reader, and the Firecrawl search only adds results. Like the agents, Refresh news uses the site key only when `LIVE_AGENTS_ENABLED=true`.
- `AGENT_MODEL_ROLE_SCOUT`, `AGENT_MODEL_EXPERIENCE_FINDER`, `AGENT_MODEL_RECRUITER`, `AGENT_MODEL_ACTION_PLANNER`: optional model overrides.
- `LIVE_AGENTS_PER_VISITOR` (default 3 runs per hour) and `LIVE_AGENTS_DAILY_CAP` (default 50 runs per day): optional limits for runs on the site key.
- `LIVE_OWN_KEY_PER_VISITOR` (default 10 runs per hour): optional limit for runs on a visitor's own key. There's no daily cap, because the visitor pays.

Without these, everything runs on the local rules.

Checks:

    npm test
    npm run lint
    npx tsc --noEmit
    npm run build

Working rules for the project are in [`AGENTS.md`](AGENTS.md). Notes on each engine module are in [`docs/engine.md`](docs/engine.md).

## 7. AI safety and limitations

### Risks and guardrails

- Personal data. Résumés contain contact details. The safety pass masks emails, phone numbers, addresses and NRIC/FIN-style IDs before any reader or retrieval step sees the text, and the report carries `stored: false`. API boost runs the same masking first, so only masked text goes to the model API. Files are parsed in the browser. The app keeps no accounts, uploads or results, and résumé text stays out of analytics, logs, URLs and browser storage.
- Prompt injection. Job text can carry instructions aimed at a model. The safety pass flags "ignore previous instructions" phrasing, role overrides, requests to reveal a prompt, invisible characters and long encoded blocks, and shows the flag to you.
- Made-up evidence. A skill score must point to a literal quote. Every quote is checked against the submitted text, including each one the agents return, and a missing match scores 0 for that source.
- Honest labelling. Sample data is labelled as a sample. Rule-based findings are never described as a Claude run. Bars never imply hiring probability.
- What leaves the browser in API boost. The masked résumé text goes to Anthropic, or to OpenRouter, which passes it to the company behind the model you picked (Anthropic for the Claude models), when you use an OpenRouter key. Masking covers emails, phone numbers, addresses and NRIC/FIN-style IDs, so names, employers and schools are not masked and do go. The role text shapes the web searches. Role Scout's searches go to Firecrawl and are written from the role. Action Planner's come from the role title and skill names, and it never receives résumé text. The page says all this before the first live run. Errors and logs never contain résumé, role or model text. Native scan sends nothing off the page except the job search you start yourself.
- Model keys. The site's `ANTHROPIC_API_KEY` and `FIRECRAWL_API_KEY` are read in the route handlers and never sent to the browser. You can paste your own keys. They're held in React state for the tab, with no localStorage, cookies, URL or body. They travel over HTTPS in the `x-anthropic-key` (or `x-openrouter-key`, never both) and `x-firecrawl-key` request headers to `POST /api/agents/stream` for that run only. `lib/visitor-keys.ts` trims and shape-checks them, and they're never stored, logged or echoed.
- OpenRouter keys. An OpenRouter key goes to `https://openrouter.ai/api` with the model names mapped to OpenRouter slugs (`lib/openrouter-models.ts`). A model you type is checked against a strict pattern (`provider/model-name`, letters, digits, dot, dash, underscore and colon, 100 characters at most) before it is used.
- Refused keys. If the provider rejects a key (401), the page shows "Anthropic rejected that key" or "OpenRouter rejected that key" and finishes with the text-rules engine, labelled as Native scan. The site's Firecrawl key isn't used for a visitor-key run unless `LIVE_AGENTS_ENABLED=true`. A "Remove keys" button clears your keys, and closing the tab forgets them.
- Spend guards. The site key stays off until all of these are in place:
  - a Vercel Firewall rate-limit rule on `/api/agents/stream`
  - a hard spend limit on the Anthropic key and on the Firecrawl key
  - the in-app limiter in `lib/rate-limit.ts`, per visitor and keyed on the platform-provided client IP only
  - a daily run cap
  - the `LIVE_AGENTS_ENABLED` kill switch, which defaults to off

  The limiter keeps its counts in memory, so each serverless instance counts on its own. It backs up the Firewall rule and the spend limits and doesn't replace them.

### Testing

`npm test` runs 337 dependency-free tests with Node's built-in runner. They cover PII masking and injection flags, quote verification and grounded scoring, the simulated engine's event order and labelling, job feed filtering, the skill-news request check, term filter and cache, LinkedIn paste parsing, the MCP request handler and the agents' tool grants.

### Limitations

- Masking is pattern-based. Unusual name or address formats can slip through, and the phone pattern can match long numbers by mistake.
- Skill matching uses an 18-skill catalog and word-boundary term matching, so synonyms and context are missed. A high score means the text mentions the skill. It doesn't show the person is good at it.
- The injection checks are a short rule list and won't catch a determined or new attack.
- The Native scan readers are rules, so their wording is templated.
- Job results come from remote-only feeds. A listing may be closed, and Singapore eligibility isn't guaranteed, so check the original posting.
- API boost on the site key is off unless the deployment switches it on, and it hasn't been tried on the live site. A run on your own key is capped per visitor only. Either kind of run can take up to about a minute.
- Quote checks catch invented quotes. They can't catch a weak reading of a real one, so a literal quote can still be thin evidence.

## License

The code is released under the [MIT License](LICENSE), copyright 2026 Ghernie Encinas. You can use, copy, change and share it, including in your own projects, as long as you keep the copyright notice and the licence text. The software comes as is, with no warranty, and the author isn't liable for how it's used.

The MIT License covers this repository's code and original pixel art. Third-party logos, icons and fonts stay with their owners under their own terms. Their origins are listed in `public/assets/logos/SOURCES.md` and `public/tool-logos/`.

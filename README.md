# Itsa10but

Live site: https://ghernie.com/projects/itsa10but

MCP endpoint: https://ghernie.com/projects/itsa10but/api/mcp

Itsa10but is a one-page career workspace for students and people moving into tech. You pick a role and add a résumé. Four pixel-character readers compare the two, and every skill score shows the literal quote behind it. The page ends with a short list of tips for closing your biggest gaps.

It's my entry for the AI Lodge Hackathon 2026, Productivity & Workflows track.

## Why it exists

A line like "worked with SQL" reads the same as a shipped project, and most résumé tools return one score with no reason behind it. People with no industry contacts to ask end up guessing what to learn next.

Here, a skill only scores if the text holds a quote that proves it. If no quote matches, the skill scores 0 for that source. A score shows how much proof your résumé holds. It doesn't predict whether you'll get hired.

## What you can do

1. Add a role. Paste a LinkedIn job link, paste the posting text, upload a PDF, TXT or MD file, or search the remote job feeds.
2. Add one to three résumés, or press "Play sample" to run a made-up candidate from start to finish. PDFs need selectable text. Files are read in your browser.
3. Watch the four readers work in order. Every reader card has a .md button that peeks at the exact prompt that agent is given, and the whole file opens from there.
4. Read the results under "Your résumé is a 10! But…". Each of the four cards opens a "See full findings" popup with the steps the reader took and the quotes behind them.
5. Open the skills radar and the ranked skill list. Each skill shows what the role asks for, your proof as a percentage, a verdict and the quotes.
6. Pick a tip from the Action Planner. Each tip has three short steps, a résumé line you can copy and checked links, and the latest articles on that skill load when you open it.
7. Keep going in Level up, a checklist of courses, tools and programmes. Ticks stay in your browser.

The four readers:

- Role Scout reads the role and lists the skills it asks for.
- Experience Finder looks for a literal quote in your résumé for each skill.
- Recruiter runs an ATS-style check. ATS means applicant tracking system. The check is eleven rule-of-thumb tests and isn't any employer's real system.
- Action Planner turns your biggest gaps into small projects.

The page also shows dated Singapore hiring figures with their sources, a row of tech and AI news sites, and a "How it works" map you can play, pause and reset. The map has a bridge switch that sends the note along API boost, Native scan or both in turn.

## Two ways to run

You choose in the header with the "Agent power" switch. Every result is labelled with the mode that produced it.

| | Native scan | API boost |
| --- | --- | --- |
| Needs a key | No. | Yes, your own Anthropic or OpenRouter key, or the site's key when the deployment turns it on. |
| Where it runs | In your browser. | On the server, through Claude agents. |
| How it reads | Retrieval and text rules. No model call. | Four Claude agents. Web lookups go through the edge Worker (Wikipedia and direct page reads first), and through Firecrawl when a key is set. |
| If something breaks | Not applicable. | The run falls back to Native scan and says so. |

Native scan is the default. Models other than Claude haven't been tested with the agents. The runner checks every quote an agent returns against your text, and a quote that isn't a literal match scores 0.

## Privacy

- The site has no database and no accounts. Nothing you add is stored.
- The safety pass masks emails, phone numbers, addresses and NRIC/FIN-style IDs before any reader sees the text. It also flags prompt-injection phrasing in the role text.
- Native scan sends nothing off the page except a job search you start yourself.
- In API boost, the masked résumé goes to Anthropic, or to OpenRouter and on to the company behind the model you picked. Names, employers and schools aren't masked, so they go too. The role text shapes the web searches.
- Your keys live in React state for the tab. They travel in request headers for one run, and the server never stores, logs or echoes them.
- Résumé text, role text and keys stay out of logs and URLs.
- The edge Worker sees search queries and page links the agents ask for, such as a company name. It never receives résumé text. Its database keeps token counts and timings per agent, plus run counters, and no text, keys or IP addresses.

## How it's built

- Next.js 16 with the App Router, React 19 and TypeScript. Builds use webpack.
- `components/career/career-workspace.tsx` owns the page. Styling is plain CSS in `app/`.
- `lib/` holds the engine: `safety.ts` (masking), `rag.ts` (retrieval and quote checks), `simulated-engine.ts` (the Native scan readers) and `live-agents.ts` (the API boost runner, with agent specs in `lib/agents/`).
- Tips come from `lib/skill-playbooks.ts`, a hand-written and link-checked playbook for each skill in an 18-skill catalog.
- `pdfjs-dist` reads PDF résumés in the browser.

More detail is in `docs/engine.md` and `docs/agents.md`. Working rules for the project are in `AGENTS.md`.

## Run it locally

You need Node.js 22.13 or newer.

    npm ci
    npm run dev

Open the address Next.js prints. Without any keys, everything runs as Native scan.

To try API boost, create `.env.local` and set these. Every `.env*` file is gitignored.

- `LIVE_AGENTS_ENABLED=true` turns the site key on. Any other value keeps it off.
- `ANTHROPIC_API_KEY` is the site's model key. It's read on the server only.
- `FIRECRAWL_API_KEY` is optional. It lets the agents search the open web when the edge Worker isn't set.
- `EDGE_URL` and `EDGE_SECRET` are optional and point the server at the edge Worker in `worker/`. With them, web lookups work without a Firecrawl key, repeat lookups come from a 24-hour cache, the run limits are shared across instances (the daily cap resets at midnight Singapore time) and each run's token counts are logged. Locally, `EDGE_URL` can be `http://127.0.0.1:8787`.
- `AGENT_MODEL_ROLE_SCOUT`, `AGENT_MODEL_EXPERIENCE_FINDER`, `AGENT_MODEL_RECRUITER` and `AGENT_MODEL_ACTION_PLANNER` are optional model overrides.
- `LIVE_AGENTS_PER_VISITOR` is optional and defaults to 3 runs an hour on the site key.
- `LIVE_AGENTS_DAILY_CAP` is optional and defaults to 50 runs a day on the site key.
- `LIVE_OWN_KEY_PER_VISITOR` is optional and defaults to 10 runs an hour on a visitor's own key.

Before you switch the site key on in production, add a Vercel Firewall rate-limit rule on `/api/agents/stream` and a spend limit on the Anthropic and Firecrawl keys.

The edge Worker (`worker/`) runs on Cloudflare. Create a KV namespace and a D1 database, put their IDs in `worker/wrangler.jsonc`, then run `npx wrangler d1 execute itsa10but-edge --remote --file worker/schema.sql`. Set `EDGE_SECRET`, `ADMIN_SECRET` and (optionally) `FIRECRAWL_API_KEY` with `npx wrangler secret put`, and deploy with `npx wrangler deploy` from `worker/`. Totals by day and model are at `GET /usage/summary` with the `x-admin-secret` header.

Checks:

    npm test
    npm run lint
    npx tsc --noEmit
    npm run build

`npm test` runs 369 dependency-free tests with Node's built-in runner.

## MCP tools

`/api/mcp` is a stateless Streamable HTTP endpoint. To add it to Claude Code:

    claude mcp add --transport http itsa10but https://ghernie.com/projects/itsa10but/api/mcp

It serves these tools:

- `search_itsa10but_jobs` searches the remote job feeds.
- `analyse_itsa10but_profile` masks a résumé, then runs the Native scan against a role.
- `get_itsa10but_sg_signals` returns the dated and sourced Singapore snapshot.

A fourth tool, `read_itsa10but_analysis`, reads the open dashboard and works through WebMCP in supporting browsers only.

## Data sources and credits

- Job search: Himalayas, Jobicy, Arbeitnow and Remotive. Himalayas refreshes within 24 hours, so "live" means a live feed query and not instant publication.
- Public LinkedIn job pages, through the guest posting endpoint. If LinkedIn blocks the request, the app asks you to paste the text.
- Singapore figures, checked 15 October 2026: IMDA's Digital Economy Report, MOM's Job Vacancies 2025, PwC's AI Jobs Barometer, Indeed (as reported by The Business Times) and The Straits Times. Each figure links to its source in the app. They're dated snapshots and not a forecast.
- News rows read the published RSS or Atom feeds of the listed sites, with no key and no model.
- Tool marks come from [Devicon](https://github.com/devicons/devicon) under the MIT license. Other logos belong to their owners. Their origins are in `public/assets/logos/SOURCES.md`.
- The pixel art is original to this project.

## Limits

- Masking is pattern-based. Unusual name or address formats can slip through.
- Skill matching uses word-boundary terms, so synonyms and context are missed. A high score means the text mentions the skill, which doesn't show you're good at it.
- The injection checks are a short rule list and won't catch a determined attack.
- Native scan wording is templated.
- Job results come from remote-only feeds. A listing may be closed, and Singapore eligibility isn't guaranteed.
- A quote check catches invented quotes. It can't catch a weak reading of a real one.
- API boost on the site key hasn't been tried on the live site. A run can take about a minute.

## License

The code is released under the [MIT License](LICENSE), copyright 2026 Ghernie Encinas. Third-party logos, icons and fonts stay with their owners under their own terms.

# 🔟 Itsa10but

**Your résumé is a 10! But… is it a 10 for *this* role?**

Itsa10but is a one-page career workspace for students and people moving into tech. You pick a role and add your résumé (or a sample). Four small pixel readers compare the two and show you the gaps. Every score comes with the exact quote behind it, and the page ends with one small project that closes your biggest gap.

🌐 **Live site:** https://ghernie.com/projects/itsa10but
🏆 Built for the AI Lodge Hackathon, Productivity & Workflows track.

---

## 🧭 How it works

```
 📄 Your résumé  +  💼 A role
          │
          ▼
 🔒 Mask personal details
          │
          ▼
 🔎 Role Scout  →  🧐 Experience Finder  →  📋 Recruiter  →  🗺️ Action Planner
          │
          ▼
 📊 Skill radar  +  ✅ Quotes as proof  +  🎯 One project to close the gap
```

| Reader | What it does |
|--------|--------------|
| 🔎 Role Scout | Lists the skills the role asks for |
| 🧐 Experience Finder | Looks for proof of each skill in your résumé |
| 📋 Recruiter | Checks ATS readiness, then gives a quick-read review: what to fix first with the real line and a rewrite, what works and what a recruiter might ask |
| 🗺️ Action Planner | Picks one small project and some free lessons |

> 💡 Scores describe **proof on the page**, never your chance of getting hired. A quote that isn't found word for word in your résumé scores 0.

---

## ⚡ Two ways to run

| | 🧰 Native scan | 🚀 API boost |
|---|---|---|
| Needs a key? | No | Yes (Anthropic, OpenRouter or Gemini) |
| Where it runs | In your browser | Claude agents on the server |
| Web lookups | None | Role and company pages, learning links |
| Passages | Matched by words in your browser | Matched by words, then read by a model (RAG) |
| Cost | Free | Pay for your own tokens |
| Default | ✅ | Opt in with the switch in the header |

Native scan uses text rules, so its wording is templated. API boost uses real Claude agents and checks every quote itself. If an agent fails or times out, the page falls back to Native scan and tells you.

---

## 🔒 Privacy

- 📄 Résumés are read in your browser. Nothing is stored.
- ☁️ In native scan, the role text (never the résumé) is read by a small Cloudflare Workers AI model to find skills the word list misses. Each name it returns must appear word for word in the role text.
- 🕶️ Email, phone numbers and addresses are masked before anything leaves the page.
- 🔑 In API boost, masked résumé text goes to the company behind the key you add: Anthropic, Google (Gemini), or OpenRouter, which passes it to the maker of the model you pick. The privacy and legal text names only that company. Names, employers and schools are **not** masked.
- 🗝️ Visitor keys live in React state and one request header. They are never stored or logged.

---

## 🧱 What it's built with

| Part | Tech |
|------|------|
| Site | Next.js 16 (webpack), React 19, TypeScript |
| Hosting | Vercel |
| Edge Worker | Cloudflare Workers + KV + D1 (`worker/`) |
| Agents | Anthropic SDK, Firecrawl (optional) |
| Résumé parsing | pdf.js in the browser |
| Tests | Node's built-in runner, no framework |

The 🌩️ **edge Worker** (`edge.ghernie.com`) does web lookups for API boost. It reads Wikipedia and Wikidata first, falls back to Firecrawl, caches answers for 24 hours, caps daily Firecrawl use and keeps a counts-only usage log.

---

## 🛠️ Run it locally

Needs Node 22.13 or newer.

```bash
npm install
npm run dev        # http://localhost:3000/projects/itsa10but
```

| Command | What it does |
|---------|--------------|
| `npm test` | Runs all tests |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm run build` | Production build |
| `npm run eval` | Scores the native scan on 43 hand-written résumé and role pairs and lists every miss |
| `npm run demand` | Rebuilds `lib/role-demand.json` from the free job feeds and MyCareersFuture |

Run all four before you submit.

### 🔐 Environment variables

The site works with none of these set. It stays on Native scan.

| Variable | Needed? | What it does |
|----------|---------|--------------|
| `LIVE_AGENTS_ENABLED` | Optional | `true` turns the site's own key on. Anything else keeps it off |
| `ANTHROPIC_API_KEY` | Optional | The site's key for API boost |
| `FIRECRAWL_API_KEY` | Optional | Lets agents search the web when the edge Worker isn't set |
| `EDGE_URL`, `EDGE_SECRET` | Optional | Point the server at the edge Worker |
| `FIRECRAWL_DAILY` | Optional | Daily Firecrawl budget for the Worker's own key (default 0, so visitors never spend your credits; a visitor's own key is always free to you) |
| `AGENT_MODEL_ROLE_SCOUT`, `AGENT_MODEL_EXPERIENCE_FINDER`, `AGENT_MODEL_RECRUITER`, `AGENT_MODEL_ACTION_PLANNER` | Optional | Model overrides per agent |
| `LIVE_AGENTS_PER_VISITOR` | Optional | Runs per hour on the site key (default 3) |
| `LIVE_AGENTS_DAILY_CAP` | Optional | Runs per day on the site key (default 50) |
| `LIVE_OWN_KEY_PER_VISITOR` | Optional | Runs per hour on a visitor's own key (default 10) |
| `TURNSTILE_SECRET`, `NEXT_PUBLIC_TURNSTILE_SITEKEY` | Optional | Cloudflare Turnstile bot check on `/api/agents/stream` and `/api/role-skills`. Free. With the secret unset every request passes |
| `NEXT_PUBLIC_CF_BEACON` | Optional | Cloudflare Web Analytics token (free, no cookies). The script loads only when this is set |
| `ROLE_AI_DAILY` | Optional | Worker setting: Cloudflare AI role reads a day (default 200, 0 turns it off). Stays inside the free 10,000 neurons |

⚠️ Before you switch the site key on, add a Vercel Firewall rate-limit rule on `/api/agents/stream` and a spend limit on the Anthropic and Firecrawl keys.

### 🚢 Deploy

```bash
vercel link              # once
vercel deploy --prod
```

For the Worker: create a KV namespace and a D1 database, put their IDs in `worker/wrangler.jsonc`, run `npx wrangler d1 execute itsa10but-edge --remote --file worker/schema.sql`, set `EDGE_SECRET`, `ADMIN_SECRET` and (optionally) `FIRECRAWL_API_KEY` with `npx wrangler secret put`, then `npx wrangler deploy` from `worker/`. Daily totals are at `GET /usage/summary` with the `x-admin-secret` header.

The Worker also holds two free Cloudflare features. An hourly cron refreshes one role's market-demand table in KV from the free Himalayas and Jobicy feeds (remote postings) and from MyCareersFuture, Singapore's government job portal (the skills each employer tagged, plus advertised monthly pay) (`GET /demand`, served to the page by `/api/demand`; `npm run demand` builds the offline fallback `lib/role-demand.json`). The `AI` binding lets `POST /role-skills` have a small Workers AI model read the role text only and name skills the word list misses; each name must appear word for word in the role text. Redeploy the Worker with `npx wrangler deploy` after pulling these changes. Do not run `wrangler dev` with the AI binding, because Workers AI bills local use too.

---

## 🤖 MCP tools

`/api/mcp` is a stateless Streamable HTTP endpoint. Add it to Claude Code:

```bash
claude mcp add --transport http itsa10but https://ghernie.com/projects/itsa10but/api/mcp
```

| Tool | What it does |
|------|--------------|
| `search_itsa10but_jobs` | Searches the remote job feeds |
| `analyse_itsa10but_profile` | Masks a résumé, then runs the Native scan against a role |
| `get_itsa10but_sg_signals` | Returns the dated, sourced Singapore snapshot |
| `read_itsa10but_analysis` | Reads the open dashboard (WebMCP, supporting browsers only) |

---

## 📚 Data sources

| What | Where from |
|------|-----------|
| Jobs | Himalayas, Jobicy, Arbeitnow, Remotive and public LinkedIn job pages |
| Singapore figures (checked 15 Oct 2026) | IMDA, MOM, PwC, Indeed (via The Business Times), The Straits Times. Each figure links to its source |
| News | Public RSS and Atom feeds, no key and no model |
| Logos | [Devicon](https://github.com/devicons/devicon) (MIT) and owners' marks. Origins are in `public/assets/logos/SOURCES.md` |
| Pixel art | Original to this project |

---

## 🚧 Limits

- 🕳️ Masking is pattern-based, so unusual name or address formats can slip through.
- 🔤 Skill matching uses whole-word terms with plural, -ing, -ed and spelling variants, plus a short list of phrases it ignores ("the rest of", "2022 to present"). It still misses many synonyms, and a high score only means the text shows the skill. On the 43 hand-written cases in `lib/eval`, written by one person, it finds the skills a résumé shows about 95% of the time, and gives strong proof to real project work about 90% of the time. Treat these as a direction, not a benchmark.
- 🛡️ The prompt-injection checks are a short rule list.
- 📋 A quote check catches invented quotes. It can't catch a weak reading of a real one.
- 🌍 Demand numbers come from recent postings on free remote feeds and from the skills Singapore employers tagged on MyCareersFuture. A listing may be closed, and a tag is not a requirement.
- ⏱️ An API boost run takes about a minute.

---

## 📄 License

MIT, copyright 2026 Ghernie Encinas. See [LICENSE](LICENSE). Third-party logos, icons and fonts stay with their owners.

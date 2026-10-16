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
| 📋 Recruiter | Checks ATS readiness (rule-of-thumb checks) and the employer's values |
| 🗺️ Action Planner | Picks one small project and some free lessons |

> 💡 Scores describe **proof on the page**, never your chance of getting hired. A quote that isn't found word for word in your résumé scores 0.

---

## ⚡ Two ways to run

| | 🧰 Native scan | 🚀 API boost |
|---|---|---|
| Needs a key? | No | Yes (Anthropic or OpenRouter) |
| Where it runs | In your browser | Claude agents on the server |
| Web lookups | None | Role and company pages, learning links |
| Cost | Free | Pay for your own tokens |
| Default | ✅ | Opt in with the switch in the header |

Native scan uses text rules, so its wording is templated. API boost uses real Claude agents and checks every quote itself. If an agent fails or times out, the page falls back to Native scan and tells you.

---

## 🔒 Privacy

- 📄 Résumés are read in your browser. Nothing is stored.
- 🕶️ Email, phone numbers and addresses are masked before anything leaves the page.
- 🔑 In API boost, masked résumé text goes to Anthropic (or to OpenRouter, then Anthropic). Names, employers and schools are **not** masked.
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

Run all four before you submit.

### 🔐 Environment variables

The site works with none of these set. It stays on Native scan.

| Variable | Needed? | What it does |
|----------|---------|--------------|
| `LIVE_AGENTS_ENABLED` | Optional | `true` turns the site's own key on. Anything else keeps it off |
| `ANTHROPIC_API_KEY` | Optional | The site's key for API boost |
| `FIRECRAWL_API_KEY` | Optional | Lets agents search the web when the edge Worker isn't set |
| `EDGE_URL`, `EDGE_SECRET` | Optional | Point the server at the edge Worker |
| `FIRECRAWL_DAILY` | Optional | Daily Firecrawl budget for the Worker's key (default 25) |
| `AGENT_MODEL_ROLE_SCOUT`, `AGENT_MODEL_EXPERIENCE_FINDER`, `AGENT_MODEL_RECRUITER`, `AGENT_MODEL_ACTION_PLANNER` | Optional | Model overrides per agent |
| `LIVE_AGENTS_PER_VISITOR` | Optional | Runs per hour on the site key (default 3) |
| `LIVE_AGENTS_DAILY_CAP` | Optional | Runs per day on the site key (default 50) |
| `LIVE_OWN_KEY_PER_VISITOR` | Optional | Runs per hour on a visitor's own key (default 10) |

⚠️ Before you switch the site key on, add a Vercel Firewall rate-limit rule on `/api/agents/stream` and a spend limit on the Anthropic and Firecrawl keys.

### 🚢 Deploy

```bash
vercel link              # once
vercel deploy --prod
```

For the Worker: create a KV namespace and a D1 database, put their IDs in `worker/wrangler.jsonc`, run `npx wrangler d1 execute itsa10but-edge --remote --file worker/schema.sql`, set `EDGE_SECRET`, `ADMIN_SECRET` and (optionally) `FIRECRAWL_API_KEY` with `npx wrangler secret put`, then `npx wrangler deploy` from `worker/`. Daily totals are at `GET /usage/summary` with the `x-admin-secret` header.

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
- 🔤 Skill matching uses word-boundary terms. It misses synonyms, and a high score only means the text mentions the skill.
- 🛡️ The prompt-injection checks are a short rule list.
- 📋 A quote check catches invented quotes. It can't catch a weak reading of a real one.
- 🌍 Job feeds are remote-only. A listing may be closed.
- ⏱️ An API boost run takes about a minute.

---

## 📄 License

MIT, copyright 2026 Ghernie Encinas. See [LICENSE](LICENSE). Third-party logos, icons and fonts stay with their owners.

# Engine modules

Every module under `lib/` that backs the simulated agent engine and the Lodge features runs with no API key. None of them store the résumé or job text they receive. This doc lists each module's exports so UI code can import them directly.

## lib/preview-analysis.ts

`previewAnalysis(resumes, job)` is the keyless scoring engine. It returns `ats` too, from `atsCheck` over the supplied text with the role's skills as keywords. The keyless API routes and the MCP analyse tool carry it as well, and the Finder and Recruiter agent notes describe the weak-proof flags and the ATS-style score. It returns `company` when the job text names a known employer (see `lib/company-culture.ts`).

It also exports `catalog` (the 18-skill seed list) and `hasTerm` (the word-boundary term matcher), so the RAG and simulated-engine modules reuse the same skill definitions.

## lib/ats-check.ts

`atsCheck(resumeText, roleSkillNames)` returns an `AtsReport` (type in `lib/analysis-types.ts`): an ATS-style check of the text. ATS means applicant tracking system. The check is deterministic, has no dependencies and is not any employer's real system.

It runs 11 rule-of-thumb checks with stable ids: `keywords`, `numbers`, `verbs`, `contact`, `sections`, `dates`, `columns`, `symbols`, `bullets`, `filler` and `length`. The checks fall into four groups: `parse`, `keywords`, `wording` and `format`. Each check is pass, warn or fail.

- `score` is the average (pass 1, warn 0.5, fail 0) as a whole number from 0 to 100. The `note` says so.
- `fixes` holds the top three tips, failures first.
- `keywordsFound` and `keywordsMissing` list the role's skill names that do or don't appear word for word.
- The masked tokens `[masked-email]` and `[masked-phone]` count as contact details.

Other exports are `atsScore`, `atsNote`, `topFixes`, `keywordCoverage` and the id table `ATS_CHECKS`, which the live runner uses to validate the Recruiter's report. The score says how ready the résumé is and never a hiring chance.

## lib/company-culture.ts

`COMPANIES` is a short checked list of employers and the values they publish. Each entry has the official page URL and the date it was read (`checkedOn`). Value names are the company's own, and the meanings and expectations are our wording.

`detectCompany(jobText)` returns a `CompanyCulture` (`origin: "built-in"`, note "From the company's own page, checked <date>.") or `undefined`. It's conservative. A name counts only when the posting uses it as the employer. Ordinary words ("Grab", "meta description") and tool mentions ("experience with AWS", "Stripe API") don't count, and a tie gives no answer.

`showItTips(values)` returns up to three tips from a rules table keyed on the theme of each value's name and meaning, so it also works for values found on the web. The live runner uses both. See `docs/agents.md`.

## lib/safety.ts

`runSafetyCheck(resumes, job)` masks personal data out of every résumé and the job text, and checks the job text for prompt-injection patterns. Nothing it touches is saved.

- `maskedResumes` and `maskedJob`: the same input with email, phone, address and NRIC/FIN-style IDs replaced by placeholders.
- `piiFound`: one entry per category found, with a count. The report keeps no raw match.
- `injectionFlags`: one entry per suspicious pattern, with a short snippet of the job text around it.
- `stored`: always `false`, so a caller can show that nothing was saved.

## lib/rag.ts

- `chunkResume(text)` splits résumé text into one passage per line or sentence.
- `retrieveForSkill(chunks, skill)` ranks those passages for one skill and returns the best match.
- `buildRetrievalSteps(chunks, jobText)` runs that for every skill the job or résumé mentions, sorted by score.
- `verifyQuote(sourceText, quote)` and `scoreWithGrounding(evidence, quote, sourceText)` carry the rule the product promises. A quote that isn't a literal match in the source text scores 0.

## lib/skill-playbooks.ts and lib/site-logos.ts

`playbooks` is a hand-written list with one entry per catalog skill. Each entry has three short steps, a résumé line to copy and checked https links with a kind (Course, Docs, Practice, Video, Tool, Dataset or Guide). `playbookFor(name)` looks one up, `tipKind(skill)` picks the tip kind from a skill's evidence (build it, show it or measure it) and `questFor` / `enrichQuest` turn a playbook into a `Quest`. A `Quest` carries optional `kind`, `steps`, `bullet` and `links`, so older tips without them still render. Nothing here is fetched live.

`site-logos.ts` maps a link's host to a file in `public/assets/logos` (`siteLogo`, `hostOf`). A host with no file gets a lettered tile. `lib/skill-playbooks.test.ts` checks that every link is https and every mapped logo file exists.

## lib/sg-snapshot.ts, lib/signals-news.ts, lib/native-scraper.ts and lib/news-sites.ts

These four modules sit behind the Singapore hiring signals card and `POST /api/signals`. No model runs in any of them.

- `sg-snapshot.ts` holds the dated, sourced figures and `aiSkillsDefinition`, IMDA's own list of what counts as an AI skill (note 13, page 24 of the 2026 report). `snapshotForMcp()` exports it all for the MCP tool.
- `signals-news.ts` is safe to import in the browser. It has the host allowlist (`NEWS_SOURCES`, `allowedUrl`, `sourceFor`), text cleaning (`plainText`), item shaping, the 10 minute cache and `refreshNews(input)`. `refreshNews` runs the native reader first when the route passes one in (`native`), then adds a Firecrawl search if a key exists, and replies with `method` set to `native`, `native+firecrawl` or `firecrawl`.
- `native-scraper.ts` is server only. `fetchNativeNews(max, deps)` reads the feeds in `FEEDS` and returns `{ items, ok, total }`. `safeGet` is the guarded fetch: https, exact hosts, resolved addresses checked with `isPrivateIp`, manual redirects capped at 3, 6 second timeout, 1.5 MB cap, content type check. `parseFeed` reads RSS 2.0 and Atom, `parsePressList` reads the MOM press-release page, `isRelevant` and `shapeEntries` keep recent stories about work and tech and shape them as `{ title, source, url, date, snippet }`. Pass `fetchImpl` and `resolve` to test it without a network.
- `news-sites.ts` lists the sites in the Latest news and sources popup, in groups. Logo files live in `public/assets/logos` (origins in `SOURCES.md` there).

## lib/skill-news.ts, lib/skill-news-client.ts and POST /api/skill-news

These give each tip its "Latest on {skill}" list. No key is used and no model runs.

- `skill-news.ts` is safe to import in the browser. It has `TECH_SOURCES` (seven feeds from the Tech and AI group of `news-sites.ts`, and a test keeps them in step), `techUrl` (https links on those hosts only), `parseSkillNewsBody` (1 to 3 catalog skill names and no other field, 600 characters at most), `skillTerms` and `skillScore` (the catalog terms for a skill, minus everyday words such as "rest", "react" and "present"), `pickForSkill` (up to 3 articles, best fit then newest, a title hit or two different terms needed), `createTechCache` (one shared 15 minute read, concurrent lookups share it, a read that reached no feed is not kept) and `answerSkillNews`. The last runs the checks in order: host, request body, per-visitor limit (20 an hour), cached read, filter. Replies hold titles, sources, dates and links only.
- `native-scraper.ts` adds `fetchTechEntries` and `shapeTechEntries`. They reuse `safeGet` with a `hosts` list, so the tech reader connects only to the tech feed hosts and the news reader only to its own.
- `skill-news-client.ts` is the browser side. `loadSkillNews(skill, force)` batches skills asked for in the same moment into one request, keeps an answer for 5 minutes, and re-checks every link with `techUrl` before it becomes an anchor. The tips load it only when a tip is opened.

## lib/mcp-tools.ts

`mcpToolCatalog` describes the four MCP tools that itsa10but registers with `document.modelContext`. The registration itself stays in the career workspace component.

`recordMcpCallStart(tool, input)`, `recordMcpCallEnd(id, ok, summary)`, `getMcpCallLog()` and `clearMcpCallLog()` give an MCP panel a shared log of recent calls, newest first, capped at 20 entries.

## lib/simulated-engine.ts

`runSimulatedEngine(resumes, job, options)` runs Native scan. It's an async generator. A UI can `for await` over its events, or an API route can turn it into a stream, as `app/api/engine/stream/route.ts` does.

It runs these steps in order:

1. A safety pass that masks personal data and scans for prompt injection.
2. A retrieval pass over the masked résumé text.
3. The four readers in sequence (Role Scout, Experience Finder, Recruiter, Action Planner).

Each reader receives a handoff and a streamed reasoning note before its stage completes. All except the Recruiter also get a retrieval citation, because the Recruiter reads cold.

The readers show these lanes:

- Experience Finder: `resume-search`, `quote-verify`, `evidence-score` and `doubt-flag` (weak-proof flags).
- Recruiter: one lane per ATS group, `ats-parse`, `ats-keywords`, `ats-wording` and `ats-format`.
- Role Scout: `company-detect` ("Checking for the company's values"). It matches the masked posting against the built-in employer list and ends with either the company and its value count or "No known employer found".

Every event carries `simulated: true`, except the `safety` event. That one is a real, non-AI check and is marked `simulated: false`, so the UI can tell the two apart. The final `complete` event carries the full `Analysis` (including `ats`), the retrieval steps and the safety summary.

## Tests

Every module above has a `*.test.ts` file next to it. `npm test` runs them with Node's built-in test runner and `--experimental-strip-types`, so it reads the `.ts` files directly. The project has no test dependency.

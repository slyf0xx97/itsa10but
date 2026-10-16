# Export

`components/career/export-bar.tsx` offers two downloads built in the browser from the finished `Analysis`, the visitor's résumé text and the role text. Nothing is sent anywhere and nothing is stored. Both builders load on click.

Props: `ExportBar({ analysis, resumes, job, sample? })`. File names are `itsa10but-report.pdf` and `itsa10but-ai-prompt.md`, with `-sample` before the extension for a sample result.

## PDF report (`lib/report-pdf.ts`)

`buildPdf(input)` writes a hand-made PDF 1.4 (A4, Helvetica, no library, uncompressed text). It holds a header (role, date, mode line, overall figure out of 10 with a bar), a "How to read this" box, then one section per reader: Role Scout (want level per skill, employer note), Experience Finder (proof level, 0 to 100 bar, literal quote or "No matching quote, scores 0"), Recruiter (ATS-style score, each check with a word, keywords, fixes, review notes) and Action Planner (tips, steps, free links). Every page has a footer with the page number. Characters outside WinAnsi print as "?".

## AI prompt (`lib/report-md.ts`)

`buildPromptMarkdown(input)` writes a prompt for the visitor's own AI: the method behind the findings (sample, native scan or API boost with model), rules (use only my facts, no invented numbers), the role text, the résumé in a fenced block, what each of the four readers found with literal quotes, five numbered tasks and an output format.

Shared helpers (overall figure, mode label) are in `lib/report-shared.ts`.

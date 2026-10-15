"use client";

import { useCallback, useId, useState, type CSSProperties, type ReactNode } from "react";
import type { Analysis, Quest } from "@/lib/analysis-types";
import { dashboardData, fixParts, type PlannerRow } from "@/lib/dashboard-data";
import { PixelAgent, type SpriteKind } from "@/components/career/reader-cards";
import { SkillBrowser } from "@/components/career/skill-browser";
import { Marked, useQuestTicks } from "@/components/career/trials";
import { SkillRefs } from "@/components/career/skill-refs";
import { glideTo } from "@/components/glide-to";
import { Term } from "@/components/career/term";
import { Popup } from "@/components/popup";
import { POPUP_ADDS, companyMissing, modeInfo, quoteRows, readerSteps, type ReaderKey } from "@/lib/findings-info";
import { PixelIcon, type PixelIconName } from "@/components/career/pixel-icons";
import { Check } from "lucide-react";

const pct = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const fill = (value: number) => ({ width: pct(value) + "%" });

/** One row of a bar chart: name and number on top, the bar underneath. The bar is decoration; the numbers are the text. */
function BarRow({ name, value, bar, note, extra, flag }: { name: string; value: ReactNode; bar: number; note?: ReactNode; extra?: ReactNode; flag?: ReactNode }) {
  return <li className="dash-row">
    <span className="dash-name">{name}</span>
    <span className="dash-val">{flag}{value}</span>
    <span className="dash-track" aria-hidden="true">{extra}<i className="dash-fill" style={fill(bar)} /></span>
    {note && <span className="dash-note">{note}</span>}
  </li>;
}

const Empty = ({ children }: { children: string }) => <p className="dash-empty">{children}</p>;

/** A ring drawn with one stroke each (pathLength 100, so a value is its own dash length). The text sits in the middle. */
function Ring({ pct: value, label, small, children }: { pct: number; label: string; small?: boolean; children: ReactNode }) {
  return <div className={"dash-gauge" + (small ? " mini" : "")} role="img" aria-label={label}>
    <svg viewBox="0 0 100 100" focusable="false" aria-hidden="true">
      <circle className="dash-gauge-track" cx="50" cy="50" r="42" pathLength={100} />
      {value > 0 && <circle className="dash-gauge-fill" cx="50" cy="50" r="42" pathLength={100} strokeDasharray={value + " 100"} transform="rotate(-90 50 50)" style={{ "--len": value } as CSSProperties} />}
    </svg>
    <p className="dash-gauge-num" aria-hidden="true">{children}</p>
  </div>;
}

/** The pixel icon on each agent's button shows its job: binoculars, magnifier over a document, clipboard with a tick, checklist. */
const ROLE_ICON: Record<SpriteKind, PixelIconName> = { scout: "binoculars", finder: "docsearch", recruiter: "clipboard", coach: "checklist" };

/**
 * One reader's card: avatar, name and short title, a summary with visuals. The "See full findings" button sits at the top right with
 * the line that says what it opens beside it, so the two read as one unit. The button opens the full findings in a wide popup.
 */
function SumCard({ kind, agent, title, id, button, popTitle, summary, reader, analysis, hasResult, children }: { kind: SpriteKind; agent: string; title: ReactNode; id?: string; button: string; popTitle: string; summary: ReactNode; reader: ReaderKey; analysis: Analysis; hasResult: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const titleId = useId();
  const helpId = useId();
  return <section className={"dash-card " + kind} id={id} aria-labelledby={titleId}>
    <header className="dash-card-head">
      <span className="dash-ava"><PixelAgent kind={kind} small /></span>
      <div className="dash-who"><p className="dash-agent">{agent}</p><h4 id={titleId}>{title}</h4></div>
      <p className="dash-adds" id={helpId}>{POPUP_ADDS[reader]}</p>
      <button type="button" className="dash-open" aria-haspopup="dialog" aria-describedby={helpId} onClick={() => setOpen(true)}>
        <span className="dash-open-icon"><PixelIcon name={ROLE_ICON[kind]} size={32} /></span>
        <span>{button}<span className="sr-only"> from {agent}</span></span>
      </button>
    </header>
    <div className="dash-sum">{summary}</div>
    <Popup open={open} onClose={close} title={popTitle} wide>
      {open && <div className="dp"><FindingsIntro reader={reader} analysis={analysis} hasResult={hasResult} /><div className="dp-main" data-reader={reader}>{children}</div></div>}
    </Popup>
  </section>;
}

/** Top of every findings popup: the mode that ran, then the steps the reader took in order, side by side so they take about three lines. */
function FindingsIntro({ reader, analysis, hasResult }: { reader: ReaderKey; analysis: Analysis; hasResult: boolean }) {
  const mode = modeInfo(analysis.mode, hasResult, analysis.run);
  const steps = readerSteps(reader, analysis);
  const headId = useId();
  return <div className="fi-top">
    <p className="fi-mode"><span className="fi-badge"><span className="sr-only">Mode that ran: </span>{mode.name}</span><span className="fi-mode-note">{mode.note}</span></p>
    <section className="fi-did" aria-labelledby={headId}>
      <h5 className="fi-did-h" id={headId}>What this reader did, in order</h5>
      <p className="fi-did-note">{mode.steps}</p>
      <ol className="fi-steps" style={{ "--fi-cols": Math.min(steps.length, 5) } as CSSProperties}>{steps.map((step) => <li key={step}><span>{step}</span></li>)}</ol>
    </section>
  </div>;
}

/** The quote behind each finding with where it came from. A side with no match says so and scores 0 for that source. */
function QuoteList({ analysis, names, sides }: { analysis: Analysis; names?: string[]; sides: ("role" | "resume")[] }) {
  const rows = quoteRows(analysis.skills, names);
  if (!rows.length) return <Empty>No skills to show quotes for.</Empty>;
  const side = (tag: string, hit: { source: string; quote: string } | null) => hit
    ? <p className="fi-q"><span className="fi-q-tag">{tag}</span><q>{hit.quote}</q><small>Source: {hit.source}</small></p>
    : <p className="fi-q none"><span className="fi-q-tag">{tag}</span><span><span aria-hidden="true">✗ </span>No match found. Scores 0 for this source.</span></p>;
  return <ul className="fi-quotes">
    {rows.map((row) => <li key={row.name}>
      <h6>{row.name}</h6>
      {sides.includes("role") && side("Role quote", row.role)}
      {sides.includes("resume") && side("Résumé quote", row.resume)}
    </li>)}
  </ul>;
}

/** A titled block inside a findings popup: heading, one plain line about it, then the content. */
function PopSection({ title, desc, children }: { title: string; desc: ReactNode; children: ReactNode }) {
  const id = useId();
  return <section className="dp-sec" aria-labelledby={id}>
    <h5 className="dp-h" id={id}>{title}</h5>
    {desc ? <p className="dp-desc">{desc}</p> : null}
    {children}
  </section>;
}

const STATUS = { pass: { mark: "✓", word: "Passed" }, warn: { mark: "!", word: "To check" }, fail: { mark: "✗", word: "To fix" } } as const;

function Chips({ list, kind }: { list: { shown: string[]; more: number }; kind: "found" | "missing" }) {
  if (!list.shown.length) return <p className="dash-empty">{kind === "found" ? "None found." : "None missing."}</p>;
  return <ul className={"dash-chips " + kind}>
    {list.shown.map((word) => <li key={word}>{word}</li>)}
    {list.more > 0 && <li className="more">+{list.more} more</li>}
  </ul>;
}

type Ats = NonNullable<ReturnType<typeof dashboardData>["ats"]>;
type Company = NonNullable<ReturnType<typeof dashboardData>["company"]>;

/** Bold lead plus one line. Text with a colon, dash or comma splits there; other text keeps its first words highlighted inside one sentence. */
function Lead({ text }: { text: string }) {
  const { key, rest } = fixParts(text);
  const split = /^\s*[:—–,]/.test(rest);
  return <p className="cl-text">{split
    ? <><strong className="cl-lead"><span className="hl">{key}</span></strong>{rest.replace(/^\s*[:—–,]\s*/, "")}</>
    : <><span className="hl">{key}</span>{rest}</>}</p>;
}

const TONE_MARK = { ready: "✓", almost: "!", work: "✗" } as const;

/** Recruiter summary: score band and the three counts. The fixes live in the popup so every card stays one height. */
function AtsBlock({ ats }: { ats: Ats }) {
  const { counts, verdict } = ats;
  const tiles = [
    { cls: "pass", mark: "✓", count: counts.pass, label: "Passed" },
    { cls: "warn", mark: "!", count: counts.warn, label: "To check" },
    { cls: "fail", mark: "✗", count: counts.fail, label: "To fix" },
  ];
  return <>
    <div className="ats-band">
      <div className="ats-score">
        <p className="ats-num"><b>{ats.score}</b><span>/ 100</span></p>
        <p className={"ats-verdict " + verdict.tone}><span aria-hidden="true">{TONE_MARK[verdict.tone]}</span> {verdict.word}</p>
      </div>
      <div className={"ats-seg " + verdict.tone} aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => <i key={index} className={index < ats.segments ? "on" : ""} />)}
      </div>
    </div>
    <ul className="ats-tiles" aria-label="Résumé check results">
      {tiles.map((tile) => <li key={tile.cls} className={tile.cls}>
        <span className="ats-tile-top"><span className="ats-mark" aria-hidden="true">{tile.mark}</span><b>{tile.count}</b></span>
        <span className="ats-tile-label">{tile.label}</span>
      </li>)}
    </ul>
  </>;
}

/** Recruiter popup: every check in three columns by result (To fix, To check, Passed). Each check carries its group (Parse, Keywords, Wording, Format) as a small tag. Items are grid cells of the popup. */
function AtsColumns({ ats }: { ats: Ats }) {
  const checks = ats.allGroups.flatMap((group) => group.checks.map((check) => ({ ...check, group: group.label })));
  // The top fixes are the tips of the first failing or warning checks, so the order shows on the check itself.
  const firstFix = (tip: string) => ats.fixes.findIndex((fix) => (fix.key + fix.rest).trim() === tip.trim());
  if (!checks.length) return <PopSection title="Checks" desc=""><Empty>No checks ran.</Empty></PopSection>;
  return <>
    {(["fail", "warn", "pass"] as const).map((status) => {
      const list = checks.filter((check) => check.status === status);
      return <section className={"dp-sec ats-col " + status} key={status} aria-label={STATUS[status].word}>
        <h5 className="dp-h"><span className="ats-col-mark" aria-hidden="true">{STATUS[status].mark}</span> {STATUS[status].word} <span className="ats-col-n">{list.length}</span></h5>
        {list.length ? <ul className="dash-checks">
          {list.map((check) => <li key={check.id} className={check.status}>
            <span className="dash-check-mark" aria-hidden="true">{STATUS[check.status].mark}</span>
            <span><span className="sr-only">{STATUS[check.status].word}: </span><b>{check.label}</b> <span className="ats-tag">{check.group}</span>{firstFix(check.tip) >= 0 && <span className="ats-do">Do {["1st", "2nd", "3rd"][firstFix(check.tip)]}</span>}{status !== "pass" && check.tip && <small>{check.tip}</small>}</span>
          </li>)}
        </ul> : <p className="dash-empty">{status === "fail" ? "Nothing to fix." : status === "warn" ? "Nothing to check." : "No check passed."}</p>}
      </section>;
    })}
  </>;
}

/** Recruiter popup: keywords found and missing as one more column, and the honest note as a line under the columns. */
function AtsKeywords({ ats }: { ats: Ats }) {
  const id = useId();
  return <>
    <section className="dp-sec ats-kw" aria-labelledby={id}>
      <h5 className="dp-h" id={id}>Role keywords</h5>
      <div><p className="dash-chip-label">In your résumé</p><Chips list={ats.found} kind="found" /></div>
      <div><p className="dash-chip-label">Not in your résumé</p><Chips list={ats.missing} kind="missing" /></div>
    </section>
    {ats.note && <p className="dash-ats-note ats-note"><span>{ats.note}</span></p>}
  </>;
}

type Data = ReturnType<typeof dashboardData>;

/** Experience Finder rows: the mark on each bar is what the role asks for; the flag says whether a quote was found. */
function EvidenceRows({ rows, label }: { rows: Data["evidence"]; label: string }) {
  return <ul className="dash-rows" aria-label={label}>
    {rows.map((row) => <BarRow key={row.name} name={row.name} value={row.evidence} bar={row.evidence}
      extra={<b className="dash-mark" style={{ left: pct(row.demand) + "%" }} />}
      flag={<span className={"dash-q " + (row.hasQuote ? "yes" : "no")}><span aria-hidden="true">{row.hasQuote ? "✓" : "✗"}</span><span className="sr-only">{row.hasQuote ? "Quote found in your résumé. Score " : "No matching quote. Score "}</span></span>} />)}
  </ul>;
}

const safeUrl = (url: string) => /^https?:\/\//i.test(url);

/** Role Scout company block: values as chips (a click opens every meaning in a popup), what they expect, reputation, how to show it, sources. */
function CompanyBody({ company, mode }: { company: Company | null; mode: Analysis["mode"] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  if (!company) {
    const missing = companyMissing(mode);
    return <div className="co-none">
      <div><p className="co-none-title">{missing.title}</p><p>{missing.text}</p></div>
    </div>;
  }
  const sources = company.sources.filter((source) => safeUrl(source.url));
  return <>
    <div className="co-head">
      <p className="co-name">{company.name}</p>
      <span className="co-origin">{company.originLabel}</span>
    </div>
    <div className="co-cols">
      {company.chips.shown.length > 0 && <section aria-labelledby="co-values-title">
        <h5 className="ats-h" id="co-values-title">Values &amp; principles</h5>
        <ul className="co-chips">
          {company.chips.shown.map((name) => <li key={name}><button type="button" className="co-chip" onClick={() => setOpen(true)}><span className="co-dot" aria-hidden="true" />{name}</button></li>)}
          {company.chips.more > 0 && <li><button type="button" className="co-chip more" onClick={() => setOpen(true)}>+{company.chips.more} more</button></li>}
        </ul>
        <button type="button" className="co-see" onClick={() => setOpen(true)}>See what each means</button>
      </section>}
      {company.expectations.length > 0 && <section aria-labelledby="co-expect-title">
        <h5 className="ats-h" id="co-expect-title">What they expect</h5>
        <ul className="cl-list dash-fixes">
          {company.expectations.map((line) => <li className="cl-item" key={line}><span className="cl-icon" aria-hidden="true">✓</span><Lead text={line} /></li>)}
        </ul>
        {company.reputation.length > 0 && <div className="co-rep">
          <p className="dash-chip-label">From the web, check the sources</p>
          <ul>{company.reputation.map((line) => <li key={line}>{line}</li>)}</ul>
        </div>}
      </section>}
      {company.showIt.length > 0 && <section aria-labelledby="co-show-title">
        <h5 className="ats-h" id="co-show-title">Show it in your application</h5>
        <ol className="cl-list dash-fixes">
          {company.showIt.map((tip, index) => <li className="cl-item" key={tip}><span className="cl-icon" aria-hidden="true">{index + 1}</span><Lead text={tip} /></li>)}
        </ol>
      </section>}
    </div>
    <footer className="co-foot">
      {sources.length > 0 && <ul className="co-sources" aria-label="Sources">
        {sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span></a></li>)}
      </ul>}
      {company.note && <p className="co-note">{company.note}</p>}
    </footer>
    <Popup open={open} onClose={close} title={"Values at " + company.name} wide>
      <ul className="co-values">
        {company.values.map((value) => <li key={value.name}><b>{value.name}</b><p>{value.meaning}</p></li>)}
      </ul>
    </Popup>
  </>;
}

/** One tip in full: how to do it, what to show, the related skill, a tick box, then free lessons and the latest articles for the skill. The references load when this mounts, so only an opened tip asks for them. Shared by the single-tip popup and the full-plan popup. */
function QuestBody({ quest, index, ticks }: { quest: Quest; index: number; ticks: ReturnType<typeof useQuestTicks> }) {
  return <div className="pl-pop">
    <p className="pl-task"><Marked text={quest.task} terms={[quest.skill]} /></p>
    <p className="pl-show"><span><strong>What to show</strong>{quest.proof}</span></p>
    <p className="pl-skill"><span>Related skill</span> <b>{quest.skill}</b></p>
    <button type="button" className="pl-toggle" aria-pressed={ticks.isDone(index)} onClick={() => ticks.toggle(index)}>
      <span className="pl-box" aria-hidden="true">{ticks.isDone(index) && <Check size={16} strokeWidth={4} />}</span>
      Mark as done
    </button>
    <SkillRefs skill={quest.skill} />
  </div>;
}

/** Closes the popup it sits in, then glides to the Level up stage. A link inside a modal dialog would otherwise leave the dialog open on top. */
function LevelUpLink() {
  return <p className="pl-more">More free courses and tools are in <a href="#level-up" onClick={(event) => { event.currentTarget.closest("dialog")?.close(); glideTo(event, "level-up"); }}>Level up</a>, under Build useful skills.</p>;
}

/** Action Planner: the first tips in order. A row opens the full tip; the tick box beside it marks it done without opening anything. The card button opens every tip in full. */
function PlannerCard({ quests, rows, verdict, skillNames, analysis, hasResult }: { quests: Quest[]; rows: PlannerRow[]; verdict: string; skillNames: string[]; analysis: Analysis; hasResult: boolean }) {
  const ticks = useQuestTicks(quests);
  const [openAt, setOpenAt] = useState<number | null>(null);
  const close = useCallback(() => setOpenAt(null), []);
  const quest = openAt === null ? undefined : quests[openAt];
  const names = [...skillNames, ...quests.flatMap((item) => [item.skill, item.title])];
  const summary = <>
    {verdict && <p className="pl-start"><Marked text={verdict} terms={names} /></p>}
    {rows.length ? <>
      <ol className="pl-list" aria-label="Tips and tricks, in order">
        {rows.map((row) => {
          const done = ticks.isDone(row.index);
          return <li className="pl-item" key={row.index} data-done={done}>
            <button type="button" className="pl-tick" aria-pressed={done} aria-label={`Mark ${row.title} as done`} onClick={() => ticks.toggle(row.index)}>
              <span className="pl-box" aria-hidden="true">{done && <Check size={16} strokeWidth={4} />}</span>
            </button>
            <button type="button" className="pl-open" aria-haspopup="dialog" onClick={() => setOpenAt(row.index)}>
              <span className="pl-title"><span className="pl-num" aria-hidden="true">{row.index + 1}</span><span>{row.title}{done && <span className="sr-only">, done</span>}</span></span>
              <span className="pl-chips">{row.skill}</span>
            </button>
          </li>;
        })}
      </ol>
    </> :<Empty>No tips yet.</Empty>}
    <Popup open={!!quest} onClose={close} title={quest?.title ?? "Tip"}>
      {quest && openAt !== null && <><QuestBody quest={quest} index={openAt} ticks={ticks} /><LevelUpLink /></>}
    </Popup>
  </>;
  return <SumCard kind="coach" id="quests" agent="Action Planner" title={<><Term id="quest">Tips and tricks</Term> to close your gaps</>} button="See all the tips" popTitle="Your tips and tricks" summary={summary} reader="planner" analysis={analysis} hasResult={hasResult}>
    <PopSection title="The tips, in order" desc="Do them top to bottom. Each one ends with something you can show.">
      {rows.length ? <ol className="pl-full">
        {rows.map((row) => <li key={row.index}>
          <h6 className="pl-full-h"><span className="pl-num" aria-hidden="true">{row.index + 1}</span> {row.title}</h6>
          <p className="pl-why">{row.why}</p>
          <QuestBody quest={quests[row.index]} index={row.index} ticks={ticks} />
        </li>)}
      </ol> : <Empty>No tips yet.</Empty>}
      <LevelUpLink />
    </PopSection>
    <PopSection title="Quotes behind the tips" desc="For each tip's skill, the role line and the résumé line the plan started from. Each was checked word for word against its source.">
      <QuoteList analysis={analysis} names={rows.map((row) => row.skill)} sides={["role", "resume"]} />
    </PopSection>
  </SumCard>;
}

/** How many bars each summary card draws. */
const SCOUT_BARS = 4;
const FINDER_BARS = 3;

/**
 * One glass dashboard that pulls all four readers together: four cards of the same height, one per reader. Each card is a
 * summary with a few visuals and one button that opens the full findings in a popup. Every number comes from the analysis.
 * While the readers are still working it shows an empty frame with no figures.
 */
export function SynthesisDashboard({ analysis, hasResult, busy, madeUp = false }: { analysis: Analysis; hasResult: boolean; busy: boolean; madeUp?: boolean }) {
  if (busy) {
    return <section className="dash dash-pending" id="the-but" aria-busy="true" aria-label="Summary of all four readers">
      <div className="dash-head">
        <i className="dash-ring-ghost" aria-hidden="true" />
        <div className="dash-lead">
          <h3 className="dash-title">Your résumé is a 10! <em>But…</em></h3>
          <p className="dash-wait">The readers are still working.</p>
        </div>
      </div>
      <div className="dash-ghosts" aria-hidden="true"><i /><i /><i /><i /></div>
    </section>;
  }
  const data = dashboardData(analysis);
  const cover = data.coverage;
  const proofTotal = data.evidence.length;
  return <section className="dash" id="the-but" aria-busy="false" aria-labelledby="dash-title">
    <div className="dash-head">
      <Ring pct={data.match} label={"Match " + data.match + " percent. Proof against what the role asks."}>{data.match}<span>%</span></Ring>
      <div className="dash-lead">
        {hasResult && !madeUp ? <p className="sr-only">Your result, all four readers</p> : <p className="tag sample dash-sample">Sample result for a made-up candidate, not your résumé</p>}
        <h3 className="dash-title" id="dash-title">Your résumé is a 10! <em>But…</em></h3>
      </div>
    </div>

    <div className="dash-grid">
      <SumCard kind="scout" agent="Role Scout" title="Reads the job posting" button="See full findings" popTitle="What the role asks for" reader="scout" analysis={analysis} hasResult={hasResult} summary={<>
        {data.demand.length ? <ul className="dash-rows" aria-label="The skills the role asks for most, highest first">
          {data.demand.slice(0, SCOUT_BARS).map((bar) => <BarRow key={bar.name} name={bar.name} value={bar.value} bar={bar.value} />)}
        </ul> : <Empty>No skills to chart yet.</Empty>}
        {cover.total > 0 && <div className="dash-strip">
          <div className="dash-segs" aria-hidden="true">{cover.marks.map((mark, index) => <i key={index} className={mark} />)}</div>
          <p className="dash-legend"><span><i className="sw have" aria-hidden="true" /> Have {cover.have}</span><span><i className="sw gap" aria-hidden="true" /> Gap {cover.total - cover.have}</span></p>
        </div>}
        <p className={"dash-company" + (data.company ? "" : " none")}>{data.company ? data.company.name : companyMissing(analysis.mode).short}</p>
      </>}>
        <SkillBrowser kind="scout" skills={analysis.skills} />
        <PopSection title="About the company" desc="Values, what it expects and how to show you fit."><CompanyBody company={data.company} mode={analysis.mode} /></PopSection>
      </SumCard>

      <SumCard kind="finder" agent="Experience Finder" title="Reads your résumé" button="See full findings" popTitle="What your résumé proves" reader="finder" analysis={analysis} hasResult={hasResult} summary={<>
        {proofTotal ? <>
          <div className="dash-ringrow">
            <Ring small pct={(data.quotes / proofTotal) * 100} label={`${data.quotes} of ${proofTotal} skills have a matching quote in your résumé.`}>{data.quotes}<span>/{proofTotal}</span></Ring>
            <p className="dash-sub"><b>{data.quotes} of {proofTotal}</b> skills have a matching quote</p>
          </div>
          <EvidenceRows rows={data.evidence.slice(0, FINDER_BARS)} label="Proof in your résumé for the three skills the role asks for most. The mark on each bar is what the role asks for." />
          <p className="dash-key">Bar: what you show. Mark: what the role asks.</p>
        </> :<Empty>No skills to chart yet.</Empty>}
      </>}>
        <SkillBrowser kind="finder" skills={analysis.skills}>
          {data.weak.length > 0 ? <div className="dp-weak">
            <h6 className="ats-h"><span><Term id="weak-proof">Weak proof</Term>, weakest first</span></h6>
            <ul className="dash-weak" aria-label="Skills with weak proof, weakest first">
              {data.weak.map((group) => <li key={group.reason}><b>{group.names.join(", ")}</b>: {group.reason}.</li>)}
            </ul>
          </div> : proofTotal > 0 && <p className="dash-sub"><b>Every skill has proof</b> in your text.</p>}
        </SkillBrowser>
      </SumCard>

      <SumCard kind="recruiter" agent="Recruiter" title={<>Checks it like hiring software <span className="dash-nb">(<Term id="ats">ATS</Term>)</span></>} button="See full findings" popTitle="Fixes and checks from hiring software (ATS)" reader="recruiter" analysis={analysis} hasResult={hasResult}
        summary={data.ats ? <AtsBlock ats={data.ats} /> : <p className="dash-sub">No résumé check ran for this result.</p>}>
        {data.ats ? <>
          <AtsColumns ats={data.ats} />
          <AtsKeywords ats={data.ats} />
        </> : <p className="dash-sub">No résumé check ran for this result.</p>}
      </SumCard>

      <PlannerCard quests={analysis.quests} rows={data.planner} verdict={analysis.verdict} skillNames={analysis.skills.map((skill) => skill.name)} analysis={analysis} hasResult={hasResult} />
    </div>
  </section>;
}

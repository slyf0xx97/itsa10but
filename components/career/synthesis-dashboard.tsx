"use client";

import { useCallback, useId, useState, type ReactNode } from "react";
import type { Analysis, Quest, Skill } from "@/lib/analysis-types";
import { dashboardData, fixParts, rankSkills, type PlannerRow } from "@/lib/dashboard-data";
import { wantOf, type Want } from "@/lib/skill-levels";
import { PixelAgent, ResultFlow, type SpriteKind } from "@/components/career/reader-cards";
import { AgentScene, READER_MOODS } from "@/components/career/agent-scene";
import { SkillBrowser } from "@/components/career/skill-browser";
import { Marked } from "@/components/career/trials";
import { TipCard } from "@/components/career/tip-card";
import { SkillRefs } from "@/components/career/skill-refs";
import { glideTo } from "@/components/glide-to";
import { Term } from "@/components/career/term";
import { Popup } from "@/components/popup";
import { MarketNote } from "@/components/career/market-note";
import { POPUP_ADDS, companyMissing, modeInfo, quoteRows, type ReaderKey } from "@/lib/findings-info";
import { PixelIcon, type PixelIconName } from "@/components/career/pixel-icons";
import { ArrowRight, ChevronRight } from "lucide-react";
import Image from "next/image";
import { BASE_PATH } from "@/lib/base-path";
import { companyLogoFile } from "@/lib/company-logos";

const pct = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const fill = (value: number) => ({ width: pct(value) + "%" });

/** One row of a bar chart: name and number on top, the bar underneath. The bar is decoration; the numbers are the text. `tone` colours the bar (the Recruiter rows). */
function BarRow({ name, value, bar, tone, flag }: { name: string; value: ReactNode; bar: number; tone?: "pass" | "warn" | "fail"; flag?: ReactNode }) {
  return <li className="dash-row" data-tone={tone}>
    <span className="dash-name">{name}</span>
    <span className="dash-val">{flag}{value}</span>
    <span className="dash-track" aria-hidden="true"><i className="dash-fill" style={fill(bar)} /></span>
  </li>;
}

/** One plain line under a card's bars that says what a full bar means. */
const Empty = ({ children }: { children: string }) => <p className="dash-empty">{children}</p>;

/** The pixel icon on the button shows the reader's job: binoculars, magnifier over a document, clipboard with a tick, checklist. */
const ROLE_ICON: Record<SpriteKind, PixelIconName> = { scout: "binoculars", finder: "docsearch", recruiter: "clipboard", coach: "checklist" };

/** The big figure at the top of every card, the same shape on all four: the number (with a unit), and one line under it. */
function Stat({ value, unit, label }: { value: ReactNode; unit?: string; label: string }) {
  return <>
    <span className="dash-big"><b>{value}</b>{unit && <i>{unit}</i>}</span>
    <span className="dash-lab">{label}</span>
  </>;
}

/**
 * One reader's card, summary only: the reader's avatar with one big figure, exactly three rows and a full-width button. The reader cards above
 * already say who each reader is and what it does, so the card repeats neither. The button names the reader for screen readers and carries the line about
 * what it opens; it opens the full findings in a wide popup. Every figure comes from the analysis.
 */
function SumCard({ kind, agent, id, popTitle, stat, rows, reader, analysis, hasResult, sample, children }: { kind: SpriteKind; agent: string; id?: string; popTitle: string; stat: ReactNode; rows: ReactNode; reader: ReaderKey; analysis: Analysis; hasResult: boolean; sample: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [detailed, setDetailed] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return <section className={"dash-card " + kind} id={id} aria-label={agent + ", summary"}>
    <div className="dash-stat">
      <span className="dash-ava"><PixelAgent kind={kind} small /></span>
      {stat}
    </div>
    <div className="dash-body">{rows}</div>
    <button type="button" className="dash-open" aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <span className="dash-open-icon"><PixelIcon name={ROLE_ICON[kind]} size={32} /></span>
      <span className="dash-open-text"><b>See full findings<span className="sr-only"> from {agent}</span></b><small>{POPUP_ADDS[reader]}</small></span>
      <ArrowRight className="dash-open-arrow" size={22} strokeWidth={3} aria-hidden="true" focusable="false" />
    </button>
    <Popup open={open} onClose={close} title={popTitle} wide>
      {open && <div className="dp" data-view={detailed ? "detailed" : "simple"}><FindingsIntro analysis={analysis} hasResult={hasResult && !sample} detailed={detailed} onView={setDetailed} /><div className="dp-main" data-reader={reader} data-scroll={reader === "recruiter" && analysis.review ? "" : undefined}>{children}</div></div>}
    </Popup>
  </section>;
}

/** Top of every findings popup: the mode that ran, and the switch between the simple and the detailed view of this reader's findings. */
function FindingsIntro({ analysis, hasResult, detailed, onView }: { analysis: Analysis; hasResult: boolean; detailed: boolean; onView: (detailed: boolean) => void }) {
  const mode = modeInfo(analysis.mode, hasResult, analysis.run);
  return <div className="fi-top">
    <p className="fi-mode"><span className="fi-badge"><span className="sr-only">Mode that ran: </span>{mode.name}</span><span className="fi-mode-note">{mode.note}</span>{!detailed && <span className="fi-hint">Summary. Detailed adds the quotes, steps and every check.</span>}
      <span className="fi-view" role="group" aria-label="How much detail to show">
        <button type="button" aria-pressed={!detailed} onClick={() => onView(false)}>Simple</button>
        <button type="button" aria-pressed={detailed} onClick={() => onView(true)}>Detailed</button>
      </span>
    </p>
  </div>;
}

/** The quote behind each finding, one row per skill: the skill, then what the role says and what the résumé says. A side with no match says so and scores 0 for that source. */
function QuoteList({ analysis, names, sides }: { analysis: Analysis; names?: string[]; sides: ("role" | "resume")[] }) {
  const rows = quoteRows(analysis.skills, names);
  if (!rows.length) return <Empty>No skills to show quotes for.</Empty>;
  const side = (kind: "role" | "resume", tag: string, hit: { source: string; quote: string } | null) => hit
    ? <div className="fi-qcell" data-side={kind}><span className="fi-q-tag">{tag}</span><q>{hit.quote}</q><small>Source: {hit.source}</small></div>
    : <div className="fi-qcell none" data-side={kind}><span className="fi-q-tag">{tag}</span><span><span aria-hidden="true">✗ </span>No match found. Scores 0 for this source.</span></div>;
  return <ul className="fi-quotes" data-sides={sides.length}>
    {rows.map((row) => <li className="fi-qrow" key={row.name}>
      <h6 className="fi-qname">{row.name}</h6>
      {sides.includes("role") && side("role", "Role says", row.role)}
      {sides.includes("resume") && side("resume", "Résumé says", row.resume)}
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

/** Recruiter summary: the three result counts as bars out of all checks. The fixes live in the popup. */
function AtsRows({ ats }: { ats: Ats }) {
  const { counts } = ats;
  const rows = [
    { tone: "pass", mark: "✓", count: counts.pass, label: "Passed" },
    { tone: "warn", mark: "!", count: counts.warn, label: "To check" },
    { tone: "fail", mark: "✗", count: counts.fail, label: "To fix" },
  ] as const;
  return <ul className="dash-rows" aria-label="Résumé check results">
    {rows.map((row) => <BarRow key={row.tone} name={row.label} value={<>{row.count}<span className="sr-only"> of {counts.total} checks</span></>} bar={counts.total ? (row.count / counts.total) * 100 : 0} tone={row.tone}
      flag={<span className={"dash-q " + row.tone}><span aria-hidden="true">{row.mark}</span></span>} />)}
  </ul>;
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
        </ul> : <p className="dash-empty">{status === "fail" ? "No check failed." : status === "warn" ? "No check to review." : "No check passed."}</p>}
      </section>;
    })}
  </>;
}

/** Recruiter popup, first: what a recruiter notices in a quick read, what to fix first (each with the real line it is about and a way to write it), what already works and what they would ask. Rule-based, and the note under it says so. */
function RecruiterNotes({ review }: { review: NonNullable<Analysis["review"]> }) {
  const fixId = useId(), skimId = useId(), goodId = useId(), askId = useId();
  return <section className="dp-sec rv" aria-label="Recruiter notes">
    <div className="rv-main">
      <h5 className="dp-h" id={fixId}>Fix first</h5>
      <ol className="rv-fixes" aria-labelledby={fixId}>
        {review.improvements.map((item) => <li key={item.title}>
          <b>{item.title}</b>
          <span>{item.why}</span>
          {item.quote && <q className="rv-quote">{item.quote}</q>}
          {item.example && <span className="rv-try"><em>Try:</em> {item.example}</span>}
        </li>)}
      </ol>
    </div>
    <div className="rv-side">
      <section aria-labelledby={skimId}><h5 className="dp-h" id={skimId}>A recruiter notices</h5><ul>{review.skim.map((line) => <li key={line}>{line}</li>)}</ul></section>
      <section aria-labelledby={goodId}><h5 className="dp-h" id={goodId}>What works</h5><ul>{review.strengths.map((line) => <li key={line}>{line}</li>)}</ul></section>
      <section aria-labelledby={askId}><h5 className="dp-h" id={askId}>They might ask</h5><ul>{review.questions.map((line) => <li key={line}>{line}</li>)}</ul></section>
    </div>
    <p className="dash-ats-note rv-note">These notes come from fixed rules over your text. They are a quick read, not a real recruiter&apos;s view and not a hiring chance.</p>
  </section>;
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

/** Experience Finder rows: the bar is the proof in your résumé, in %. The flag says whether a quote was found. */
function EvidenceRows({ rows, label }: { rows: Data["evidence"]; label: string }) {
  return <ul className="dash-rows" aria-label={label}>
    {rows.map((row) => <BarRow key={row.name} name={row.name} value={<>{pct(row.evidence)}%</>} bar={row.evidence}
      flag={<span className={"dash-q " + (row.hasQuote ? "yes" : "no")}><span aria-hidden="true">{row.hasQuote ? "✓" : "✗"}</span><span className="sr-only">{row.hasQuote ? "Quote found in your résumé. Proof " : "No matching quote. Proof "}</span></span>} />)}
  </ul>;
}

/** Role Scout rows: the skills the role asks for most, each with how much it wants it (High, Medium or Low) as one to three segments. */
const SEGMENTS: Record<Want, number> = { High: 3, Medium: 2, Low: 1 };
/** `mark` is the company's logo file. Without one the row shows the name alone, larger. */
function PriorityRows({ skills, company, mark, missing = false }: { skills: Skill[]; company: string; mark?: { file: string }; missing?: boolean }) {
  return <ul className="dash-rows" aria-label="The skills the role asks for most, highest first, and the company">
    {rankSkills(skills).slice(0, ROWS - 1).map((skill) => {
      const want = wantOf(skill.demand);
      return <li className="dash-row" key={skill.name}>
        <span className="dash-name">{skill.name}</span>
        <span className="dash-val">{want}<span className="sr-only"> priority</span></span>
        <span className="dash-segs3" aria-hidden="true">{[0, 1, 2].map((index) => <i key={index} className={index < SEGMENTS[want] ? "on" : ""} />)}</span>
      </li>;
    })}
    <li className="dash-row dash-co">
      <span className="dash-name">About company</span>
      {mark && <span className="dash-co-logo" aria-hidden="true"><Image src={BASE_PATH + "/assets/logos/" + mark.file} width={64} height={64} alt="" unoptimized /></span>}
      {missing ? <span className="dash-co-pill">{company}</span> : <span className="dash-co-text">{company}</span>}
    </li>
  </ul>;
}

/** The logo beside "About company": the local file for an employer that has one, otherwise nothing. */
function companyMark(name: string | undefined): { file: string } | undefined {
  const file = name ? companyLogoFile(name) : null;
  return file ? { file } : undefined;
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
    {company.about && <p className="co-about">{company.about}</p>}
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

/** Closes the popup it sits in, then glides to the Level up stage. A link inside a modal dialog would otherwise leave the dialog open on top. */
function LevelUpLink() {
  return <p className="pl-more">More free courses and tools are in <a href="#level-up" onClick={(event) => { event.currentTarget.closest("dialog")?.close(); glideTo(event, "level-up"); }}>Level up</a>.</p>;
}

/** Recent articles on a tip's skill, behind a closed disclosure: nothing is looked up until the reader opens it. */
function Latest({ skill }: { skill: string }) {
  const [shown, setShown] = useState(false);
  return <details className="tip-latest" onToggle={(event) => setShown(event.currentTarget.open)}>
    <summary>Recent articles on {skill}</summary>
    {shown && <SkillRefs skill={skill} />}
  </details>;
}

/**
 * Action Planner: the first three tips as a short numbered list. A row opens that tip in full (steps, a résumé line to copy and resources as site cards). The card button opens all
 * three side by side, so the plan reads without scrolling on a wide screen. There are no tick boxes: a tip is something to read and do, not a list to check off.
 */
function PlannerCard({ quests, rows, verdict, skillNames, analysis, hasResult, sample }: { quests: Quest[]; rows: PlannerRow[]; verdict: string; skillNames: string[]; analysis: Analysis; hasResult: boolean; sample: boolean }) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  const close = useCallback(() => setOpenAt(null), []);
  const quest = openAt === null ? undefined : quests[openAt];
  const row = openAt === null ? undefined : rows.find((item) => item.index === openAt);
  const names = [...skillNames, ...quests.flatMap((item) => [item.skill, item.title])];
  const list = rows.length ? <ol className="pl-list" aria-label="Tips and tricks, in order">
    {rows.slice(0, ROWS).map((item) => <li className="pl-item" key={item.index}>
      <button type="button" className="pl-open" aria-haspopup="dialog" onClick={() => setOpenAt(item.index)}>
        <span className="pl-num" aria-hidden="true">{item.index + 1}</span>
        <span className="pl-title"><span>{item.title}</span></span>
        <ChevronRight className="pl-go" size={18} strokeWidth={3} aria-hidden="true" focusable="false" />
      </button>
    </li>)}
  </ol> : <Empty>No tips yet.</Empty>;
  return <SumCard kind="coach" id="quests" agent="Action Planner" popTitle="Your tips and tricks" reader="planner" analysis={analysis} hasResult={hasResult} sample={sample}
    stat={<Stat value={rows.length} unit={rows.length === 1 ? "tip" : "tips"} label="to close your gaps" />}
    rows={<>{list}<Popup open={!!quest} onClose={close} title={quest?.title ?? "Tip"} wide>
      {quest && row && <div className="pl-one"><TipCard quest={quest} number={row.index + 1} why={row.why} /><Latest skill={quest.skill} /><LevelUpLink /></div>}
    </Popup></>}>
    <section className="pl-sec" aria-label="Your tips, in order">
      <p className="pl-lead">{verdict ? <Marked text={verdict} terms={names} /> : "Do them top to bottom. Each one ends with something you can show."}</p>
      {rows.length ? <div className="pl-plan">
        {rows.map((item) => <TipCard key={item.index} quest={quests[item.index]} number={item.index + 1} why={item.why} compact />)}
      </div> : <Empty>No tips yet.</Empty>}
    </section>
    <details className="tip-quotes" open>
      <summary><span className="tq-title">Quotes behind the tips</span><span className="tq-count">{rows.length} {rows.length === 1 ? "skill" : "skills"}</span></summary>
      <p className="dp-desc">For each tip&apos;s skill, the role line and the résumé line the plan started from. Each was checked word for word against its source.</p>
      <QuoteList analysis={analysis} names={rows.map((item) => item.skill)} sides={["role", "resume"]} />
    </details>
  </SumCard>;
}


/** Every summary card draws exactly this many rows. */
const ROWS = 3;

/**
 * One glass dashboard that pulls all four readers together: four cards that share their rows (a figure, three rows, a takeaway, a button), one per reader. Each card
 * is a summary only; the button opens the full findings in a popup. Every number comes from the analysis. While the readers are still working it shows an empty frame
 * with no figures. The headline ends with the overall figure out of 10, and a made-up candidate is named in the text for screen readers and in every popup.
 */
/** The four result cards as placeholders, before any run: a little scene with each reader waiting its turn (one paces, one looks around, one sits, one dozes), then grey bars where its figure and rows will appear. */
const GHOST_CARDS = READER_MOODS;

/**
 * The headline of the readers stage ("Your résumé is a 10! But… it's a 6"), shown in the stage header beside the title plate so it never sits on the pipes below.
 * The figure is the overall match out of 10, from the proof in the text, and not a hiring chance. Before a run and while the readers work it shows a question mark and a short line.
 */
export function DashHeadline({ analysis, hasResult, busy, madeUp = false }: { analysis: Analysis; hasResult: boolean; busy: boolean; madeUp?: boolean }) {
  if (busy) {
    return <div className="dash-head" aria-busy="true">
      <div className="dash-lead">
        <h3 className="dash-title">Your résumé is a 10! <em>But…</em></h3>
        <p className="dash-wait">The readers are still working.</p>
      </div>
    </div>;
  }
  // Before any run (and after Start over) nothing is shown as a result: a question mark says where it will appear.
  if (!hasResult) {
    return <div className="dash-head">
      <div className="dash-lead">
        <h3 className="dash-title">Your résumé is a 10! <em>But… it’s a <b className="dash-ten" aria-hidden="true">?</b></em></h3>
        <p className="dash-wait">Play a sample, or add a role and your résumé, to see your result.</p>
      </div>
    </div>;
  }
  const overall = Math.max(0, Math.min(10, Math.round(dashboardData(analysis).match / 10)));
  return <div className="dash-head">
    <div className="dash-lead">
      <p className="sr-only">{madeUp ? "Sample result for a made-up candidate. " : "Your result, all four readers. "}The overall figure is {overall} out of 10, from the proof in your text. It is not a hiring chance.</p>
      <h3 className="dash-title" id="dash-title">Your résumé is a 10! <em>But… it’s a <b className="dash-ten" aria-hidden="true">{overall}</b></em></h3>
      {madeUp && <p className="dash-sample"><b>Sample result</b> for a made-up candidate, not your résumé.</p>}
    </div>
  </div>;
}

export function SynthesisDashboard({ analysis, hasResult, busy, madeUp = false, flow }: { analysis: Analysis; hasResult: boolean; busy: boolean; madeUp?: boolean; flow: { active: number; completed: number } }) {
  // The headline sits on a plate that the four pipes run behind, each landing on the result card of its own reader.
  const link = () => <div className="dash-link"><ResultFlow kind="bottom" active={flow.active} completed={flow.completed} /></div>;
  if (busy) {
    return <section className="dash dash-pending" id="the-but" aria-busy="true" aria-label="Summary of all four readers">
      {link()}
      <div className="dash-ghosts" aria-hidden="true"><i /><i /><i /><i /></div>
    </section>;
  }
  // Before any run (and after Start over) nothing is shown as a result: ghost cards and a question mark say where it will appear.
  if (!hasResult) {
    return <section className="dash dash-pending dash-idle" id="the-but" aria-label="Summary of all four readers, empty until a check runs">
      {link()}
      <div className="dash-ghosts is-cards" aria-hidden="true">
        {GHOST_CARDS.map((card) => <div className={"dg-card " + card.kind} key={card.kind}>
          <AgentScene kind={card.kind} mood={card.mood} />
        </div>)}
      </div>
    </section>;
  }
  const data = dashboardData(analysis);
  const proofTotal = data.evidence.length;
  const sample = !hasResult || madeUp;
  return <section className="dash" id="the-but" aria-busy="false" aria-labelledby="dash-title">
    {link()}

    <div className="dash-grid">
      <SumCard kind="scout" agent="Role Scout" popTitle="What the role asks for" reader="scout" analysis={analysis} hasResult={hasResult} sample={sample}
        stat={<Stat value={data.demand.length} unit={data.demand.length === 1 ? "skill" : "skills"} label="the role asks for" />}
        rows={data.demand.length ? <PriorityRows skills={analysis.skills} company={data.company ? data.company.name : analysis.mode === "live" ? "No employer found" : "No data found: Please enable API boost"} mark={companyMark(data.company?.name)} missing={!data.company} /> : <Empty>No skills to chart yet.</Empty>}>
        <SkillBrowser kind="scout" skills={analysis.skills} roleTitle={analysis.title} />
        <MarketNote roleTitle={analysis.title} />
        <PopSection title="About the company" desc="Values, what it expects and how to show you fit."><CompanyBody company={data.company} mode={analysis.mode} /></PopSection>
      </SumCard>

      <SumCard kind="finder" agent="Experience Finder" popTitle="What your résumé proves" reader="finder" analysis={analysis} hasResult={hasResult} sample={sample}
        stat={<Stat value={<>{data.quotes}<span className="dash-of">/{proofTotal}</span></>} label="skills have a quote" />}
        rows={proofTotal ? <EvidenceRows rows={data.evidence.slice(0, ROWS)} label="Proof in your résumé, in percent, for the three skills the role asks for most." /> : <Empty>No skills to chart yet.</Empty>}>
        <SkillBrowser kind="finder" skills={analysis.skills}>
          {data.weak.length > 0 ? <div className="dp-weak">
            <h6 className="ats-h"><span><Term id="weak-proof">Weak proof</Term>, weakest first</span></h6>
            <ul className="dash-weak" aria-label="Skills with weak proof, weakest first">
              {data.weak.map((group) => <li key={group.reason}><b>{group.names.join(", ")}</b>: {group.reason}.</li>)}
            </ul>
          </div> : proofTotal > 0 && <p className="dash-sub"><b>Every skill has proof</b> in your text.</p>}
        </SkillBrowser>
      </SumCard>

      <SumCard kind="recruiter" agent="Recruiter" popTitle="Fixes and checks from hiring software (ATS)" reader="recruiter" analysis={analysis} hasResult={hasResult} sample={sample}
        stat={data.ats ? <Stat value={data.ats.score} unit="/ 100" label={data.ats.verdict.word} /> : <Stat value="–" label="no check ran" />}
        rows={data.ats ? <AtsRows ats={data.ats} /> : <p className="dash-sub">No résumé check ran for this result.</p>}>
        {analysis.review && <RecruiterNotes review={analysis.review} />}
        {data.ats ? <>
          <AtsColumns ats={data.ats} />
          <AtsKeywords ats={data.ats} />
        </> : <p className="dash-sub">No résumé check ran for this result.</p>}
      </SumCard>

      <PlannerCard quests={analysis.quests} rows={data.planner} verdict={analysis.verdict} skillNames={analysis.skills.map((skill) => skill.name)} analysis={analysis} hasResult={hasResult} sample={sample} />
    </div>
  </section>;
}

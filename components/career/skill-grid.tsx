"use client";

import { BASE_PATH } from "@/lib/base-path";
import { useCallback, useState, type ReactNode } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import type { Skill } from "@/lib/analysis-types";
import { LOGO_CAPTION, officialUrl, skillArt } from "@/lib/skill-art";
import { TIERS, TIER_LABEL, groupByTier, stateOf, type Tier } from "@/lib/radar-tiers";
import { PixelIcon, type PixelIconName } from "@/components/career/pixel-icons";
import { RadarLegend, SkillRadar } from "@/components/career/skill-radar";
import { Term } from "@/components/career/term";
import { BestArt, GapArt, Gauge, MatchArt } from "@/components/career/stat-tile-art";
import type { TermId } from "@/lib/glossary";
import { radarFacts } from "@/lib/radar-facts";
import { wantDots, wantOf } from "@/lib/skill-levels";
import { PROOF_STEP_TOTAL } from "@/lib/proof-steps";
import { Popup } from "@/components/popup";

/** Chips shown per tier before the rest go behind a "+n more" popup. */
const TIER_MAX = 8;

function Chip({ skill }: { skill: Skill }) {
  const state = stateOf(skill.evidence);
  const stateText = state === "have" ? "Have" : "Gap";
  const art = skillArt(skill.name);
  const link = officialUrl(skill.name);
  const body = <>
    <span className="sg-mark" aria-hidden="true">{art.logos.length
      ? <Image src={BASE_PATH + "/tool-logos/" + art.logos[0]} width={22} height={22} alt="" unoptimized />
      : <PixelIcon name={art.icon} size={20} />}</span>
    <span className="sg-name">{skill.name}</span>
    <span className="sg-state" aria-hidden="true">{state === "have" ? <Check size={11} strokeWidth={4} /> : "!"}</span>
  </>;
  if (!link) return <span className={"sg-chip " + state} title={skill.name}>{body}<span className="sr-only">, {stateText}</span></span>;
  const host = new URL(link.url).hostname.replace(/^www\./, "");
  const label = `${skill.name} (${stateText}): ${link.kind === "official" ? "open" : "learn more at"} ${host}, new tab`;
  return <a className={"sg-chip " + state} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={label} title={skill.name}>{body}</a>;
}

/** One tier: an icon, the tier word with its tooltip, up to eight chips, and a "+n more" button that opens all of them. */
function TierGroup({ tier, skills }: { tier: Tier; skills: Skill[] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const rest = skills.length - TIER_MAX;
  return <section className={"sg-group " + tier} aria-label={TIER_LABEL[tier]}>
    <h5><Term id={tier} /> <span className="sg-count">{skills.length}</span></h5>
    <ul>
      {skills.slice(0, TIER_MAX).map((skill) => <li key={skill.name}><Chip skill={skill} /></li>)}
      {rest > 0 && <li><button type="button" className="sg-more" aria-haspopup="dialog" onClick={() => setOpen(true)}>+{rest} more<span className="sr-only"> {TIER_LABEL[tier]} skills</span></button></li>}
    </ul>
    {rest > 0 && <Popup open={open} onClose={close} title={`${TIER_LABEL[tier]} skills (${skills.length})`} wide>
      <ul className="sg-pop">{skills.map((skill) => <li key={skill.name}><Chip skill={skill} /></li>)}</ul>
    </Popup>}
  </section>;
}

/** Role Scout "Matches" tab: the count, the Have / Gap key and the skills as icon chips, grouped by how much the role asks. */
export function MatchesBody({ skills }: { skills: Skill[] }) {
  const groups = groupByTier(skills);
  if (skills.length === 0) return <p className="dash-empty">No skills to show yet.</p>;
  return <>
    <p className="so-legend">
      <span className="so-key have"><i className="sg-state have" aria-hidden="true"><Check size={11} strokeWidth={4} /></i> <b><Term id="proof">Have</Term></b> your résumé shows it</span>
      <span className="so-key gap"><i className="sg-state gap" aria-hidden="true">!</i> <b><Term id="gap">Gap</Term></b> no proof yet</span>
    </p>
    <div className="sg">
      {TIERS.filter((tier) => groups[tier].length).map((tier) => <TierGroup key={tier} tier={tier} skills={groups[tier]} />)}
      <p className="logo-caption">{LOGO_CAPTION}</p>
    </div>
  </>;
}

const pct = (n: number) => Math.max(0, Math.min(100, n)) + "%";
const upper = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** A tile is a vertical card: label, big figure, a plain line, three rows and a closing line. All three tiles use this one frame, so they line up. */
function Tile({ kind, icon, term, art, head, list, foot }: { kind: "best" | "gap" | "match"; icon: PixelIconName; term: TermId; art: ReactNode; head: ReactNode; list?: ReactNode; foot: string }) {
  return <li className={"so-tile " + kind}>
    {art}
    <div className="so-tile-body">
      <div className="so-tile-head">
        <span className="so-tile-label"><PixelIcon name={icon} size={16} /><Term id={term} /></span>
        {head}
      </div>
      {list}
      <p className="so-tile-foot">{foot}</p>
    </div>
  </li>;
}

/** Five notches, one per proof step. Filled notches are steps the résumé passes. The notches are decoration, the row's figure is the text. */
function Notches({ done, total = PROOF_STEP_TOTAL }: { done: number; total?: number }) {
  return <span className="so-steps" aria-hidden="true">{Array.from({ length: total }, (_, i) => <i key={i} className={i < done ? "on" : ""} />)}</span>;
}

/** One list row: a marker, the name, a figure, a bar and a short note, so every tile reads the same way. */
function Row({ mark, name, fig, meter, note, kind }: { mark: ReactNode; name: ReactNode; fig: ReactNode; meter: ReactNode; note: ReactNode; kind?: string }) {
  return <li className={"so-row" + (kind ? " " + kind : "")}>
    <span className="so-mark" aria-hidden="true">{mark}</span>
    <span className="so-row-name">{name}</span>
    <span className="so-row-fig">{fig}</span>
    {meter}
    <span className="so-row-note">{note}</span>
  </li>;
}

const WANT_WORDS = { High: "asks for it a lot", Medium: "asks for it", Low: "mentions it lightly" } as const;
const VERDICT_ROWS = [
  ["covered", "Covered", "Your proof meets what the role asks."],
  ["add", "Add proof", "You show it, but the role asks for more."],
  ["missing", "Missing", "The role asks and nothing shows it yet."],
] as const;

/** Three quick facts next to the radar. Each shows three skills (or the three verdicts) in the same frame, all from the numbers the analysis already holds. Match shows only when the analysis carries one. */
function StatTiles({ skills, matchPercent }: { skills: Skill[]; matchPercent?: number }) {
  if (!skills.length) return null;
  const facts = radarFacts(skills);
  const match = matchPercent === undefined ? 0 : Math.round(matchPercent);
  return <ul className="so-tiles" aria-label="Quick facts">
    <Tile kind="best" icon="report" term="best-proof" art={<BestArt />} foot="Put these near the top of your résumé."
      head={<>
        {facts.best.length > 0 && <span className="so-tile-row"><b className="so-tile-num">{facts.quotes}<small>/{facts.total}</small></b><span className="so-tile-unit">skills have a quote</span></span>}
        <span className="so-tile-cap">{facts.best.length ? "Your strongest skills. A tick means a quote backs it up." : "Nothing in your résumé matched a skill yet."}</span>
      </>}
      list={facts.best.length > 0 && <ol className="so-list" aria-label="Top proven skills, best first">
        {facts.best.map((row, index) => <Row key={row.name} mark={index + 1}
          name={<>{row.name}{row.hasQuote && <span className="so-tick" aria-hidden="true"> ✓</span>}<span className="sr-only">{row.hasQuote ? ", quote found" : ", no quote"}</span></>}
          fig={<><b>{row.steps}</b> of {PROOF_STEP_TOTAL} steps</>} meter={<Notches done={row.steps} />}
          note={row.steps >= PROOF_STEP_TOTAL ? "All five proof steps are done." : upper(row.have) + "."} />)}
      </ol>} />
    <Tile kind="gap" icon="search" term="biggest-gap" art={<GapArt />} foot="The tips in stage 2 close these, one small project each."
      head={<>
        {facts.gapCount > 0 && <span className="so-tile-row"><b className="so-tile-num">{facts.gapCount}<small>/{facts.total}</small></b><span className="so-tile-unit">skills fall short</span></span>}
        <span className="so-tile-cap">{facts.gapCount ? "The role asks for these more than your résumé proves. The dots show how much it asks." : "Your proof meets what the role asks."}</span>
      </>}
      list={facts.gaps.length > 0 && <ol className="so-list" aria-label="Biggest gaps, largest first">
        {facts.gaps.map((row, index) => {
          const want = wantOf(row.demand);
          return <Row key={row.name} mark={index + 1}
            name={<>{row.name}<span className="so-dots sk-dots" role="img" aria-label={`The role ${WANT_WORDS[want]}`}>{[1, 2, 3].map((n) => <i key={n} className={n <= wantDots(want) ? "on" : ""} />)}</span></>}
            fig={<><b>{row.steps}</b> of {PROOF_STEP_TOTAL} steps</>} meter={<Notches done={row.steps} />}
            note={row.fix ? <><b>Next:</b> {row.fix}.</> : "All five proof steps are done."} />;
        })}
      </ol>} />
    {matchPercent !== undefined && <Tile kind="match" icon="compass" term="match" art={<MatchArt />} foot="Match counts proof only. It is not a hiring chance."
      head={<>
        <span className="so-tile-row">
          <b className="so-tile-num">{match}<small>%</small></b>
          <Gauge pct={match} />
        </span>
        <span className="so-tile-cap">How much of what the role asks your résumé proves, skill by skill.</span>
      </>}
      list={<ul className="so-list" aria-label="Skills by verdict">
        {VERDICT_ROWS.map(([key, word, note]) => <Row key={key} kind={"lv " + key} mark="" name={word} fig={<><b>{facts.verdicts[key]}</b> of {facts.total}</>}
          meter={<span className="so-meter" aria-hidden="true"><i className="have" style={{ width: pct((facts.verdicts[key] / facts.total) * 100) }} /></span>} note={note} />)}
      </ul>} />}
  </ul>;
}

/** The teal tab on the Stage 3 panel; "Skills radar" explains how to read the chart. */
export function RadarTitle() {
  return <h3 className="quest-title"><Term id="radar" /></h3>;
}

/** Stage 3: the radar with its key right under it on the left and the three quick-fact cards in three columns on the right (radar and key, then cards below, on a narrower block). */
export function RadarPanel({ skills, matchPercent }: { skills: Skill[]; matchPercent?: number }) {
  return <div className="so">
    <div className="so-main">
      <SkillRadar skills={skills} />
      {skills.length >= 3 && <RadarLegend />}
    </div>
    <div className="so-side">
      <StatTiles skills={skills} matchPercent={matchPercent} />
    </div>
  </div>;
}

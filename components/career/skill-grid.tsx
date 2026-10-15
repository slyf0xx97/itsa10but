"use client";

import { BASE_PATH } from "@/lib/base-path";
import { useCallback, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import type { Skill } from "@/lib/analysis-types";
import { LOGO_CAPTION, officialUrl, skillArt } from "@/lib/skill-art";
import { TIERS, TIER_LABEL, groupByTier, stateOf, type Tier } from "@/lib/radar-tiers";
import { PixelIcon, type PixelIconName } from "@/components/career/pixel-icons";
import { RadarLegend, SkillRadar } from "@/components/career/skill-radar";
import { Term } from "@/components/career/term";
import { BestArt, GapArt, MatchArt } from "@/components/career/stat-tile-art";
import type { TermId } from "@/lib/glossary";
import { radarFacts } from "@/lib/radar-facts";
import { SOME_FROM, STRONG_FROM, proofOf, wantDots, wantOf, type Want } from "@/lib/skill-levels";
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

const upper = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const WANT_WORDS = { High: "asks for it a lot", Medium: "asks for it", Low: "mentions it lightly" } as const;

/** A tile is a vertical card: label, a big figure with a plain line, then its picture. All three tiles use this one frame, so they line up. */
function Tile({ kind, icon, term, art, head, list }: { kind: "best" | "gap" | "match"; icon: PixelIconName; term: TermId; art: ReactNode; head: ReactNode; list?: ReactNode }) {
  return <li className={"so-tile " + kind}>
    {art}
    <div className="so-tile-body">
      <div className="so-tile-head">
        <span className="so-tile-label"><PixelIcon name={icon} size={16} /><Term id={term} /></span>
        {head}
      </div>
      {list}
    </div>
  </li>;
}

const MEDAL = ["1st", "2nd", "3rd"] as const;

/** Best proof as a podium: block height is the proof steps passed (0 to 5), the winner in the middle. The list under it is in rank order too, so it reads the same without the picture. */
function Podium({ rows }: { rows: ReturnType<typeof radarFacts>["best"] }) {
  return <div className="pd">
    <ol className="pd-stand" aria-label="Top proven skills, best first">
      {rows.map((row, index) => <li key={row.name} className={"pd-step r" + (index + 1)} style={{ "--s": row.steps } as CSSProperties}>
        <b className="pd-fig">{row.steps}<small>/{PROOF_STEP_TOTAL}</small></b>
        <span className="pd-block" aria-hidden="true">{index + 1}</span>
        <span className="sr-only">{MEDAL[index]}: {row.name}, {row.steps} of {PROOF_STEP_TOTAL} steps{row.hasQuote ? ", quote found" : ", no quote"}</span>
      </li>)}
    </ol>
    <ul className="pd-names" aria-hidden="true">
      {rows.map((row, index) => <li key={row.name}><i className={"pd-chip r" + (index + 1)}>{index + 1}</i><span><b>{row.name}</b>{row.hasQuote && <span className="so-tick"> ✓</span>}<small>{upper(row.have)}.</small></span></li>)}
    </ul>
  </div>;
}

/** How much proof each ask needs, the same rule as the verdict (High needs Strong, Medium needs Some, Low needs Weak). */
const ASK: Record<Want, { at: number; word: string }> = { High: { at: STRONG_FROM, word: "strong" }, Medium: { at: SOME_FROM, word: "some" }, Low: { at: 1, word: "weak" } };
const GX = (value: number) => 8 + (Math.max(0, Math.min(100, value)) / 100) * 184;

/** Biggest gap as a dumbbell: a filled dot where your proof sits, a ring where the role wants it, and the line between them is the gap. The shaded zones are Weak, Some and Strong proof. */
function Dumbbell({ evidence, want }: { evidence: number; want: Want }) {
  const ask = ASK[want];
  return <svg className="gp-svg" viewBox="0 0 200 26" role="img" aria-label={`You show ${proofOf(evidence).toLowerCase()} proof. The role asks for ${ask.word}.`} focusable="false">
    <rect className="gp-zone weak" x={GX(1)} y="3" width={GX(SOME_FROM) - GX(1)} height="20" />
    <rect className="gp-zone some" x={GX(SOME_FROM)} y="3" width={GX(STRONG_FROM) - GX(SOME_FROM)} height="20" />
    <rect className="gp-zone strong" x={GX(STRONG_FROM)} y="3" width={GX(100) - GX(STRONG_FROM)} height="20" />
    <line className="gp-line" x1={GX(evidence)} x2={GX(ask.at)} y1="13" y2="13" />
    <circle className="gp-ask" cx={GX(ask.at)} cy="13" r="6" />
    <circle className="gp-you" cx={GX(evidence)} cy="13" r="6" />
  </svg>;
}

const VERDICT_SWATCH = { covered: "Covered", add: "Add proof", missing: "Missing" } as const;

/** Match as a ring split by verdict: Covered, Add proof and Missing in that order, with the match percent in the middle. */
function Donut({ pct, verdicts, total }: { pct: number; verdicts: Record<"covered" | "add" | "missing", number>; total: number }) {
  let start = 0;
  return <svg className="mt-ring" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <circle className="mt-track" cx="60" cy="60" r="44" pathLength={100} />
    {total > 0 && (["covered", "add", "missing"] as const).map((key) => {
      const share = (verdicts[key] / total) * 100;
      const drawn = Math.max(0, share - 1.2);
      const arc = share > 0 ? <circle key={key} className={"mt-seg " + key} cx="60" cy="60" r="44" pathLength={100} strokeDasharray={`${drawn} ${100 - drawn}`} strokeDashoffset={-start} /> : null;
      start += share;
      return arc;
    })}
    <text className="mt-pct" x="60" y="62" textAnchor="middle">{pct}%</text>
    <text className="mt-sub" x="60" y="82" textAnchor="middle">match</text>
  </svg>;
}

/** Three quick facts next to the radar, each drawn a different way: a podium, a dumbbell chart and a ring. All from the numbers the analysis already holds. Match shows only when the analysis carries one. */
function StatTiles({ skills, matchPercent }: { skills: Skill[]; matchPercent?: number }) {
  if (!skills.length) return null;
  const facts = radarFacts(skills);
  const match = matchPercent === undefined ? 0 : Math.round(matchPercent);
  return <ul className="so-tiles" aria-label="Quick facts">
    <Tile kind="best" icon="report" term="best-proof" art={<BestArt />}
      head={<>
        {facts.best.length > 0 && <span className="so-tile-row"><b className="so-tile-num">{facts.quotes}<small>/{facts.total}</small></b><span className="so-tile-unit">skills have a quote</span></span>}
        <span className="so-tile-cap">{facts.best.length ? "Your strongest skills. A tick means a quote backs it up." : "Nothing in your résumé matched a skill yet."}</span>
      </>}
      list={facts.best.length > 0 && <Podium rows={facts.best} />} />
    <Tile kind="gap" icon="search" term="biggest-gap" art={<GapArt />}
      head={<>
        {facts.gapCount > 0 && <span className="so-tile-row"><b className="so-tile-num">{facts.gapCount}<small>/{facts.total}</small></b><span className="so-tile-unit">skills fall short</span></span>}
        <span className="so-tile-cap">{facts.gapCount ? <span className="gp-key" aria-hidden="true"><span><i className="you" />You show</span><span><i className="ask" />Role asks</span></span> : "Your proof meets what the role asks."}</span>
      </>}
      list={facts.gaps.length > 0 && <div className="gp">
        <ol className="gp-list" aria-label="Biggest gaps, largest first">
          {facts.gaps.map((row) => {
            const want = wantOf(row.demand);
            return <li key={row.name} className="gp-row">
              <span className="gp-name">{row.name}<span className="so-dots sk-dots" role="img" aria-label={`The role ${WANT_WORDS[want]}`}>{[1, 2, 3].map((n) => <i key={n} className={n <= wantDots(want) ? "on" : ""} />)}</span></span>
              <Dumbbell evidence={row.evidence} want={want} />
              <span className="gp-note">{row.fix ? <><b>Next:</b> {row.fix}.</> : "All five proof steps are done."}</span>
            </li>;
          })}
        </ol>
        <p className="gp-axis" aria-hidden="true"><span /><span>Weak</span><span>Some</span><span>Strong</span></p>
      </div>} />
    {matchPercent !== undefined && <Tile kind="match" icon="compass" term="match" art={<MatchArt />}
      head={<span className="so-tile-cap">How much of what the role asks your résumé proves, skill by skill.</span>}
      list={<div className="mt">
        <Donut pct={match} verdicts={facts.verdicts} total={facts.total} />
        <ul className="mt-list" aria-label="Skills by verdict">
          {(Object.keys(VERDICT_SWATCH) as (keyof typeof VERDICT_SWATCH)[]).map((key) => <li key={key} className={key}><i className={"mt-swatch " + key} aria-hidden="true" /><span>{VERDICT_SWATCH[key]}</span><b>{facts.verdicts[key]}<small> of {facts.total}</small></b></li>)}
        </ul>
      </div>} />}
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

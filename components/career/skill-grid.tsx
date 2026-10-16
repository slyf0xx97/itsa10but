"use client";

import { BASE_PATH } from "@/lib/base-path";
import { useCallback, useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import type { Skill } from "@/lib/analysis-types";
import { LOGO_CAPTION, officialUrl, skillArt } from "@/lib/skill-art";
import { TIERS, TIER_LABEL, groupByTier, stateOf, type Tier } from "@/lib/radar-tiers";
import { PixelIcon } from "@/components/career/pixel-icons";
import { RadarLegend, SkillRadar } from "@/components/career/skill-radar";
import { Term } from "@/components/career/term";
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

/** Before any run: a ghost hexagon in place of the radar, so it is clear where the radar will draw. */
export function RadarEmpty() {
  return <div className="so"><div className="so-main radar-ghost">
    <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      {[1, 0.8, 0.6, 0.4, 0.2].map((k) => <polygon key={k} points={[0, 1, 2, 3, 4, 5].map((i) => { const a = (-90 + i * 60) * Math.PI / 180; return `${(100 + Math.cos(a) * 84 * k).toFixed(1)},${(100 + Math.sin(a) * 84 * k).toFixed(1)}`; }).join(" ")} />)}
      {[0, 1, 2, 3, 4, 5].map((i) => { const a = (-90 + i * 60) * Math.PI / 180; return <g key={i}><line x1="100" y1="100" x2={(100 + Math.cos(a) * 84).toFixed(1)} y2={(100 + Math.sin(a) * 84).toFixed(1)} /><circle cx={(100 + Math.cos(a) * 98).toFixed(1)} cy={(100 + Math.sin(a) * 98).toFixed(1)} r="9" /></g>; })}
    </svg>
    <p>Upload your résumé and desired role to see your skills radar!</p>
  </div></div>;
}

/** The teal tab on the Stage 3 panel; "Skills radar" explains how to read the chart. */
export function RadarTitle() {
  return <h3 className="quest-title"><Term id="radar" /></h3>;
}

/** Stage 3: the radar with its key right under it on the left and the three quick-fact cards in three columns on the right (radar and key, then cards below, on a narrower block). */
export function RadarPanel({ skills }: { skills: Skill[] }) {
  return <div className="so">
    <div className="so-main">
      <SkillRadar skills={skills} />
      {skills.length >= 3 && <RadarLegend />}
    </div>
  </div>;
}

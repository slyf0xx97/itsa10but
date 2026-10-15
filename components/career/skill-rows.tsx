"use client";

import { BASE_PATH } from "@/lib/base-path";
import { useCallback, useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Skill } from "@/lib/analysis-types";
import { skillArt } from "@/lib/skill-art";
import { rankSkills } from "@/lib/dashboard-data";
import { VERDICT_LABEL, proofOf, proofSteps, verdictOf, wantDots, wantOf, whyLine, type Proof } from "@/lib/skill-levels";
import { PixelIcon } from "@/components/career/pixel-icons";
import { Popup } from "@/components/popup";
import { Term } from "@/components/career/term";

function skillLink(name: string): { label: string; url: string } {
  const value = name.toLowerCase();
  if (value.includes("aws") || value.includes("cloud")) return { label: "Explore AWS Cloud Foundations", url: "https://aws.amazon.com/training/learn-about/cloud-practitioner/" };
  if (value.includes("python")) return { label: "Learn Python", url: "https://docs.python.org/3/tutorial/" };
  if (value.includes("sql") || value.includes("data model")) return { label: "Learn SQL", url: "https://www.postgresql.org/docs/current/tutorial.html" };
  if (value.includes("linux")) return { label: "Explore Linux", url: "https://training.linuxfoundation.org/resources/free-courses/" };
  if (value.includes("network")) return { label: "Explore networking", url: "https://www.netacad.com/courses/networking-basics" };
  if (value.includes("siem") || value.includes("sentinel")) return { label: "Explore SIEM fundamentals", url: "https://learn.microsoft.com/en-us/training/paths/sc-200-utilize-kql-for-azure-sentinel/" };
  if (value.includes("incident") || value.includes("security")) return { label: "Explore incident response", url: "https://www.cisa.gov/resources-tools/resources/incident-response" };
  if (value.includes("react")) return { label: "Learn React", url: "https://react.dev/learn" };
  if (value.includes("javascript") || value.includes("typescript")) return { label: "Explore web development", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development" };
  if (value.includes("api")) return { label: "Explore web APIs", url: "https://developer.mozilla.org/en-US/docs/Web/API" };
  if (value.includes("test")) return { label: "Explore software testing", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Testing" };
  if (value.includes("report") || value.includes("communicat")) return { label: "Improve technical writing", url: "https://developers.google.com/tech-writing" };
  if (value.includes("learning") || value.includes("mlops")) return { label: "Explore machine learning", url: "https://developers.google.com/machine-learning/crash-course" };
  if (value.includes("data") || value.includes("dashboard")) return { label: "Explore data skills", url: "https://learn.microsoft.com/en-us/training/powerplatform/power-bi" };
  return { label: "Find a learning path", url: "https://www.google.com/search?q=" + encodeURIComponent(name + " official documentation course") };
}

const logoBase = BASE_PATH + "/tool-logos/";
function SkillMark({ name }: { name: string }) {
  const art = skillArt(name);
  return <span className="mark" aria-hidden="true">{art.logos.length
    ? art.logos.map((file) => <Image key={file} src={logoBase + file} width={24} height={24} alt="" unoptimized />)
    : <PixelIcon name={art.icon} size={22} />}</span>;
}

const matched = (words: string[]) => words.map((word, i) => <span key={word + i} className="sk-m">{word}</span>);
const PROOF_ICON: Record<Proof, string> = { Strong: "✓", Some: "~", Weak: "!", None: "✕" };

/** One ranked row. The skill name is the only button (a stretched hit area makes the whole row open the quotes), so nothing interactive nests inside it. */
function Row({ skill, rank, onOpen }: { skill: Skill; rank: number; onOpen: (name: string) => void }) {
  const want = wantOf(skill.demand);
  const proof = proofOf(skill.evidence);
  const verdict = verdictOf(skill.demand, skill.evidence);
  return <li className={"rk-row " + verdict}>
    <span className="rk-rank" aria-hidden="true">{rank}</span>
    <div className="rk-main">
      <button type="button" className="rk-open" aria-haspopup="dialog" onClick={() => onOpen(skill.name)}>
        <SkillMark name={skill.name} />
        <span className="rk-name">{skill.name}</span>
        <span className="sr-only">. Opens the quotes.</span>
      </button>
      <span className={"sk-verdict " + verdict}><span aria-hidden="true">{verdict === "covered" ? "✓" : verdict === "add" ? "+" : "!"}</span> {VERDICT_LABEL[verdict]}</span>
      <span className="rk-facts">
        <span className="rk-fact">
          <span className="sk-dots" aria-hidden="true">{[1, 2, 3].map((n) => <i key={n} className={n <= wantDots(want) ? "on" : ""} />)}</span>
          <span><span className="sr-only">Role wants </span>{want}</span>
        </span>
        <span className="rk-fact">
          <span className={"sk-steps " + proof.toLowerCase()} aria-hidden="true">{[1, 2, 3, 4].map((n) => <i key={n} className={n <= proofSteps(skill.evidence) ? "on" : ""} />)}</span>
          <span><span className="sr-only">You show </span><span aria-hidden="true">{PROOF_ICON[proof]}</span> {proof}<span className="sr-only">, {skill.evidence} out of 100</span></span>
        </span>
      </span>
    </div>
  </li>;
}

function Detail({ skill }: { skill: Skill }) {
  const link = skillLink(skill.name);
  const { breakdown } = skill;
  return <div className="sk-pop">
    <p className="sk-detail"><span>{skill.detail}</span></p>
    {skill.resumeQuote
      ? <blockquote><small>From your résumé: {skill.resumeQuote.label}</small>“{skill.resumeQuote.quote}”<span>Matched: {matched(skill.resumeQuote.matched)}</span></blockquote>
      : <blockquote className="none"><small>From your résumé</small><b>Nothing in your résumé matches this</b>, so it scores 0. Add a project or work example that shows it.</blockquote>}
    {skill.roleQuote
      ? <blockquote><small>Asked for in the role: {skill.roleQuote.label}</small>“{skill.roleQuote.quote}”<span>Matched: {matched(skill.roleQuote.matched)}</span></blockquote>
      : <blockquote className="none"><small>Asked for in the role</small><b>Nothing in the role text matches this.</b></blockquote>}
    <p className="sk-why"><strong>Why this score</strong> {whyLine(skill.demand, skill.evidence)}</p>
    <details className="sk-how" open>
      <summary>How we score</summary>
      <p>Your <Term id="proof-score">proof score</Term> is <b>{skill.evidence}</b> out of 100. The <Term id="demand-score">role score</Term> is <b>{skill.demand}</b> out of 100. Both score the proof in your text. Neither predicts whether you&apos;ll be hired.</p>
      {breakdown
        ? <div className="sk-parts">
            <Parts title="Proof score, from your résumé" parts={breakdown.parts} none="No résumé passage matches, so no points are added." />
            <Parts title="Role score, from the posting" parts={breakdown.demandParts} none="No passage in the role text matches, so no points are added." />
          </div>
        : skill.resumeQuote && skill.scoreReason && <p>{skill.scoreReason}</p>}
    </details>
    <a className="sk-link" href={link.url} target="_blank" rel="noreferrer">{link.label} <ArrowUpRight size={14} aria-hidden="true" /></a>
  </div>;
}

/** The rule points that added up to a score, one per line. Each point has a passage behind it. */
export function Parts({ title, parts, none }: { title: string; parts: { label: string; points: number }[]; none: string }) {
  return <section aria-label={title}>
    <h6>{title}</h6>
    {parts.length
      ? <ul>{parts.map((part) => <li key={part.label}><b>+{part.points}</b> {part.label}</li>)}</ul>
      : <p>{none}</p>}
  </section>;
}

/** Skills ranked by how much the role asks for each. A short key above the list names the columns (the Terms sit there, never inside a row); the quotes and numbers open in a popup. */
export function SkillRows({ skills }: { skills: Skill[] }) {
  const [openName, setOpenName] = useState<string | null>(null);
  const close = useCallback(() => setOpenName(null), []);
  const current = skills.find((skill) => skill.name === openName);
  return <>
    <p className="rk-key">
      <Term id="role-wants" /> | <Term id="you-show" /> | Verdict: <Term id="covered" />, <Term id="add-proof" />, <Term id="missing" />
    </p>
    <ol className="rk-list" aria-label="Skills, ranked by how much the role asks. Select one to read the quotes behind it.">
      {rankSkills(skills).map((skill, index) => <Row key={skill.name} skill={skill} rank={index + 1} onOpen={setOpenName} />)}
    </ol>
    <p className="dash-key">Levels score the <span className="hl">proof in your text</span>. They don&apos;t predict hiring.</p>
    <Popup open={!!current} onClose={close} title={current?.name ?? "Skill"} icon={current ? <SkillMark name={current.name} /> : undefined}>
      {current && <Detail skill={current} />}
    </Popup>
  </>;
}

"use client";

import { BASE_PATH } from "@/lib/base-path";
import { useRef, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { Quest, QuestKind, QuestLink } from "@/lib/analysis-types";
import type { Proof, Want } from "@/lib/skill-levels";
import { hostOf, siteLogo } from "@/lib/site-logos";

/** The small label on a tip: what kind of help it is. */
const KIND_WORD: Record<QuestKind, string> = { build: "Build it", show: "Show it", measure: "Add a number" };

const WANT_PIPS: Record<Want, number> = { High: 3, Medium: 2, Low: 1 };
const WANT_SAYS: Record<Want, string> = { High: "A lot", Medium: "Somewhat", Low: "A little" };
const PROOF_PIPS: Record<Proof, number> = { Strong: 3, Some: 2, Weak: 1, None: 0 };
const PROOF_SAYS: Record<Proof, string> = { Strong: "Plenty", Some: "Some", Weak: "A little", None: "Nothing yet" };

/** How much the role asks for a skill against how much the résumé shows, as two rows of three pips. The whole sentence is the spoken label, so the pips are only a picture. */
function Gauge({ want, proof, hint, label }: { want: Want; proof: Proof; hint?: string; label: string }) {
  const pips = (count: number) => <span className="tg-pips" aria-hidden="true">{[0, 1, 2].map((i) => <i key={i} className={i < count ? "on" : ""} />)}</span>;
  return <div className="tip-gauge" role="group" aria-label={label}>
    <div className="tg-row" data-kind="ask"><span className="tg-label" aria-hidden="true">Role asks</span>{pips(WANT_PIPS[want])}<b className="tg-word" aria-hidden="true">{WANT_SAYS[want]}</b></div>
    <div className="tg-row" data-kind="proof" data-proof={proof}><span className="tg-label" aria-hidden="true">You show</span>{pips(PROOF_PIPS[proof])}<b className="tg-word" aria-hidden="true">{PROOF_SAYS[proof]}</b></div>
    {hint && <p className="tg-hint">{hint}</p>}
  </div>;
}

/** A resource's site as a small tile: its saved logo, or the first letter of its name when we have no logo file. */
function SiteTile({ link }: { link: QuestLink }) {
  const file = siteLogo(link.url);
  // eslint-disable-next-line @next/next/no-img-element -- small static logo file
  return <span className={"tip-site" + (file ? " has-logo" : "")} aria-hidden="true">{file ? <img src={`${BASE_PATH}/assets/logos/${file}.png`} alt="" width={36} height={36} loading="lazy" /> : <b>{link.title.replace(/^[^A-Za-z0-9]+/, "").charAt(0).toUpperCase() || "↗"}</b>}</span>;
}

/** One checked resource as a site card: logo tile, title, what it is and where it lives. */
export function ResourceCard({ link }: { link: QuestLink }) {
  return <li>
    <a className="tip-res" href={link.url} target="_blank" rel="noopener noreferrer">
      <SiteTile link={link} />
      <span className="tip-res-text"><b>{link.title}</b><small>{link.kind}, {hostOf(link.url)}</small></span>
      <ExternalLink className="tip-res-out" size={16} aria-hidden="true" focusable="false" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  </li>;
}

/** The résumé line to adapt, with a button that copies it. The brackets are the parts to fill in. */
function ResumeLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { return; } // no clipboard here: the line stays on screen to select by hand
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };
  return <div className="tip-line">
    <div className="tip-line-bar">
      <span className="tip-label">Put it on your résumé</span>
      <button type="button" className="tip-copy" onClick={copy} aria-label="Copy this résumé line">
        {copied ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
        <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
    <p className="tip-line-text"><q>{text}</q></p>
  </div>;
}

/**
 * One tip, laid out to be read top to bottom without hunting: a kind label and the title, why it comes up, three short steps, what you will have at the end,
 * a résumé line to adapt, and the resources as site cards. A tip from API boost for a skill with no playbook has no steps, so it shows its own task instead.
 * `compact` is the three-across layout in the full plan: one sentence instead of the steps, two resources and less padding, so six tips stay quick to read.
 */
export function TipCard({ quest, number, why, gauge, compact = false }: { quest: Quest; number?: number; why?: string; gauge?: { want: Want | "None"; proof: Proof; hint?: string }; compact?: boolean }) {
  const links = compact ? (quest.links ?? []).slice(0, 2) : (quest.links ?? []);
  return <article className={"tip-card" + (compact ? " is-compact" : "")} data-kind={quest.kind ?? "build"}>
    <header className="tip-head">
      {number !== undefined && <span className="tip-num" aria-hidden="true">{number}</span>}
      <div className="tip-titles">
        <span className="tip-kind">{KIND_WORD[quest.kind ?? "build"]}</span>
        <h4 className="tip-title">{quest.title}</h4>
      </div>
    </header>
    {gauge && gauge.want !== "None" ? <Gauge want={gauge.want} proof={gauge.proof} hint={gauge.hint} label={why ?? ""} /> : why && <p className="tip-why">{why}</p>}
    {quest.steps?.length && !compact
      ? <ol className="tip-steps" aria-label="Three steps">{quest.steps.map((step) => <li key={step}><span>{step}</span></li>)}</ol>
      : <p className="tip-task">{quest.task}</p>}
    <p className="tip-have"><b>You will have:</b> {quest.proof}</p>
    {quest.bullet && <ResumeLine text={quest.bullet} />}
    {links.length > 0 && <div className="tip-learn">
      <p className="tip-label">Learn with</p>
      <ul className="tip-res-list">{links.map((link) => <ResourceCard key={link.url} link={link} />)}</ul>
    </div>}
  </article>;
}

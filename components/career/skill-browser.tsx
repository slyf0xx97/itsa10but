"use client";

import { useEffect, useId, useState } from "react";
import type { Skill } from "@/lib/analysis-types";
import { rankSkills } from "@/lib/dashboard-data";
import { stateOf } from "@/lib/radar-tiers";
import { demandLine, loadDemand } from "@/lib/demand-client";
import type { DemandTable } from "@/lib/edge/demand";
import { VERDICT_LABEL, proofOf, verdictOf, wantOf, whyLine } from "@/lib/skill-levels";
import { Parts } from "@/components/career/skill-rows";
import { Term } from "@/components/career/term";

const pct = (value: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
const PROOF_MARK = { Strong: "✓", Some: "~", Weak: "!", None: "✕" } as const;

/** One quote with where it came from. A missing match says so and scores 0 for that source. */
function Quote({ tag, hit }: { tag: string; hit?: { label: string; quote: string } }) {
  return hit
    ? <p className="fi-q"><span className="fi-q-tag">{tag}</span><q>{hit.quote}</q><small>Source: {hit.label}</small></p>
    : <p className="fi-q none"><span className="fi-q-tag">{tag}</span><span><span aria-hidden="true">✗ </span>No match found. Scores 0 for this source.</span></p>;
}

/**
 * Two grid items for a findings popup: the skills as a list (left) and the quotes behind the picked skill (right).
 * Role Scout shows how much the role asks and whether you have it. Experience Finder shows the proof, the quote flag and the score parts.
 * The list is a set of toggle buttons, so a keyboard user tabs to a skill and presses Enter. The first skill starts picked.
 */
export function SkillBrowser({ skills, kind, roleTitle, children }: { skills: Skill[]; kind: "scout" | "finder"; roleTitle?: string; children?: React.ReactNode }) {
  const ranked = rankSkills(skills);
  const [market, setMarket] = useState<DemandTable | null>(null);
  useEffect(() => {
    if (kind !== "scout") return;
    let live = true;
    void loadDemand().then((table) => { if (live) setMarket(table); });
    return () => { live = false; };
  }, [kind]);
  const [picked, setPicked] = useState<string | null>(null);
  const detailId = useId();
  const listId = useId();
  const current = ranked.find((skill) => skill.name === picked) ?? ranked[0];
  const scout = kind === "scout";
  if (!current) return <section className="dp-sec" aria-label="Skills"><p className="dash-empty">No skills to show yet.</p></section>;
  const verdict = verdictOf(current.demand, current.evidence);
  const { breakdown } = current;
  return <>
    <section className="dp-sec" aria-labelledby={listId}>
      <h5 className="dp-h" id={listId}>{scout ? "Skills the role asks for" : "Proof for each skill"}</h5>
      <p className="dp-desc">{scout ? <>Biggest ask first. <Term id="proof">Have</Term> means your résumé shows it. Pick a skill to read its quote.</> : <><Term id="proof">Proof</Term> from your résumé, in %. ✓ quote found, ✗ none.</>}</p>
      <ul className="sb-list">
        {ranked.map((skill) => {
          const on = skill.name === current.name;
          const proof = proofOf(skill.evidence);
          const have = stateOf(skill.evidence) === "have";
          return <li key={skill.name}>
            <button type="button" className="sb-row" aria-pressed={on} aria-controls={detailId} onClick={() => setPicked(skill.name)}>
              <span className="sb-name">{skill.name}</span>
              <span className="sb-val">
                {scout
                  ? <>{wantOf(skill.demand)} priority</>
                  : <><span className={"dash-q " + (skill.resumeQuote ? "yes" : "no")} role="img" aria-label={skill.resumeQuote ? "Quote found." : "No matching quote."}>{skill.resumeQuote ? "✓" : "✗"}</span> Proof {pct(skill.evidence)}%</>}
              </span>
              <span className="dash-track" aria-hidden="true">
                <i className="dash-fill" style={{ width: pct(scout ? skill.demand : skill.evidence) + "%" }} />
              </span>
              {scout
                ? <span className={"sb-chip " + (have ? "have" : "gap")}><span aria-hidden="true">{have ? "✓" : "!"}</span> {have ? "Have" : "Gap"}</span>
                : <span className={"sb-chip proof-" + proof.toLowerCase()}><span aria-hidden="true">{PROOF_MARK[proof]}</span> {proof}</span>}
            </button>
          </li>;
        })}
      </ul>
      {scout && <p className="sb-key">Longer bar: the role asks for more.</p>}
      {children}
    </section>
    <section className="dp-sec sb-detail" id={detailId} aria-label={"Quotes for " + current.name}>
      <h5 className="dp-h">{current.name}</h5>
      <p className="sb-sum">
        <span className={"sk-verdict " + verdict}>{VERDICT_LABEL[verdict]}</span>
        <span>{scout ? <>The role asks for it at <b>{wantOf(current.demand).toLowerCase()}</b> priority.</> : whyLine(current.demand, current.evidence)}</span>
      </p>
      {scout && roleTitle && demandLine(market, roleTitle, current.name) && <p className="sb-market"><span className="sb-market-tag">Market</span>{demandLine(market, roleTitle, current.name)}<small>Counts postings only. It doesn&apos;t change your scores.</small></p>}
      {!scout && <Quote tag="Résumé quote" hit={current.resumeQuote} />}
      <Quote tag="Role quote" hit={current.roleQuote} />
      {!scout && <details className="sk-how sb-how">
        <summary>How we scored it</summary>
        <p>Neither the proof nor the priority predicts whether you&apos;ll be hired. Each point below has a passage behind it.</p>
        {breakdown
          ? <div className="sk-parts">
              <Parts title="Proof, from your résumé" parts={breakdown.parts} none="No résumé passage matches, so no points are added." />
              <Parts title="Why the role asks for it" parts={breakdown.demandParts} points={false} none="No passage in the role text matches." />
            </div>
          : current.scoreReason && <p>{current.scoreReason}</p>}
      </details>}
    </section>
  </>;
}

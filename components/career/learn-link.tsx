"use client";

import type { ReactNode } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { LEARN_EVENT, learnTarget, type LearnDetail, type LearnTarget } from "@/lib/skill-learn";

const open = (target: Extract<LearnTarget, { kind: "level-up" }>) => {
  const detail: LearnDetail = { resourceId: target.resourceId, groupIndex: target.groupIndex };
  window.dispatchEvent(new CustomEvent(LEARN_EVENT, { detail }));
};

const labelOf = (name: string, target: LearnTarget) => target.kind === "level-up" ? `Learn ${name}: shows ${target.resourceName} in Level up` : `Learn ${name}: opens a page in a new tab`;

/** A pill that takes you to learn a skill: down to its card in Level up, or out to an outside page in a new tab. */
export function LearnPill({ name, children, className = "" }: { name: string; children: ReactNode; className?: string }) {
  const target = learnTarget(name);
  const cls = "learn-pill " + className;
  if (target.kind === "external") return <a className={cls} href={target.url} target="_blank" rel="noopener noreferrer" aria-label={labelOf(name, target)}>{children}<span className="learn-go" aria-hidden="true">Learn <ExternalLink size={13} strokeWidth={2.6} /></span></a>;
  return <button type="button" className={cls} onClick={() => open(target)} aria-label={labelOf(name, target)}>{children}<span className="learn-go" aria-hidden="true">Learn <ArrowRight size={14} strokeWidth={2.6} /></span></button>;
}

/** The same thing around a drawing inside an svg, such as a radar chip. */
export function LearnSvg({ name, children }: { name: string; children: ReactNode }) {
  const target = learnTarget(name);
  if (target.kind === "external") return <a className="learn-g" href={target.url} target="_blank" rel="noopener noreferrer" aria-label={labelOf(name, target)}>{children}</a>;
  return <g className="learn-g" role="button" tabIndex={0} aria-label={labelOf(name, target)} onClick={() => open(target)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(target); } }}>{children}</g>;
}

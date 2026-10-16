"use client";

import { BASE_PATH } from "@/lib/base-path";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { elevateGroups } from "@/lib/level-up-resources";
import { LEARN_EVENT, type LearnDetail } from "@/lib/skill-learn";
import { PixelIcon, type PixelIconName } from "@/components/career/pixel-icons";
import { ScrollHint } from "@/components/scroll-hint";
import { LEVEL_UP_TITLE, STAGES } from "@/lib/journey";

const KEY = "itsa10but:level-up";
const STAGE_NUMBER = STAGES.find((stage) => stage.id === "level-up")?.number ?? 4;
const total = elevateGroups.reduce((sum, group) => sum + group.resources.length, 0);

// Ticks live in localStorage when it works, and in memory when it throws. Résumé text is never stored.
let memory = "{}";
let storageBroken = false;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { listeners.delete(listener); window.removeEventListener("storage", listener); };
};
function readRaw() {
  if (storageBroken) return memory;
  try { return localStorage.getItem(KEY) ?? memory; } catch { storageBroken = true; return memory; }
}
function writeRaw(next: string) {
  memory = next;
  try { localStorage.setItem(KEY, next); } catch { storageBroken = true; }
  listeners.forEach((listener) => listener());
}

/** Reads the old formats (an array of ids, or { done, custom }) and keeps only the tick ids. Unknown keys are ignored. */
function parse(raw: string): Set<string> {
  try {
    const value: unknown = JSON.parse(raw);
    const ids = Array.isArray(value) ? value : value && typeof value === "object" && Array.isArray((value as { done?: unknown }).done) ? (value as { done: unknown[] }).done : [];
    return new Set(ids.filter((id): id is string => typeof id === "string"));
  } catch { return new Set(); }
}

/** An image that swaps to `fallback` when the file is missing, including when it failed before hydration. */
export function ArtImage({ src, width, height, fallback, className }: { src: string; width: number; height: number; fallback: ReactNode; className?: string }) {
  const [failed, setFailed] = useState(false);
  const check = useCallback((img: HTMLImageElement | null) => { if (img?.complete && img.naturalWidth === 0) setFailed(true); }, []);
  if (failed) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={check} className={className} src={src} width={width} height={height} alt="" aria-hidden="true" loading="lazy" onError={() => setFailed(true)} />;
}

/** Real logos of each resource's own site, saved once into /assets/logos/ (never hotlinked; origins in SOURCES.md there). Brands shared by several resources reuse one file. A resource with no logo shows its group's icon. */
const LOGO = {
  gallup: ["gallup", 180, 180], msf: ["myskillsfuture", 256, 73], sf: ["skillsfuture", 220, 48], onet: ["onet", 180, 180], aws: ["aws", 144, 144], ms: ["microsoft", 192, 192],
  gh: ["github", 180, 180], cs50: ["cs50", 64, 64], kaggle: ["kaggle", 256, 99], resume: ["resume-io", 180, 180], gdev: ["google-developers", 180, 180], canva: ["canva", 180, 180],
  devto: ["devto", 180, 179], li: ["linkedin", 256, 256], him: ["himalayas", 180, 180], jobicy: ["jobicy", 192, 192], mcf: ["mycareersfuture", 180, 180], js: ["jobstreet", 114, 114],
  reddit: ["reddit", 192, 192], hn: ["hacker-news", 256, 256], road: ["roadmap-sh", 180, 180], levels: ["levels-fyi", 192, 192], iio: ["interviewing-io", 120, 109], grow: ["google-grow", 180, 180],
  odin: ["the-odin-project", 128, 128], fso: ["full-stack-open", 128, 128], exercism: ["exercism", 128, 128], mdn: ["mdn", 128, 128], sqlbolt: ["sqlbolt", 128, 128], py: ["python", 128, 128], cw: ["codewars", 128, 128],
  lf: ["linux-foundation", 128, 128], thm: ["tryhackme", 128, 128], psw: ["portswigger", 128, 128], aisg: ["ai-singapore", 128, 128], gtech: ["govtech", 128, 128], cgov: ["careers-gov", 128, 128], glints: ["glints", 128, 128],
  engsg: ["engineers-sg", 128, 128], gdg: ["gdg", 128, 128], tih: ["tech-interview-handbook", 128, 128], fem: ["frontend-mentor", 128, 128], gfi: ["good-first-issue", 128, 128], yt: ["youtube", 128, 128],
  fcc: ["freecodecamp", 128, 128], cour: ["coursera", 128, 128], edx: ["edx", 128, 128], hf: ["hugging-face", 128, 128], imda: ["imda", 128, 128], jsp: ["jobs-skills-portal", 128, 128], tia: ["tech-in-asia", 128, 128],
  jobscan: ["jobscan", 40, 40], pers16: ["16personalities", 180, 180], dope: ["dope-test", 180, 180], wow: ["my-world-of-work", 180, 180], htb: ["htb-academy", 180, 180], owasp: ["owasp", 180, 180], cyberd: ["cyberdefenders", 128, 128], csa: ["csa-singapore", 180, 180], flowcv: ["flowcv", 180, 180], overleaf: ["overleaf", 180, 180], rr: ["reactive-resume", 180, 180], dlai: ["the-batch", 128, 128],
} as const;
const LOGO_OF: Record<string, keyof typeof LOGO> = {
  "16personalities": "pers16", "dope-bird-test": "dope", "animal-me": "wow", "htb-academy": "htb", "owasp-top-10": "owasp", cyberdefenders: "cyberd", "csa-singapore": "csa",
  cliftonstrengths: "gallup", "myskillsfuture-assessments": "msf", "careers-skills-passport": "msf", "onet-interest-profiler": "onet",
  "critical-core-skills": "sf", "skillsfuture-credit": "sf", "aws-cloud-practitioner": "aws", "microsoft-learn": "ms",
  "github-skills": "gh", "github-profile": "gh", "github-pages": "gh", cs50: "cs50", "kaggle-learn": "kaggle",
  "resume-builder": "resume", "technical-writing": "gdev", "canva-resumes": "canva", devto: "devto",
  "linkedin-jobs": "li", himalayas: "him", jobicy: "jobicy", mycareersfuture: "mcf", jobstreet: "js",
  "reddit-cscareerquestions": "reddit", "reddit-resumes": "reddit", "reddit-learnprogramming": "reddit", "reddit-cybersecurity": "reddit", "reddit-asksingapore": "reddit",
  "hacker-news": "hn", "roadmap-sh": "road", "levels-fyi": "levels", "interviewing-io": "iio", "interview-warmup": "grow",
  freecodecamp: "fcc", "the-odin-project": "odin", "full-stack-open": "fso", cs50p: "cs50", "python-tutorial": "py", "mdn-learn": "mdn", sqlbolt: "sqlbolt", exercism: "exercism", codewars: "cw",
  "aws-skill-builder": "aws", "azure-fundamentals": "ms", "linux-intro": "lf", "ml-crash-course": "gdev", "deeplearning-ai": "dlai", "hugging-face-learn": "hf", tryhackme: "thm", "portswigger-academy": "psw",
  coursera: "cour", edx: "edx", "frontend-mentor": "fem", "build-your-own-x": "gh", "good-first-issue": "gfi", "github-student-pack": "gh",
  "reactive-resume": "rr", flowcv: "flowcv", "overleaf-cv": "overleaf", "tih-resume": "tih", jobscan: "jobscan",
  glints: "glints", "careers-gov": "cgov", "govtech-careers": "gtech", "tech-in-asia-jobs": "tia",
  "imda-tesa": "imda", sctp: "sf", "ai-fundamentals": "aisg", "skills-framework": "sf", "jobs-skills-portal": "jsp", "govtech-developer": "gtech",
  "reddit-machinelearning": "reddit", gdg: "gdg", "engineers-sg": "engsg", "tech-interview-handbook": "tih",
  "yt-cs50": "yt", "yt-freecodecamp": "yt", "yt-fireship": "yt", "yt-3blue1brown": "yt", "yt-statquest": "yt", "yt-neetcode": "yt", "yt-bytebytego": "yt", "yt-karpathy": "yt", "yt-networkchuck": "yt", "yt-messer": "yt",
  "cert-aws-cloud-practitioner": "aws", "cert-aws-ai-practitioner": "aws", "cert-aws-solutions-architect": "aws", "cert-aws-developer": "aws", "cert-aws-ml-engineer": "aws", "cert-aws-security": "aws",
  "cert-az-104": "ms", "cert-ai-900": "ms", "cert-dp-900": "ms", "cert-pl-300": "ms", "cert-sc-900": "ms",
  "cert-gcp-digital-leader": "gdev", "cert-gcp-engineer": "gdev", "cert-kcna": "lf", "cert-cka": "lf", "cert-lfcs": "lf", "cert-cncf": "lf",
  "cert-google-cyber": "grow", "cert-google-data": "grow", "cert-google-it": "grow", "cert-google-ux": "grow", "cert-google-pm": "grow",
  "cert-ibm-data-science": "cour", "cert-ml-specialization": "dlai",
};

/** The brand logo (or, without one, the group icon) in a white tile at the top-left of a card. The logo hides itself if its file is missing. */
function Logo({ id, icon }: { id: string; icon: PixelIconName }) {
  const [failed, setFailed] = useState(false);
  const entry = LOGO_OF[id] && LOGO[LOGO_OF[id]];
  const check = useCallback((img: HTMLImageElement | null) => { if (img?.complete && img.naturalWidth === 0) setFailed(true); }, []);
  if (!entry || failed) return <span className="lu-logo is-icon" aria-hidden="true"><PixelIcon name={icon} size={24} /></span>;
  const [file, w, h] = entry;
  // eslint-disable-next-line @next/next/no-img-element
  return <span className="lu-logo"><img ref={check} src={`${BASE_PATH}/assets/logos/${file}.png`} width={Math.round((48 * w) / h)} height={48} alt="" loading="lazy" onError={() => setFailed(true)} /></span>;
}

/** A group description is one lead sentence (the panel title) and, if there is one, a short line after it. */
const splitLead = (text: string): [string, string] => {
  const m = text.match(/^(.+?[.!?])\s+(.+)$/);
  return m ? [m[1], m[2]] : [text, ""];
};

/** Holds a group's cards at about two rows tall. More than that scrolls inside, with no scrollbar drawn: a fade and a "More below" pill at the foot say there is more, and go once you reach the end. */
function MoreScroll({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const check = useCallback(() => { const el = ref.current; if (el) setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 6); }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    check();
    const watch = new ResizeObserver(check);
    watch.observe(el);
    return () => watch.disconnect();
  }, [check]);
  return <div className="lu-more-wrap">
    <div ref={ref} className="lu-scroll" role="region" tabIndex={0} aria-label={label} onScroll={check}>{children}</div>
    <div className="lu-fade" data-show={more} aria-hidden="true"><span>More below ↓</span></div>
  </div>;
}

export function LevelUpChecklist() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "{}");
  const done = useMemo(() => parse(raw), [raw]);
  const [active, setActive] = useState(0);
  const [flash, setFlash] = useState("");
  const base = useId();
  // A "learn this" button elsewhere on the page (the radar, the gap list) asks for one resource: open its tab, scroll to its card and flash it.
  useEffect(() => {
    let timer = 0;
    const onLearn = (event: Event) => {
      const detail = (event as CustomEvent<LearnDetail>).detail;
      if (!detail || !elevateGroups[detail.groupIndex]) return;
      setActive(detail.groupIndex);
      setFlash(detail.resourceId);
      window.setTimeout(() => document.getElementById("lu-res-" + detail.resourceId)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" }), 60);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setFlash(""), 3200);
    };
    window.addEventListener(LEARN_EVENT, onLearn);
    return () => { window.removeEventListener(LEARN_EVENT, onLearn); window.clearTimeout(timer); };
  }, []);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const count = elevateGroups.reduce((sum, g) => sum + g.resources.filter((r) => done.has(r.id)).length, 0);
  const toggle = (id: string, on: boolean) => {
    const next = new Set(done);
    if (on) next.add(id); else next.delete(id);
    writeRaw(JSON.stringify({ done: [...next] }));
  };
  const onKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = elevateGroups.length - 1;
    const to = event.key === "ArrowRight" ? (active === last ? 0 : active + 1) : event.key === "ArrowLeft" ? (active === 0 ? last : active - 1) : event.key === "Home" ? 0 : event.key === "End" ? last : -1;
    if (to < 0) return;
    event.preventDefault();
    setActive(to);
    tabs.current[to]?.focus();
  };

  return <section className="lu" aria-labelledby="level-up-title">
    <div className="lu-top">
      <div className="lu-heading">
        <span className="stage-tab">Stage {STAGE_NUMBER}</span>
        <h2 id="level-up-title" className="lu-title">{LEVEL_UP_TITLE}</h2>
      </div>
      <div className="lu-progress">
        <div className="lu-bar" role="progressbar" aria-label="Level up progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={count} aria-valuetext={`${count} of ${total} done`}>
          <span style={{ width: `${(count / total) * 100}%` }} />
        </div>
        <span className="lu-count" aria-live="polite">{count} of {total} done</span>
      </div>
    </div>

    <ScrollHint className="lu-tabs" role="tablist" aria-label="Level up groups">
      {elevateGroups.map((group, index) => {
        const groupDone = group.resources.filter((r) => done.has(r.id)).length;
        const selected = index === active;
        return <button key={group.title} ref={(el) => { tabs.current[index] = el; }} type="button" role="tab" className="lu-tab" id={`${base}-tab-${index}`} aria-selected={selected} aria-controls={`${base}-panel-${index}`} tabIndex={selected ? 0 : -1} onClick={(event) => { setActive(index); event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" }); }} onKeyDown={onKey}>
          <span className="lu-tab-icon" aria-hidden="true"><PixelIcon name={group.icon} size={16} /></span>
          <span className="lu-tab-name">{group.title}</span>
          <span className="lu-tab-count">{groupDone} of {group.resources.length}</span>
        </button>;
      })}
    </ScrollHint>

    {elevateGroups.map((group, index) => <div className="lu-group" role="tabpanel" id={`${base}-panel-${index}`} aria-labelledby={`${base}-tab-${index}`} hidden={index !== active} tabIndex={0} key={group.title}>
      <MoreScroll label={`${group.title}: resources. Scroll for more.`}>
      {(() => {
        const [lead, rest] = splitLead(group.description);
        return <div className="lu-desc">
          <h3 className="lu-panel-title">{lead}</h3>
          {rest && <p className="lu-panel-text">{rest}</p>}
        </div>;
      })()}
      <ul className="lu-grid">
        {group.resources.map((resource) => {
          const checked = done.has(resource.id);
          return <li className="lu-card" id={"lu-res-" + resource.id} data-done={checked} data-flash={flash === resource.id} key={resource.id}>
            <div className="lu-head">
              <Logo id={resource.id} icon={group.icon} />
              <div className="lu-id">
                <span className="lu-tag">{resource.tag}</span>
                <strong className="lu-name">{resource.name}</strong>
              </div>
              {checked && <span className="lu-check" aria-hidden="true" />}
            </div>
            <div className="lu-body">
              <p className="lu-detail">{resource.detail}</p>
              <div className="lu-foot">
                <a className="lu-open" href={resource.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${resource.name}, new tab`}>Open <span aria-hidden="true">↗</span></a>
                <label className="lu-done">
                  <input type="checkbox" checked={checked} onChange={(event) => toggle(resource.id, event.target.checked)} />
                  <span>Done<span className="sr-only"> with {resource.name}</span></span>
                </label>
              </div>
            </div>
          </li>;
        })}
      </ul>
      </MoreScroll>
    </div>)}
  </section>;
}

"use client";
import { BASE_PATH } from "@/lib/base-path";
import type { CSSProperties } from "react";
import Image from "next/image";
import { ArrowUp, ExternalLink, Sparkles } from "lucide-react";
import { PixelIcon } from "@/components/career/pixel-icons";
import { Mark } from "@/components/sg-mark";
import { SgNews } from "@/components/sg-news";
import { figureGroups } from "@/lib/news-sites";
import { SNAPSHOT_CHECKED, latestAi, roleNames, roleSource, roleSourceNote, signals, skillShares, snapshotSources, type SnapshotSourceId } from "@/lib/sg-snapshot";

/** The logo file (public/assets/logos, without ".png") of each source's publisher. PwC has no file here, so its card shows a lettered tile. */
const SOURCE_LOGO: Partial<Record<SnapshotSourceId, string>> = {
  imda26: "imda", imda26pdf: "imda", imda25: "imda", mom: "mom", indeed: "indeed-hiring-lab", jobsskills: "jobs-skills-portal", st: "straits-times",
};
const AI_LOGO: Record<string, string> = { TechCrunch: "techcrunch" };
const biggest = Math.max(...skillShares.map((skill) => skill.share));

/** A figure like "23%" gives its number for a ring, or null for any other kind of figure. */
const percentOf = (figure: string) => { const match = /^(\d+(?:\.\d+)?)%$/.exec(figure.trim()); return match ? Number(match[1]) : null; };

function Logo({ id, size = 28 }: { id: SnapshotSourceId; size?: number }) {
  const file = SOURCE_LOGO[id];
  const name = snapshotSources[id].publisher;
  return file
    ? <Image className="sgf-logo" src={BASE_PATH + "/assets/logos/" + file + ".png"} width={size} height={size} alt="" unoptimized />
    : <span className="sgf-logo sgf-letter" aria-hidden="true">{name.slice(0, 1)}</span>;
}

/** The source line under a figure: its period and a link to the page it comes from. */
function Source({ id, period }: { id: SnapshotSourceId; period: string }) {
  const source = snapshotSources[id];
  return <span className="sgf-src"><Logo id={id} size={20} /><span>{period}. <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.publisher}, ${source.title}, ${source.published} (opens in a new tab)`}>{source.publisher}, {source.published}</a></span></span>;
}

/** A ring that fills to the percentage. The figure is printed beside it, so the ring is decoration. */
function Ring({ value }: { value: number }) {
  return <span className="sgf-ring" aria-hidden="true" style={{ "--p": value } as CSSProperties}><i /></span>;
}

/**
 * The verified figures popup: the latest news with Refresh, the skill bars (2019 base plus the gain in green), the dated figures with their publisher logos. The latest news and its Refresh button come first.
 * Every number comes from lib/sg-snapshot.ts and names its source. The Singapore government and news sites are listed at the bottom.
 */
export function SgFigures() {
  const workers = signals.find((signal) => signal.figure === "222,200");
  const others = signals.filter((signal) => signal !== workers);
  return <div className="sgf">
    <p className="sgf-lead">Every figure is dated and links to its source. Checked {SNAPSHOT_CHECKED}.</p>

    <section className="sgf-sec" aria-label="Latest news">
      <SgNews />
      <div className="sgs-ai">
        <h4 className="sgs-ai-h"><Sparkles size={18} aria-hidden="true" focusable="false" /><span>Latest in AI</span><small>Read {SNAPSHOT_CHECKED}</small></h4>
        <ul className="sgs-ai-list sgf-ai" aria-label="Recent AI models, research and findings">
          {latestAi.map((item) => <li key={item.url}>
            <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${item.kind}: ${item.title}. ${item.text} ${item.publisher}, ${item.published} (opens in a new tab)`}>
              <span className="sgs-ai-kind" data-kind={item.kind}>{item.kind}</span>
              <b>{item.title}</b>
              <span className="sgf-ai-text">{item.text}</span>
              <span className="sgs-ai-src">{AI_LOGO[item.publisher] && <Image src={BASE_PATH + "/assets/logos/" + AI_LOGO[item.publisher] + ".png"} width={16} height={16} alt="" unoptimized />}{item.publisher}, {item.published}<ExternalLink size={13} aria-hidden="true" focusable="false" /></span>
            </a>
          </li>)}
        </ul>
      </div>
    </section>

    <section className="sgf-sec" aria-labelledby="sgf-skills">
      <h3 id="sgf-skills">Skills employers name</h3>
      <p className="sgf-lead">Share of Singapore tech job postings that name each skill in 2024. The green part is the gain since 2019, in percentage points (pp).</p>
      <ul className="sgf-bars">
        {skillShares.map((skill) => <li key={skill.name}>
          <span className="sgf-bar-name"><Mark name={skill.name} />{skill.name}</span>
          <span className="sgf-track" aria-hidden="true">
            <i className="sgf-base" style={{ width: `${((skill.share - skill.gain) / biggest) * 100}%` }} />
            <i className="sgf-gain" style={{ width: `${(skill.gain / biggest) * 100}%` }} />
          </span>
          <span className="sgf-bar-fig"><b>{skill.share}%</b><span className="sgf-chip"><ArrowUp size={12} strokeWidth={3} aria-hidden="true" />{skill.gain} pp</span><span className="sr-only"> of tech postings in {skill.year}, up {skill.gain} percentage points since {skill.since}</span></span>
        </li>)}
      </ul>
      <p className="sgf-src-line">Source: <a href={snapshotSources.imda25.url} target="_blank" rel="noopener noreferrer">{snapshotSources.imda25.publisher}, {snapshotSources.imda25.title}</a>, from Lightcast posting data.</p>
    </section>

    <section className="sgf-sec" aria-labelledby="sgf-nums">
      <h3 id="sgf-nums">The numbers</h3>
      <ul className="sgf-cards">
        {workers && <li className="sgf-feature">
          <div className="sgf-feature-body">
            <b>{workers.figure}</b>
            <span>{workers.text}</span>
            <Source id={workers.source} period={workers.period} />
          </div>
        </li>}
        {others.map((signal) => {
          const percent = percentOf(signal.figure);
          return <li key={signal.figure + signal.source}>
            <div className="sgf-fig">{percent !== null ? <Ring value={percent} /> : <Logo id={signal.source} size={34} />}<b>{signal.figure}</b></div>
            <span>{signal.text}</span>
            <Source id={signal.source} period={signal.period} />
          </li>;
        })}
        <li className="sgf-roles-card">
          <div className="sgf-fig"><Logo id={roleSource} size={34} /><b>{roleNames.length} roles</b></div>
          <ul className="sgf-roles" aria-label="Roles named by MOM">{roleNames.map((role) => <li key={role}>{role}</li>)}</ul>
          <span>{roleSourceNote}</span>
          <Source id={roleSource} period="Job Vacancies 2025" />
        </li>
      </ul>
    </section>

    <section className="sgf-sec" aria-labelledby="sgf-sites">
      <h3 id="sgf-sites">Official sites and news</h3>
      {figureGroups.map((group) => <div key={group.id} className="rt-sites">
        <h4 className="rt-title"><PixelIcon name={group.icon} size={18} />{group.title}</h4>
        <ul className="rt-grid">{group.sites.map((site) => <li key={site.name}>
          <a href={site.href} target="_blank" rel="noopener noreferrer">
            <span className="rt-logo"><Image src={BASE_PATH + "/assets/logos/" + site.logo + ".png"} width={40} height={40} alt="" unoptimized /></span>
            <span className="rt-site-text"><strong>{site.name}</strong><span>{site.what}</span>{site.inRefresh && <em className="sgs-tag">In news feed</em>}</span>
            <ExternalLink size={16} aria-hidden="true" focusable="false" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </li>)}</ul>
      </div>)}
    </section>
  </div>;
}

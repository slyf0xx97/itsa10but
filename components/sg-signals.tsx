"use client";
import { BASE_PATH } from "@/lib/base-path";
import { useId } from "react";
import Image from "next/image";
import { ArrowUp } from "lucide-react";
import { SgSources } from "@/components/sg-sources";
import { PixelIcon, type PixelIconName } from "@/components/career/pixel-icons";
import { WordTip } from "@/components/career/word-tip";
import { SNAPSHOT_CHECKED, skillShares, snapshotSources, type SnapshotSourceId } from "@/lib/sg-snapshot";
import { newsSiteGroups } from "@/lib/news-sites";
import { skillArt } from "@/lib/skill-art";

const techSites = newsSiteGroups.find((group) => group.id === "tech")?.sites ?? [];

// skillArt maps "Cloud" to three vendors; each tile here names one vendor, so it gets that logo. "AI skills" is a group, so it gets a drawn icon.
const ownLogo: Record<string, string> = { AWS: "amazonwebservices-original-wordmark.svg", Azure: "azure-original.svg" };
const ownIcon: Record<string, PixelIconName> = { "AI skills": "ml" };

function Mark({ name }: { name: string }) {
  const art = skillArt(name);
  const logos = ownLogo[name] ? [ownLogo[name]] : ownIcon[name] ? [] : art.logos;
  return <span className="sgs-mark" aria-hidden="true">{logos.length
    ? logos.map((file) => <Image key={file} src={BASE_PATH + "/tool-logos/" + file} width={24} height={24} alt="" unoptimized />)
    : <PixelIcon name={ownIcon[name] ?? art.icon} size={22} />}</span>;
}

/** Short link to a named source: "IMDA 2025". The full publisher, title and date are in the accessible name. */
function Cite({ id }: { id: SnapshotSourceId }) {
  const source = snapshotSources[id];
  return <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.publisher}, ${source.title}, ${source.published} (opens in a new tab)`}>{source.publisher} {source.published.match(/\d{4}/)?.[0]}</a>;
}

/** Dated, sourced Singapore tech hiring figures in compact tiles, a full-width button for news and sources under the title, and a three-row scrolling strip of tech and AI news sites. Data lives in lib/sg-snapshot.ts and lib/news-sites.ts. */
export function SgSignals({ firecrawlKey = "" }: { firecrawlKey?: string }) {
  const panelId = useId();
  return <section className="sgs" aria-labelledby={panelId + "-t"}>
    <div className="sgs-box">
      <div className="sgs-bar">
        <div className="sgs-top">
          <div className="sgs-titles">
            <span className="sgs-head">
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny static pixel SVG, nothing to optimise */}
              <img src={`${BASE_PATH}/assets/icons/abilities/rank-demand.svg`} alt="" aria-hidden="true" width={22} height={22} />
              <span className="sgs-tab" id={panelId + "-t"}>Singapore hiring signals</span>
            </span>
            <p className="sgs-checked">Checked {SNAPSHOT_CHECKED}</p>
          </div>
          <SgSources firecrawlKey={firecrawlKey} />
        </div>
        <div className="sgs-sites" role="group" aria-label="Tech and AI news sites" tabIndex={0}>
          {[0, 1, 2].map((rowIndex) => techSites.filter((_, index) => index % 3 === rowIndex)).map((row, index) => <ul key={index}>
            {row.map((site) => <li key={site.name}>
              <a href={site.href} target="_blank" rel="noopener noreferrer" aria-label={site.name + " (opens in a new tab)"}>
                <Image src={BASE_PATH + "/assets/logos/" + site.logo + ".png"} width={40} height={40} alt="" unoptimized />
                <span>{site.name}</span>
              </a>
            </li>)}
          </ul>)}
        </div>
        <p className="sgs-key">Share of tech postings that name each skill. Green is the change since 2019, in <WordTip title="pp" word="pp">pp means percentage points, the gap between two shares. A share that goes from 10% to 15% is up 5 pp.</WordTip>.</p>
        <ul className="sgs-tiles" aria-label="Share of Singapore tech job postings that name each skill">
          {[...skillShares.filter((skill) => skill.name !== "AI skills"), ...skillShares.filter((skill) => skill.name === "AI skills")].map((skill) => {
            const latest = skill.newer ?? skill;
            return <li key={skill.name}>
              <span className="sgs-row"><Mark name={skill.name} /><span className="sgs-name">{skill.name}</span></span>
              <span className="sgs-fig">
                <b>{latest.share}%<span className="sr-only"> of Singapore tech postings in {latest.year}</span></b>
                {skill.newer
                  ? <span className="sgs-chip is-plain">{skill.share}% in {skill.year}</span>
                  : <span className="sgs-chip"><ArrowUp size={12} strokeWidth={3} aria-hidden="true" /><span className="sr-only">up </span>{skill.gain} pp<span className="sr-only"> since {skill.since}</span></span>}
              </span>
              <span className="sgs-src">{latest.year}<span className="sr-only"> postings</span>, <Cite id={latest.source} /></span>
            </li>;
          })}
        </ul>
      </div>
    </div>
  </section>;
}

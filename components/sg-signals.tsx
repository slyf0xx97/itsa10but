"use client";
import { BASE_PATH } from "@/lib/base-path";
import { useId } from "react";
import Image from "next/image";
import { ArrowUp, ExternalLink, Sparkles } from "lucide-react";
import { SgSources } from "@/components/sg-sources";
import { PixelIcon } from "@/components/career/pixel-icons";
import { WordTip } from "@/components/career/word-tip";
import { SNAPSHOT_CHECKED, latestAi, skillShares, snapshotSources, type SnapshotSourceId } from "@/lib/sg-snapshot";
import { newsSiteGroups, type NewsSite } from "@/lib/news-sites";
import { skillArt } from "@/lib/skill-art";

const techSites = newsSiteGroups.find((group) => group.id === "tech")?.sites ?? [];

/** Three rows of about the same total width (a chip is about as wide as its name), the list order kept inside each row, so no row ends early and leaves a gap. */
function balanced(sites: NewsSite[], rows = 3): NewsSite[][] {
  const out = Array.from({ length: rows }, () => ({ width: 0, items: [] as NewsSite[] }));
  for (const site of sites) {
    const row = out.reduce((a, b) => (b.width < a.width ? b : a));
    row.items.push(site);
    row.width += site.name.length + 7;
  }
  return out.map((row) => row.items);
}
const techRows = balanced(techSites);

// skillArt maps "Cloud" to three vendors; each tile here names one vendor, so it gets that logo.
const ownLogo: Record<string, string> = { AWS: "amazonwebservices-original-wordmark.svg", Azure: "azure-original.svg" };

function Mark({ name }: { name: string }) {
  const art = skillArt(name);
  const logos = ownLogo[name] ? [ownLogo[name]] : art.logos;
  return <span className="sgs-mark" aria-hidden="true">{logos.length
    ? logos.map((file) => <Image key={file} src={BASE_PATH + "/tool-logos/" + file} width={24} height={24} alt="" unoptimized />)
    : <PixelIcon name={art.icon} size={22} />}</span>;
}

/** Short link to a named source: "IMDA 2025". The full publisher, title and date are in the accessible name. */
function Cite({ id }: { id: SnapshotSourceId }) {
  const source = snapshotSources[id];
  return <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.publisher}, ${source.title}, ${source.published} (opens in a new tab)`}>{source.publisher} {source.published.match(/\d{4}/)?.[0]}</a>;
}

/** Dated, sourced Singapore tech hiring figures in four even tiles, a full-width button for news and sources under the title, a three-row scrolling strip of tech and AI news sites (rows of equal width) and the latest AI developments. Data lives in lib/sg-snapshot.ts and lib/news-sites.ts. */
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
          {techRows.map((row, index) => <ul key={index}>
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
          {skillShares.map((skill) => {
            return <li key={skill.name}>
              <span className="sgs-row"><Mark name={skill.name} /><span className="sgs-name">{skill.name}</span></span>
              <span className="sgs-fig">
                <b>{skill.share}%<span className="sr-only"> of Singapore tech postings in {skill.year}</span></b>
                <span className="sgs-chip"><ArrowUp size={12} strokeWidth={3} aria-hidden="true" /><span className="sr-only">up </span>{skill.gain} pp<span className="sr-only"> since {skill.since}</span></span>
              </span>
              <span className="sgs-src">{skill.year}<span className="sr-only"> postings</span>, <Cite id={skill.source} /></span>
            </li>;
          })}
        </ul>
        <div className="sgs-ai">
          <h3 className="sgs-ai-h"><Sparkles size={18} aria-hidden="true" focusable="false" /><span>Latest in AI</span><small>Read {SNAPSHOT_CHECKED}</small></h3>
          <ul className="sgs-ai-list" aria-label="Recent AI models, research and findings">
            {latestAi.map((item) => <li key={item.url}>
              <a href={item.url} target="_blank" rel="noopener noreferrer" title={item.text} aria-label={`${item.kind}: ${item.title}. ${item.text} ${item.publisher}, ${item.published} (opens in a new tab)`}>
                <span className="sgs-ai-kind" data-kind={item.kind}>{item.kind}</span>
                <b>{item.title}</b>
                <span className="sgs-ai-src">{item.publisher}, {item.published}<ExternalLink size={13} aria-hidden="true" focusable="false" /></span>
              </a>
            </li>)}
          </ul>
        </div>
      </div>
    </div>
  </section>;
}

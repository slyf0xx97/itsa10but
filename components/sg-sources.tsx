"use client";
import { BASE_PATH } from "@/lib/base-path";
import { useCallback, useState } from "react";
import Image from "next/image";
import { BookOpen, ChevronRight, ExternalLink, Newspaper } from "lucide-react";
import { Popup } from "@/components/popup";
import { PixelIcon } from "@/components/career/pixel-icons";
import { SgNews } from "@/components/sg-news";
import { newsSiteGroups } from "@/lib/news-sites";
import { SNAPSHOT_CHECKED, roleNames, roleSource, roleSourceNote, signals, snapshotSources, type SnapshotSourceId } from "@/lib/sg-snapshot";

/** The source line under a figure: its period and a link to the page it comes from. */
function Source({ id, period }: { id: SnapshotSourceId; period: string }) {
  const source = snapshotSources[id];
  return <span className="sgs-src">{period}. <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.publisher}, ${source.title}, ${source.published} (opens in a new tab)`}>{source.publisher}, {source.published}</a></span>;
}

/**
 * Two buttons side by side under the card title. The wide one opens the reads and sites popup: Refresh news first, then the sites in groups (same cards as the résumé tips popup).
 * The newspaper button opens the verified figures in a popup of their own, each with its source.
 */
export function SgSources({ firecrawlKey = "" }: { firecrawlKey?: string }) {
  const [reads, setReads] = useState(false);
  const [figures, setFigures] = useState(false);
  const closeReads = useCallback(() => setReads(false), []);
  const closeFigures = useCallback(() => setFigures(false), []);
  return <>
    <div className="sgs-actions">
      <button type="button" className="btn primary sgs-open" aria-haspopup="dialog" onClick={() => setReads(true)}>
        <BookOpen size={20} aria-hidden="true" />
        <span className="sgs-open-text"><span className="sgs-long">See more reads and sites</span><span className="sgs-short">Reads and sites</span></span>
        <ChevronRight size={20} strokeWidth={3} aria-hidden="true" />
      </button>
      <button type="button" className="sgs-figures" aria-haspopup="dialog" aria-label="Verified figures, each with its source" title="Verified figures, each with its source" onClick={() => setFigures(true)}>
        <Newspaper size={22} aria-hidden="true" />
      </button>
    </div>
    <Popup open={reads} onClose={closeReads} title="Reads and sites" icon={<PixelIcon name="signals" size={22} />} wide>
      {reads && <div className="rt sgs-pop">
        <SgNews firecrawlKey={firecrawlKey} />
        {newsSiteGroups.map((group) => <section className="rt-sites" key={group.id} aria-labelledby={"sgs-g-" + group.id}>
          <h3 className="rt-title" id={"sgs-g-" + group.id}><PixelIcon name={group.icon} size={20} />{group.title}</h3>
          <ul className="rt-grid">{group.sites.map((site) => <li key={site.name}>
            <a href={site.href} target="_blank" rel="noopener noreferrer">
              <span className="rt-logo"><Image src={BASE_PATH + "/assets/logos/" + site.logo + ".png"} width={40} height={40} alt="" unoptimized /></span>
              <span className="rt-site-text"><strong>{site.name}</strong><span>{site.what}</span>{site.inRefresh && <em className="sgs-tag">In Refresh</em>}</span>
              <ExternalLink size={16} aria-hidden="true" focusable="false" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>)}</ul>
        </section>)}
      </div>}
    </Popup>
    <Popup open={figures} onClose={closeFigures} title="Verified figures" icon={<Newspaper size={22} aria-hidden="true" />} wide>
      {figures && <div className="sgs-pop">
        <p className="sgs-figures-lead">Each figure is dated and links to the page it comes from. Checked {SNAPSHOT_CHECKED}.</p>
        <ul className="sgs-facts">
          {signals.map((signal) => <li key={signal.figure + signal.source}>
            <b>{signal.figure}</b>
            <span>{signal.text}</span>
            <Source id={signal.source} period={signal.period} />
          </li>)}
          <li>
            <b>{roleNames.length} roles</b>
            <span>{roleNames.join(", ")}. {roleSourceNote}</span>
            <Source id={roleSource} period="Job Vacancies 2025" />
          </li>
        </ul>
      </div>}
    </Popup>
  </>;
}

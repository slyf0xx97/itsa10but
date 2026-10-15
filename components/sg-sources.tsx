"use client";
import { BASE_PATH } from "@/lib/base-path";
import { useCallback, useState } from "react";
import Image from "next/image";
import { ChevronRight, ExternalLink, Newspaper } from "lucide-react";
import { Popup } from "@/components/popup";
import { PixelIcon } from "@/components/career/pixel-icons";
import { SgNews } from "@/components/sg-news";
import { newsSiteGroups } from "@/lib/news-sites";
import { roleNames, roleSource, roleSourceNote, signals, snapshotSources } from "@/lib/sg-snapshot";

/** A button that opens the news and sources popup: Refresh news first, then the sites in groups (same cards as the résumé tips popup), then the extra sourced figures. */
export function SgSources({ firecrawlKey = "" }: { firecrawlKey?: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return <>
    <button type="button" className="btn primary sgs-open" aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <Newspaper size={20} aria-hidden="true" />
      <span className="sgs-open-text"><span className="sgs-long">See more latest news and sources</span><span className="sgs-short">See more news and sources</span></span>
      <ChevronRight size={20} strokeWidth={3} aria-hidden="true" />
    </button>
    <Popup open={open} onClose={close} title="Latest news and sources" icon={<PixelIcon name="signals" size={22} />} wide>
      {open && <div className="rt sgs-pop">
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
        <details className="sgs-more">
          <summary>More verified figures, each with its source</summary>
          <ul className="sgs-facts">
            {signals.map((signal) => {
              const source = snapshotSources[signal.source];
              return <li key={signal.figure + signal.source}>
                <b>{signal.figure}</b>
                <span>{signal.text}</span>
                <span className="sgs-src">{signal.period}. <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.publisher}, ${source.title}, ${source.published} (opens in a new tab)`}>{source.publisher}, {source.published}</a></span>
              </li>;
            })}
            <li>
              <b>{roleNames.length} roles</b>
              <span>{roleNames.join(", ")}. {roleSourceNote}</span>
              <span className="sgs-src">Job Vacancies 2025. <a href={snapshotSources[roleSource].url} target="_blank" rel="noopener noreferrer" aria-label={`${snapshotSources[roleSource].publisher}, ${snapshotSources[roleSource].title}, ${snapshotSources[roleSource].published} (opens in a new tab)`}>{snapshotSources[roleSource].publisher}, {snapshotSources[roleSource].published}</a></span>
            </li>
          </ul>
        </details>
      </div>}
    </Popup>
  </>;
}

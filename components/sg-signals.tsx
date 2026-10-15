"use client";
import { BASE_PATH } from "@/lib/base-path";
import { useCallback, useId, useState } from "react";
import Image from "next/image";
import { ArrowRight, BookOpen, ExternalLink, Library, Newspaper } from "lucide-react";
import { Popup } from "@/components/popup";
import { PixelIcon } from "@/components/career/pixel-icons";
import { WordTip } from "@/components/career/word-tip";
import { glideTo } from "@/components/glide-to";
import { SgFigures } from "@/components/sg-figures";
import { SNAPSHOT_CHECKED, signals } from "@/lib/sg-snapshot";
import { newsSiteGroups, type NewsSite } from "@/lib/news-sites";

/** Sites shown per group in the card. The rest are in the Sources and sites popup. */
const SHOWN = 7;
const firstSentence = (text: string) => text.split(/(?<=[.!?])\s/)[0];

function SiteLogo({ site, size }: { site: NewsSite; size: number }) {
  return <Image src={BASE_PATH + "/assets/logos/" + site.logo + ".png"} width={size} height={size} alt="" unoptimized />;
}

/**
 * Stage 1's third card: where the figures, news, jobs and lessons come from. Two labelled buttons open a popup each, and hovering or focusing a button gives a peek at what is inside first:
 * "Figures and news" (the verified Singapore figures with their sources, the skill bars, the latest news and its Refresh button) and "Sources and sites" (every site, by group).
 * Under them the same sites sit in their five groups as logos (the name is the hover text), so a visitor can go straight to one. Data: lib/news-sites.ts and lib/sg-snapshot.ts.
 */
export function SourcesCard({ firecrawlKey = "" }: { firecrawlKey?: string }) {
  const panelId = useId();
  const [figures, setFigures] = useState(false);
  const [sites, setSites] = useState(false);
  const closeFigures = useCallback(() => setFigures(false), []);
  const closeSites = useCallback(() => setSites(false), []);
  const total = newsSiteGroups.reduce((sum, group) => sum + group.sites.length, 0);
  const peekShown = newsSiteGroups.reduce((sum, group) => sum + Math.min(group.sites.length, 7), 0);
  return <section className="sgs" aria-labelledby={panelId + "-t"}>
    <div className="sgs-box">
      <div className="sgs-bar">
        <div className="sgs-top">
          <div className="sgs-titles">
            <span className="sgs-head">
              <Library size={24} aria-hidden="true" focusable="false" />
              <span className="sgs-tab" id={panelId + "-t"}>Sources and sites</span>
            </span>
            <p className="sgs-checked">Where the figures, news, jobs and lessons come from. Checked {SNAPSHOT_CHECKED}.</p>
          </div>
          <div className="sgs-actions">
            <WordTip panel buttonClass="btn sgs-open sgs-book" tone="water" title="Verified figures and news" icon={<Newspaper size={18} aria-hidden="true" />} onActivate={() => setFigures(true)}
              label="Figures and news. Hover for a peek, press to open."
              word={<><Newspaper size={20} aria-hidden="true" /><span className="sgs-open-text">Figures and news</span></>}>
              <span className="sgk">
                <span className="sgk-figs">{signals.slice(0, 3).map((signal) => <span key={signal.figure} className="sgk-fig"><b>{signal.figure}</b><span>{firstSentence(signal.text)}</span></span>)}</span>
                <span className="sgk-more" aria-hidden="true">+{signals.length - 2} more figures, skill bars and news <ArrowRight size={16} focusable="false" /></span>
              </span>
            </WordTip>
            <WordTip panel buttonClass="btn sgs-book" tone="water" title="Sources and sites" icon={<BookOpen size={18} aria-hidden="true" />} onActivate={() => setSites(true)}
              label="Sources and sites. Hover for a peek, press to open."
              word={<><BookOpen size={20} aria-hidden="true" /><span className="sgs-open-text">Sources and sites</span></>}>
              <span className="sgk">
                <span className="sgk-groups">{newsSiteGroups.map((group) => <span key={group.id} className="sgk-group">
                  <span className="sgk-group-h"><PixelIcon name={group.icon} size={16} /><b>{group.title}</b><small>{group.sites.length}</small></span>
                  <span className="sgk-logos">{group.sites.slice(0, 7).map((site) => <SiteLogo key={site.name} site={site} size={26} />)}</span>
                </span>)}</span>
                <span className="sgk-more" aria-hidden="true">+{total - peekShown} more sites <ArrowRight size={16} focusable="false" /></span>
              </span>
            </WordTip>
          </div>
        </div>
        <div className="sgs-groups">
          {newsSiteGroups.map((group) => {
            const rest = group.sites.length - SHOWN;
            return <section key={group.id} className="sgs-group" aria-labelledby={panelId + "-" + group.id}>
              <h3 id={panelId + "-" + group.id}><PixelIcon name={group.icon} size={18} /><span>{group.title}</span><small>{group.sites.length}</small></h3>
              <ul>
                {group.sites.slice(0, SHOWN).map((site) => <li key={site.name}>
                  <WordTip title={site.name} tone="water" wide={false} bare buttonClass="sgs-logo" label={site.name + " (opens in a new tab)"} onActivate={() => window.open(site.href, "_blank", "noopener,noreferrer")}
                    word={<SiteLogo site={site} size={40} />}>
                    <span className="word-tip-line">{site.what}</span>
                    {site.inRefresh && <span className="word-tip-line"><em className="sgs-tag">In Refresh</em></span>}
                  </WordTip>
                </li>)}
                {group.id === "learn" && <li><a className="sgs-more" href="#level-up" onClick={(event) => glideTo(event, "level-up")}>See more<span className="sr-only"> in Level up your résumé</span></a></li>}
                {group.id !== "learn" && rest > 0 && <li><button type="button" className="sgs-more" aria-haspopup="dialog" onClick={() => setSites(true)}>+{rest} more<span className="sr-only"> in {group.title}</span></button></li>}
              </ul>
            </section>;
          })}
        </div>
      </div>
    </div>
    <Popup open={figures} onClose={closeFigures} title="Verified figures and news" icon={<Newspaper size={22} aria-hidden="true" />} wide>
      {figures && <SgFigures firecrawlKey={firecrawlKey} />}
    </Popup>
    <Popup open={sites} onClose={closeSites} title="Sources and sites" icon={<PixelIcon name="signals" size={22} />} wide>
      {sites && <div className="rt sgs-pop">
        {newsSiteGroups.map((group) => <section className="rt-sites" key={group.id} aria-labelledby={"sgs-g-" + group.id}>
          <h3 className="rt-title" id={"sgs-g-" + group.id}><PixelIcon name={group.icon} size={20} />{group.title}</h3>
          <ul className="rt-grid">{group.sites.map((site) => <li key={site.name}>
            <a href={site.href} target="_blank" rel="noopener noreferrer">
              <span className="rt-logo"><SiteLogo site={site} size={40} /></span>
              <span className="rt-site-text"><strong>{site.name}</strong><span>{site.what}</span>{site.inRefresh && <em className="sgs-tag">In Refresh</em>}</span>
              <ExternalLink size={16} aria-hidden="true" focusable="false" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>)}</ul>
          {group.id === "learn" && <a className="sgs-more sgs-jump" href="#level-up" onClick={(event) => { closeSites(); glideTo(event, "level-up"); }}>See more<span className="sr-only"> in Level up your résumé</span></a>}
        </section>)}
      </div>}
    </Popup>
  </section>;
}

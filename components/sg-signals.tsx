"use client";
import { BASE_PATH } from "@/lib/base-path";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { ArrowRight, BookOpen, ExternalLink, Library, Newspaper } from "lucide-react";
import { Popup } from "@/components/popup";
import { PixelIcon } from "@/components/career/pixel-icons";
import { WordTip } from "@/components/career/word-tip";
import { glideTo } from "@/components/glide-to";
import { SgFigures } from "@/components/sg-figures";
import { useSnapshot } from "@/components/use-snapshot";
import { signals } from "@/lib/sg-snapshot";
import { sourceGroups, type NewsSite } from "@/lib/news-sites";

/** Sites shown per group in the card. The rest are in the Sources and sites popup. */
const SHOWN = 7;
const firstSentence = (text: string) => text.split(/(?<=[.!?])\s/)[0];

type Fit = { c: number; w: number; gap: number; plus: number; see: number };

/** Logos in one row at size c: all of them when they fit, else as many as leave room for the pill ("See more" always shows in Learn). */
function fitCount(total: number, always: boolean, { c, w, gap, plus, see }: Fit) {
  if (!always && total * c + (total - 1) * gap <= w) return total;
  return Math.max(1, Math.min(total, Math.floor((w - (always ? see : plus) + gap) / (c + gap))));
}

/**
 * Where the card is stretched to the height of its row (the box scrolls then, see check.css), the logo size grows to fill the rows; the count follows from the row width.
 * Anywhere else the CSS size and seven logos stay. Measured from the box height, which does not depend on the logos, so there is no feedback loop.
 */
function useLogoFit() {
  const rootRef = useRef<HTMLElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit | null>(null);
  useEffect(() => {
    const root = rootRef.current, box = boxRef.current;
    if (!root || !box) return;
    const measure = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const px = (value: string) => parseFloat(value) || 0;
      const groups = box.querySelector<HTMLElement>(".sgs-groups"), top = box.querySelector<HTMLElement>(".sgs-top"), bar = box.firstElementChild;
      const first = groups?.firstElementChild, list = first?.querySelector("ul"), head = first?.querySelector("h3");
      if (!groups || !top || !bar || !first || !list || !head || getComputedStyle(box).overflowY !== "auto") return setFit(null);
      const c0 = Math.min(4.6 * rem, Math.max(2.2 * rem, (root.clientWidth - 10.5 * rem) / 7));
      const barStyle = getComputedStyle(bar), groupsStyle = getComputedStyle(groups), groupStyle = getComputedStyle(first);
      const rows = groups.children.length;
      const rowH = (box.clientHeight - px(barStyle.paddingTop) - px(barStyle.paddingBottom) - top.offsetHeight - px(barStyle.rowGap) - (rows - 1) * px(groupsStyle.rowGap)) / rows;
      const chrome = px(groupStyle.paddingTop) + px(groupStyle.paddingBottom) + px(groupStyle.borderTopWidth) + px(groupStyle.borderBottomWidth) + head.offsetHeight + px(groupStyle.rowGap) + 6;
      const gap = 0.4 * rem, w = list.clientWidth;
      const c = Math.round(Math.max(c0, Math.min(rowH - chrome, 5.5 * rem, (w - 5.5 * rem - 3 * gap) / 4)));
      setFit((prev) => c <= c0 + 1 ? null : prev && prev.c === c && prev.w === w ? prev : { c, w, gap, plus: Math.max(0.8 * c, 3.4 * rem), see: 6.2 * rem });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  return { rootRef, boxRef, fit };
}

function SiteLogo({ site, size }: { site: NewsSite; size: number }) {
  return <Image src={BASE_PATH + "/assets/logos/" + site.logo + ".png"} width={size} height={size} alt="" unoptimized />;
}

/**
 * Stage 1's third card: where the figures, news, jobs and lessons come from. Two labelled buttons open a popup each, and hovering or focusing a button gives a peek at what is inside first:
 * "Figures and news" (the verified Singapore figures with their sources, the skill bars, the latest news and its Refresh button) and "Sources and sites" (every site, by group).
 * Under them the same sites sit in their three groups as logos (the name is the hover text), so a visitor can go straight to one. Data: lib/news-sites.ts and lib/sg-snapshot.ts.
 */
export function SourcesCard() {
  const panelId = useId();
  const { rootRef, boxRef, fit } = useLogoFit();
  const { checked } = useSnapshot();
  const [figures, setFigures] = useState(false);
  const [sites, setSites] = useState(false);
  const closeFigures = useCallback(() => setFigures(false), []);
  const closeSites = useCallback(() => setSites(false), []);
  const total = sourceGroups.reduce((sum, group) => sum + group.sites.length, 0);
  const peekShown = sourceGroups.reduce((sum, group) => sum + Math.min(group.sites.length, 7), 0);
  return <section className="sgs" ref={rootRef} aria-labelledby={panelId + "-t"}>
    <div className="sgs-box" ref={boxRef}>
      <div className="sgs-bar">
        <div className="sgs-top">
          <div className="sgs-titles">
            <span className="sgs-head">
              <Library size={24} aria-hidden="true" focusable="false" />
              <span className="sgs-tab" id={panelId + "-t"}>Sources and sites</span>
            </span>
            <p className="sgs-checked" tabIndex={0} aria-label={"Updated using Firecrawl, " + checked + ". News updated daily and powered by Firecrawl, which reads the web for this site."}>
              <Image src={BASE_PATH + "/assets/logos/firecrawl.png"} width={22} height={22} alt="" unoptimized />
              <span>Updated using Firecrawl</span><span aria-hidden="true">·</span><time>{checked}</time>
              <span className="sgs-fc-tip" role="tooltip">News updated daily, powered by Firecrawl. It reads this week&apos;s AI headlines once a night. Government figures are checked by hand and dated.</span>
            </p>
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
                <span className="sgk-groups">{sourceGroups.map((group) => <span key={group.id} className="sgk-group">
                  <span className="sgk-group-h"><PixelIcon name={group.icon} size={16} /><b>{group.title}</b><small>{group.sites.length}</small></span>
                  <span className="sgk-logos">{group.sites.slice(0, 7).map((site) => <SiteLogo key={site.name} site={site} size={26} />)}</span>
                </span>)}</span>
                <span className="sgk-more" aria-hidden="true">+{total - peekShown} more sites <ArrowRight size={16} focusable="false" /></span>
              </span>
            </WordTip>
          </div>
        </div>
        <div className="sgs-groups" style={fit ? ({ "--cx": fit.c + "px" } as CSSProperties) : undefined}>
          {sourceGroups.map((group) => {
            const shown = fit ? fitCount(group.sites.length, group.id === "learn", fit) : SHOWN;
            const rest = group.sites.length - shown;
            return <section key={group.id} className="sgs-group" aria-labelledby={panelId + "-" + group.id}>
              <h3 id={panelId + "-" + group.id}><PixelIcon name={group.icon} size={18} /><span>{group.title}</span><small>{group.sites.length}</small></h3>
              <ul>
                {group.sites.slice(0, shown).map((site) => <li key={site.name}>
                  <WordTip title={site.name} tone="water" wide={false} bare buttonClass="sgs-logo" label={site.name + " (opens in a new tab)"} onActivate={() => window.open(site.href, "_blank", "noopener,noreferrer")}
                    word={<SiteLogo site={site} size={40} />}>
                    <span className="word-tip-line">{site.what}</span>
                    {site.inRefresh && <span className="word-tip-line"><em className="sgs-tag">In news feed</em></span>}
                  </WordTip>
                </li>)}
                {group.id === "learn"
                  ? <li className="sgs-pill"><a className="sgs-more" href="#level-up" onClick={(event) => glideTo(event, "level-up")}>See more<span className="sr-only"> in Level up your résumé</span></a></li>
                  : rest > 0 && <li className="sgs-pill"><button type="button" className="sgs-more" aria-haspopup="dialog" onClick={() => setSites(true)}>{`+${rest}`}<span className="sr-only"> more in {group.title}</span></button></li>}
              </ul>
            </section>;
          })}
        </div>
      </div>
    </div>
    <Popup open={figures} onClose={closeFigures} title="Verified figures and news" icon={<Newspaper size={22} aria-hidden="true" />} wide>
      {figures && <SgFigures />}
    </Popup>
    <Popup open={sites} onClose={closeSites} title="Sources and sites" icon={<PixelIcon name="signals" size={22} />} wide>
      {sites && <div className="rt sgs-pop">
        {sourceGroups.map((group) => <section className="rt-sites" key={group.id} aria-labelledby={"sgs-g-" + group.id}>
          <h3 className="rt-title" id={"sgs-g-" + group.id}><PixelIcon name={group.icon} size={20} />{group.title}</h3>
          <ul className="rt-grid">{group.sites.map((site) => <li key={site.name}>
            <a href={site.href} target="_blank" rel="noopener noreferrer">
              <span className="rt-logo"><SiteLogo site={site} size={40} /></span>
              <span className="rt-site-text"><strong>{site.name}</strong><span>{site.what}</span>{site.inRefresh && <em className="sgs-tag">In news feed</em>}</span>
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

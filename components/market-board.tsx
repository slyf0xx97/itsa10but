"use client";
import { BASE_PATH } from "@/lib/base-path";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { ArrowUp, ExternalLink, Info, Sparkles } from "lucide-react";
import { PixelIcon } from "@/components/career/pixel-icons";
import { WordTip } from "@/components/career/word-tip";
import { Mark } from "@/components/sg-mark";
import { SgNews } from "@/components/sg-news";
import { useSnapshot } from "@/components/use-snapshot";
import { newsSiteGroups } from "@/lib/news-sites";
import { loadDemand } from "@/lib/demand-client";
import { DEMAND_ROLES, MIN_SAMPLE, type DemandTable } from "@/lib/edge/demand";
import { roleNames, roleSource, roleSourceNote, signals, skillShares, snapshotSources, type SnapshotSourceId } from "@/lib/sg-snapshot";

/** The logo file (public/assets/logos, without ".png") of each source's publisher. PwC has no file here, so its card shows a lettered tile. */
const SOURCE_LOGO: Partial<Record<SnapshotSourceId, string>> = {
  imda26: "imda", imda26pdf: "imda", imda25: "imda", mom: "mom", indeed: "indeed-hiring-lab", jobsskills: "jobs-skills-portal", st: "straits-times",
};
const AI_LOGO: Record<string, string> = { TechCrunch: "techcrunch" };
const biggest = Math.max(...skillShares.map((skill) => skill.share));
const ALL = "all";
type Row = { name: string; share: number; gain?: number };
/** The Learn group is the Level up list right above this section, so it is not repeated as a source. */
const siteGroups = newsSiteGroups.filter((group) => group.id !== "learn");
/** The biggest group gets a full-width card on top, so the other three can sit under it as equal cards. */
const widest = siteGroups.reduce((best, group) => (group.sites.length > best.sites.length ? group : best));

/** The first sentence, plus the next ones while the whole stays within about 105 characters, so a tile stays four lines or less. */
const shortText = (text: string) => text.split(/(?<=[.!?])\s/).reduce((kept, sentence) => (!kept || (kept + " " + sentence).length <= 105 ? (kept ? kept + " " : "") + sentence : kept), "");

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

/** Renders its children once it scrolls near the screen, so the news lookup waits until a visitor gets here instead of running on page load. */
function WhenSeen({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return setSeen(true);
    const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) { setSeen(true); observer.disconnect(); } }, { rootMargin: "400px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref}>{seen ? children : null}</div>;
}

/**
 * Under Level up: the latest figures and news laid out on the page itself, then where they come from. Left column: the AI headlines and the news feed. Right column: the dated
 * figures and the skill bars. Every number comes from lib/sg-snapshot.ts and names its source, and the news is the sites' own headlines. Sites: lib/news-sites.ts.
 */
export function MarketBoard() {
  const { checked, ai } = useSnapshot();
  const [demand, setDemand] = useState<DemandTable | null>(null);
  const [pick, setPick] = useState("");
  useEffect(() => { let live = true; void loadDemand().then((table) => { if (live) setDemand(table); }); return () => { live = false; }; }, []);
  const roleOptions = DEMAND_ROLES.flatMap((role) => {
    const sg = demand?.sg[role], feeds = demand?.roles[role];
    const row = sg && sg.sample >= MIN_SAMPLE ? sg : feeds && feeds.sample >= MIN_SAMPLE ? feeds : null;
    return row ? [{ role, row, singapore: row === sg }] : [];
  });
  // Until the table loads, or when a role has no usable sample, the IMDA list (always present) is shown.
  const chosen = pick === ALL ? undefined : roleOptions.find((option) => option.role === (pick || "Software engineer")) ?? roleOptions[0];
  const choice = chosen ? chosen.role : ALL;
  const view = chosen ? {
    title: chosen.role,
    rows: chosen.row.skills as Row[],
    biggest: Math.max(...chosen.row.skills.map((skill) => skill.share), 1),
    lead: `Share of recent ${chosen.singapore ? "Singapore " : ""}${chosen.role} postings that name each skill, highest first. Scroll for more.`,
    source: chosen.singapore
      ? <>Source: <a href="https://www.mycareersfuture.gov.sg" target="_blank" rel="noopener noreferrer">MyCareersFuture</a>. The skills employers tagged on {chosen.row.sample} postings, read {chosen.row.updated.slice(0, 10)}.</>
      : <>Source: free remote job feeds (Himalayas, Jobicy). Skills named in the text of {chosen.row.sample} postings, read {chosen.row.updated.slice(0, 10)}.</>,
  } : {
    title: "all tech jobs",
    rows: skillShares as Row[],
    biggest,
    lead: "Share of Singapore tech job postings that name each skill in 2024. The green part is the gain since 2019, in percentage points (pp).",
    source: <>Source: <a href={snapshotSources.imda25.url} target="_blank" rel="noopener noreferrer">{snapshotSources.imda25.publisher}, {snapshotSources.imda25.title}</a>, from Lightcast posting data.</>,
  };
  // One tile per figure, plus the in-demand roles. The tile shows the start of the text; the whole text is the hover text and the spoken one.
  const tiles = [
    ...signals.map((signal) => ({ key: signal.figure + signal.source, figure: signal.figure, short: shortText(signal.text), full: signal.text, source: signal.source, period: signal.period })),
    { key: "roles", figure: `${roleNames.length} roles`, short: roleNames.join(", "), full: roleNames.join(", ") + ". " + roleSourceNote, source: roleSource, period: "Job Vacancies 2025" },
  ];
  // The first clause of the first figure ("of Singapore tech job postings named AI skills in 2025, up from 14% in 2024"), so the lead always matches the data below it.
  const lead = `${signals[0].figure} ${signals[0].text.split(". ")[0]}. Below are the dated figures behind that, the latest headlines, and the sites they come from.`;
  return <section className="mb" aria-labelledby="mb-title">
    <header className="mb-head">
      <div>
        <h2 id="mb-title" className="mb-title">
          Latest figures and news
          <span className="news-info">
            <button type="button" className="news-info-btn" aria-label="About these figures" aria-describedby="mb-tip"><Info size={16} aria-hidden="true" focusable="false" /></button>
            <span className="sgs-fc-tip" role="tooltip" id="mb-tip">{lead}</span>
          </span>
        </h2>
      </div>
      <p className="sgs-checked" tabIndex={0} aria-label={"Updated using Firecrawl, " + checked + ". News updated daily and powered by Firecrawl, which reads the web for this site."}>
        <Image src={BASE_PATH + "/assets/logos/firecrawl.png"} width={22} height={22} alt="" unoptimized />
        <span>Updated using Firecrawl</span><span aria-hidden="true">,</span><time>{checked}</time>
        <span className="sgs-fc-tip" role="tooltip">News updated daily, powered by Firecrawl. It reads this week&apos;s AI headlines once a night. Government figures are checked by hand and dated.</span>
      </p>
    </header>

    <section className="mb-block" aria-labelledby="mb-nums">
      <h3 id="mb-nums">Singapore hiring figures</h3>
      <ul className="mb-figs">
        {tiles.map((tile) => {
          const percent = percentOf(tile.figure);
          return <li key={tile.key} className="mb-fig" title={tile.full}>
            <div className="sgf-fig">{percent !== null ? <Ring value={percent} /> : <Logo id={tile.source} size={34} />}<b>{tile.figure}</b></div>
            <span className="mb-fig-text" aria-hidden="true">{tile.short}</span>
            <span className="sr-only">{tile.full}</span>
            <Source id={tile.source} period={tile.period} />
          </li>;
        })}
      </ul>
    </section>

    <div className="mb-pair">
      <section className="sgs-ai mb-ai" aria-labelledby="mb-ai-h">
        <h3 className="sgs-ai-h" id="mb-ai-h"><Sparkles size={18} aria-hidden="true" focusable="false" /><span>Latest in AI</span></h3>
        <ul className="sgs-ai-list" aria-label="Recent AI models, research and findings">
          {ai.map((item) => <li key={item.url}>
            <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${item.kind}: ${item.title}. ${item.text} ${item.publisher}, ${item.published} (opens in a new tab)`}>
              <span className="sgs-ai-kind" data-kind={item.kind}>{item.kind}</span>
              <b>{item.title}</b>
              <span className="sgf-ai-text">{item.text}</span>
              <span className="sgs-ai-src">{AI_LOGO[item.publisher] && <Image src={BASE_PATH + "/assets/logos/" + AI_LOGO[item.publisher] + ".png"} width={16} height={16} alt="" unoptimized />}{item.publisher}, {item.published}<ExternalLink size={13} aria-hidden="true" focusable="false" /></span>
            </a>
          </li>)}
        </ul>
      </section>

      <section className="mb-block mb-skills" aria-labelledby="mb-skills">
        <div className="mb-skills-head">
          <h3 id="mb-skills">Top skills to have</h3>
          <label className="mb-pick"><span className="sr-only">Show the skills for </span>
            <select value={choice} onChange={(event) => setPick(event.target.value)}>
              {roleOptions.map((option) => <option key={option.role} value={option.role}>{option.role}</option>)}
              <option value={ALL}>All tech jobs (IMDA)</option>
            </select>
          </label>
        </div>
        <p className="sgf-lead">{view.lead}</p>
        <ul className="sgf-bars mb-bars" tabIndex={0} aria-label={"Skills for " + view.title + ", scroll for more"}>
          {view.rows.map((skill) => <li key={skill.name}>
            <span className="sgf-bar-name"><Mark name={skill.name} /><span>{skill.name}</span></span>
            <span className="sgf-track" aria-hidden="true">
              <i className="sgf-base" style={{ width: `${((skill.share - (skill.gain ?? 0)) / view.biggest) * 100}%` }} />
              {skill.gain ? <i className="sgf-gain" style={{ width: `${(skill.gain / view.biggest) * 100}%` }} /> : null}
            </span>
            <span className="sgf-bar-fig"><b>{skill.share}%</b>{skill.gain ? <span className="sgf-chip"><ArrowUp size={12} strokeWidth={3} aria-hidden="true" />{skill.gain} pp</span> : null}{skill.gain ? <span className="sr-only"> of tech postings, up {skill.gain} percentage points since 2019</span> : null}</span>
          </li>)}
        </ul>
        <p className="sgf-src-line">{view.source}</p>
      </section>
    </div>

    <WhenSeen><SgNews /></WhenSeen>

    <section className="mb-sources" aria-labelledby="mb-sites">
      <h3 id="mb-sites">Sources and sites</h3>
      <ul className="mb-groups">{siteGroups.map((group) => <li key={group.id} data-wide={group === widest ? "" : undefined}>
        <h4><PixelIcon name={group.icon} size={18} /><span>{group.title}</span><small>{group.sites.length}</small></h4>
        <ul className="mb-pills">{group.sites.map((site) => <li key={site.name}>
          <WordTip title={site.name} tone="water" wide={false} bare buttonClass="mb-pill" label={site.name + " (opens in a new tab)"} onActivate={() => window.open(site.href, "_blank", "noopener,noreferrer")}
            word={<><Image src={BASE_PATH + "/assets/logos/" + site.logo + ".png"} width={32} height={32} alt="" unoptimized /><span>{site.name}</span></>}>
            <span className="word-tip-line">{site.what}</span>
            {site.inRefresh && <span className="word-tip-line"><em className="sgs-tag">In news feed</em></span>}
          </WordTip>
        </li>)}</ul>
      </li>)}</ul>
    </section>
  </section>;
}

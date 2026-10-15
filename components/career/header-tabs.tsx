"use client";
import { useEffect, useState } from "react";
import { HOW_IT_WORKS, LEVEL_UP_TITLE, SECTION_IDS, TABS, activeTab } from "@/lib/journey";
import { PixelIcon, type PixelIconName } from "@/components/career/pixel-icons";
import { glideTo } from "@/components/glide-to";

const ICONS: PixelIconName[] = ["search", "book"]; // one per tab in TABS (the trail uses the same magnifier and book)
// Each tab label is cut into parts that CSS shows by width, always on one line: all of it on wide screens, up to the second part on tablets ("Level Up Your Résumé"), only the first on phones ("Level Up").
// The link carries the whole label as its accessible name, whatever is visible.
const SPLIT: Record<string, string[]> = {
  "Analyse Résumé": ["Analyse", " Résumé"],
  [LEVEL_UP_TITLE]: ["Level Up", " Your Résumé", " with Free / Open-Source Websites & Tools"],
};
const PART_CLASS = ["", "tab-mid", "tab-long"];

/** The brand slot (children) with the small "How it works" pill beside it, then the two main pixel tabs. The item for the section in view is marked, read from the same activeStage as the trail. */
export function HeaderTabs({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(-1);

  useEffect(() => {
    let frame = 0, last = -2;
    const measure = () => {
      frame = 0;
      const els = SECTION_IDS.map((id) => document.getElementById(id));
      if (els.some((el) => !el)) return;
      const next = activeTab(els.map((el) => el!.getBoundingClientRect()), window.innerHeight);
      if (next !== last) { last = next; setActive(next); }
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(measure); };
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    const resizer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(queue); // results make the page grow without a scroll
    resizer?.observe(document.body);
    queue();
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      resizer?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  const go = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => glideTo(event, id);
  return <>
    <div className="brand-row">
      {children}
      <a className="how-link" href={"#" + HOW_IT_WORKS.sections[0]} aria-current={active === TABS.length ? "location" : undefined}
        onClick={(event) => go(event, HOW_IT_WORKS.sections[0])}>
        <PixelIcon name="gear" size={18} /><span>{HOW_IT_WORKS.label}</span>
      </a>
    </div>
    <nav className="site-nav" aria-label="Page sections">
      {TABS.map((tab, index) => <a key={tab.label} href={"#" + tab.sections[0]} aria-label={tab.label} aria-current={index === active ? "location" : undefined}
        onClick={(event) => go(event, tab.sections[0])}>
        <PixelIcon name={ICONS[index]} size={28} />
        <span className="tab-label">{SPLIT[tab.label].map((part, i) => i === 0 ? part : <span key={i} className={PART_CLASS[i]}>{part}</span>)}</span>
      </a>)}
    </nav>
  </>;
}

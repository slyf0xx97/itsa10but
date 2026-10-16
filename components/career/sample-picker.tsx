"use client";

import { BASE_PATH } from "@/lib/base-path";
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { PlayCircle } from "lucide-react";
import { sampleJobLinks, samplePaths } from "@/lib/sample-paths";
import { menuSide } from "@/lib/pause-gate";

const Caret = () => <svg className="sm-caret-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false" shapeRendering="crispEdges"><path fill="currentColor" d="M2 5h12v2h-2v2h-2v2H6V9H4V7H2V5Z" /></svg>;

type Props = { onPick: (id: string) => void; disabled?: boolean; activeId?: string };

/** The three job sites each sample links to, as small logos on the same row as the role (files in public/assets/logos). */
const SITE_LOGO: Record<string, string> = { MyCareersFuture: "mycareersfuture", LinkedIn: "linkedin", JobStreet: "jobstreet" };

/**
 * "Play sample" split control: the main button runs the first sample, the caret opens a menu of every sample role.
 * The menu is a popover: absolutely positioned under the buttons (above them when there is no room), so the page never changes height.
 * It is a disclosure (button with aria-expanded, then a list of buttons and links), not role="menu", because each row also holds links.
 */
export function SampleMenu({ onPick, disabled = false, activeId = "" }: Props) {
  const [open, setOpen] = useState(false);
  const shown = open && !disabled;
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = "sample-menu-" + useId().replace(/:/g, "");

  useEffect(() => {
    if (!shown) return;
    const outside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [shown]);

  // Place the popover before it paints: keep it inside the screen sideways, open it on the side with more room and cap its height there.
  useLayoutEffect(() => {
    if (!shown) return;
    const place = () => {
      const root = rootRef.current, panel = menuRef.current;
      if (!root || !panel) return;
      panel.style.maxHeight = "";
      const at = root.getBoundingClientRect();
      const wide = document.documentElement.clientWidth;
      const headerBottom = Math.max(0, document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 0);
      const below = window.innerHeight - at.bottom - 12, above = at.top - headerBottom - 12;
      const side = menuSide(below, above, panel.offsetHeight);
      panel.dataset.side = side;
      panel.style.maxHeight = Math.max(160, Math.min(side === "below" ? below : above, 560)) + "px";
      const left = Math.min(Math.max(at.left, 8), Math.max(8, wide - panel.offsetWidth - 8));
      panel.style.left = left - at.left + "px";
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [shown]);

  // Move focus into the list on open: the current sample if there is one, else the first.
  useEffect(() => {
    if (!shown) return;
    (menuRef.current?.querySelector<HTMLElement>('.sm-pick[aria-pressed="true"]') ?? menuRef.current?.querySelector<HTMLElement>(".sm-pick"))?.focus({ preventScroll: true });
  }, [shown]);

  const pick = (id: string) => {
    if (shown) triggerRef.current?.focus({ preventScroll: true }); // the button is about to be disabled by the run; the run controls take focus from here
    setOpen(false);
    onPick(id);
  };

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && shown) { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); return; }
    const inMenu = menuRef.current?.contains(event.target as Node);
    if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    if (!inMenu) {
      // Arrow keys on the trigger open the list (focus moves in through the effect above).
      if (event.target === triggerRef.current && (event.key === "ArrowDown" || event.key === "ArrowUp") && !disabled) { event.preventDefault(); setOpen(true); }
      return;
    }
    const picks = Array.from(menuRef.current!.querySelectorAll<HTMLButtonElement>(".sm-pick"));
    const here = picks.indexOf((event.target as HTMLElement).closest("li")?.querySelector<HTMLButtonElement>(".sm-pick") as HTMLButtonElement);
    if (here < 0) return; // focus is on a job link: leave the arrows alone
    // Column count comes from the live layout (two wide, one on phones), so rows work at every width.
    const cols = getComputedStyle(menuRef.current!.querySelector(".sm-list")!).gridTemplateColumns.split(" ").length;
    const step = event.key === "ArrowDown" ? cols : event.key === "ArrowUp" ? -cols : event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const next = event.key === "Home" ? 0 : event.key === "End" ? picks.length - 1 : Math.min(picks.length - 1, Math.max(0, here + step));
    event.preventDefault();
    picks[next]?.focus();
  }

  return <div className={"sm" + (shown ? " is-open" : "")} ref={rootRef} onKeyDown={onKeyDown}
    onBlur={(event) => { if (shown && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
    <div className="sm-split">
      <button type="button" className="sm-main" title="Runs a made-up résumé and job from start to finish." disabled={disabled} onClick={() => pick(samplePaths[0].id)}><span className="sm-main-top"><PlayCircle size={16} aria-hidden="true" /> Play sample</span><span className="sm-sub">See how it works first. Pick a sample role and résumé.</span></button>
      <button ref={triggerRef} type="button" className="sm-caret" disabled={disabled} aria-label="Choose a sample role" aria-expanded={shown} aria-controls={shown ? menuId : undefined} onClick={() => setOpen(!shown)}><Caret /></button>
    </div>
    {shown && <div className="sm-menu" id={menuId} ref={menuRef} data-side="below">
      <p className="sm-head"><strong>Pick a sample role</strong></p>
      <ul className="sm-list" aria-label="Sample roles">
        {samplePaths.map((path) => <li key={path.id} className="sm-item">
          <button type="button" className="sm-pick" aria-pressed={activeId === path.id} onClick={() => pick(path.id)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static pixel SVG, nothing to optimise */}
            <img className="sm-icon" src={`${BASE_PATH}/assets/icons/samples/${path.icon}.svg`} alt="" aria-hidden="true" width={28} height={28} />
            <span className="sm-text"><span className="sm-label">{path.label}</span><span className="sm-tag">{path.interest}</span></span>
          </button>
          <span className="sm-links">{sampleJobLinks(path).map((link) => <a key={link.site} href={link.url} target="_blank" rel="noopener noreferrer" title={`${link.label}: new jobs for ${path.label}`} aria-label={`${link.label} for ${path.label} (opens in a new tab)`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- small static logo file */}
            <img src={`${BASE_PATH}/assets/logos/${SITE_LOGO[link.site]}.png`} alt="" aria-hidden="true" width={22} height={22} />
          </a>)}</span>
        </li>)}
      </ul>
    </div>}
  </div>;
}

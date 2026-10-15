"use client";

import { useEffect, useRef } from "react";
import { PixelAgent, readers } from "@/components/career/reader-cards";

/**
 * The four readers in the empty space at the right of the hero plate: a vertical column where they bob, slide up and down, swap places in pairs and sometimes wave.
 * It is absolutely positioned, so it adds no height, and app/hero.css hides it when the plate is too narrow to have spare room.
 * Decorative only (the readers are described in their own cards), so the whole column is aria-hidden and the sprites are not focusable.
 * All motion is CSS (transform and opacity). This component only pauses it while the column is off screen.
 */
export function HeroAgents() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const watcher = new IntersectionObserver(([entry]) => el.classList.toggle("is-off", !entry.isIntersecting));
    watcher.observe(el);
    // The drifting clouds behind the hero pause too while the hero is off screen.
    const hero = el.closest(".hero");
    const heroWatcher = hero ? new IntersectionObserver(([entry]) => hero.classList.toggle("is-off", !entry.isIntersecting)) : null;
    if (hero) heroWatcher?.observe(hero);
    return () => { watcher.disconnect(); heroWatcher?.disconnect(); };
  }, []);

  return <div className="ha" ref={ref} aria-hidden="true">
    {readers.map((reader) => <span key={reader.kind} className={"ha-slot " + reader.kind} data-name={reader.name}>
      <span className="ha-hop"><PixelAgent kind={reader.kind} /></span>
    </span>)}
    <i className="ha-spark s1" /><i className="ha-spark s2" /><i className="ha-spark s3" /><i className="ha-spark s4" />
  </div>;
}

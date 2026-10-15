"use client";

import { useEffect, useRef, useState } from "react";

type Rect = [x: number, y: number, w: number, h: number];
const Pixel = ({ rects }: { rects: Rect[] }) => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false" shapeRendering="crispEdges" fill="currentColor"><path d={rects.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h${-w}z`).join("")} /></svg>;
const pauseIcon: Rect[] = [[4, 3, 3, 10], [9, 3, 3, 10]];
const playIcon: Rect[] = [[4, 2, 2, 12], [6, 3, 2, 10], [8, 4, 2, 8], [10, 5, 2, 6], [12, 7, 1, 2]];
const resetIcon: Rect[] = [[5, 3, 5, 2], [3, 5, 2, 6], [5, 11, 6, 2], [11, 8, 2, 3], [10, 1, 1, 6], [11, 2, 1, 4], [12, 3, 1, 2]];

type Props = { active: boolean; paused: boolean; onToggle: () => void; onReset: () => void };

/**
 * Pause / Resume and Reset for a run in progress. The live region is always mounted, so a state change is still announced
 * after the buttons themselves have gone (Reset ends the run and removes them).
 */
export function RunControls({ active, paused, onToggle, onReset }: Props) {
  const [said, setSaid] = useState("");
  const pauseRef = useRef<HTMLButtonElement>(null);

  // A run starts from the Play sample buttons, which are disabled for its duration: hand focus to Pause so keyboard users keep their place.
  useEffect(() => {
    if (!active) return;
    const here = document.activeElement;
    if (!here || here === document.body || here.closest(".sm")) pauseRef.current?.focus({ preventScroll: true });
  }, [active]);

  return <>
    {active && <div className="run-ctl" role="group" aria-label="Run controls">
      <button ref={pauseRef} type="button" className="btn rc-btn" onClick={() => { setSaid(paused ? "Resumed." : "Paused. Press Resume to carry on."); onToggle(); }}>
        <Pixel rects={paused ? playIcon : pauseIcon} /> {paused ? "Resume" : "Pause"}
      </button>
      <button type="button" className="btn quiet rc-btn" onClick={() => {
        setSaid("Reset. Press Play sample to start again.");
        onReset();
        // The buttons unmount with the run: move focus to the sample button so it is not lost.
        requestAnimationFrame(() => document.querySelector<HTMLElement>(".hero .sm-main")?.focus({ preventScroll: true }));
      }}>
        <Pixel rects={resetIcon} /> Reset
      </button>
    </div>}
    <span className="sr-only" role="status" aria-live="polite">{said}</span>
  </>;
}

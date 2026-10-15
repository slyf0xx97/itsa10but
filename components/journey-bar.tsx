"use client";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { STAGES, activeStage, trailProgress } from "@/lib/journey";
import { PixelIcon, type PixelIconName } from "@/components/career/pixel-icons";
import { PixelAgent, type SpriteKind } from "@/components/career/reader-cards";
import { glideTo } from "@/components/glide-to";

const ICONS: PixelIconName[] = ["report", "search", "compass", "book"]; // one per stage in STAGES; the last node (Level up) sits at the summit by the flag
const PARTY: SpriteKind[] = ["scout", "finder", "recruiter", "coach"]; // the scout leads, the others follow in this order
const SMOOTH = 0.12; // share of the remaining distance the lead covers per 60 Hz frame
const LAG = 0.1; // each follower closes that much less of the gap, so the party stretches out while it moves
const STILL_MS = 160; // keep the walk animation this long after the last movement
const TILT = 0.7; // share of the slope angle the sprites lean into, capped at MAX_TILT degrees
const MAX_TILT = 24;
const SAMPLES = 320; // points in the trail lookup table

type NodeState = "done" | "busy" | "lit" | "dim";
const STATE_TEXT: Record<NodeState, string> = { done: ", done", busy: ", in progress", lit: "", dim: ", not reached yet" };

/** Progress bar fixed to the bottom of the screen, drawn as a mountain range. The four readers climb its winding trail to the flag as the page scrolls.
 *  The trail is one SVG path built in pixels from the geometry variables in journey.css. On layout it is sampled once into a lookup table (position and lean every
 *  step of its length); nodes sit at points along it and each frame only interpolates the table. Section positions are cached too, so a scroll event reads no layout. */
export function JourneyBar({ busy, hasResult, hasInput }: { busy: boolean; hasResult: boolean; hasInput: boolean }) {
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState(-1);
  const activeRef = useRef(-2); // last index measured, so React state only changes when the stage does
  const [away, setAway] = useState(false); // true once "How it works" is on screen: the bar steps aside for the map
  const awayRef = useRef(false);

  useEffect(() => {
    const root = rootRef.current, track = trackRef.current, svg = svgRef.current;
    const paths = svg ? Array.from(svg.querySelectorAll<SVGPathElement>("path")) : [];
    if (!root || !track || !svg || paths.length < 3) return;
    const edge = paths[0], done = paths[2];
    const walkers = Array.from(track.querySelectorAll<HTMLElement>(".jbar-walker"));
    const stops = Array.from(track.querySelectorAll<HTMLElement>("li"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cur = walkers.map(() => 0);
    let target = 0, face = 1, spread = 1, last = 0, lastY = window.scrollY, walkUntil = 0, placed = false, loop = 0, measureFrame = 0;
    let total = 0, lead = 0, gap = 0, lift = 0; // trail length, lead-in length, follower spacing and sprite lift, all in px
    const table = new Float32Array(SAMPLES * 3); // x, y and lean (degrees) at SAMPLES points evenly spaced along the trail
    let tops: number[] = [], bottoms: number[] = [], howTop = Infinity; // section edges in document space, refreshed on resize
    const lenOf = (p: number) => lead + p * (total - lead); // progress 0 is the first node, 1 the flag

    const place = () => {
      if (!total) return;
      done.style.strokeDashoffset = String(total - lenOf(cur[0]));
      walkers.forEach((el, k) => {
        const len = Math.min(total, Math.max(0, lenOf(cur[k]) - spread * k * gap)); // followers trail behind, and never leave the trail
        const f = len / total * (SAMPLES - 1), i = Math.min(SAMPLES - 2, Math.floor(f)), u = f - i, o = i * 3;
        const x = table[o] + (table[o + 3] - table[o]) * u, yy = table[o + 1] + (table[o + 4] - table[o + 1]) * u, tilt = table[o + 2] + (table[o + 5] - table[o + 2]) * u;
        el.style.transform = "translate3d(" + x.toFixed(1) + "px," + (yy - lift).toFixed(1) + "px,0) rotate(" + tilt.toFixed(1) + "deg)";
      });
    };

    // Build the trail for the current size, then set the nodes on it.
    const layout = () => {
      const w = track.offsetWidth, h = track.offsetHeight;
      if (w < 100 || h < 20) return;
      const css = getComputedStyle(root), v = (name: string) => parseFloat(css.getPropertyValue(name)) || 0;
      const x0 = v("--jb-x0"), x1 = w - v("--jb-xr"), y0 = v("--jb-y0"), y1 = v("--jb-y1"), amp = v("--jb-amp");
      gap = v("--jb-gap"); lift = v("--jb-lift"); lead = gap * (PARTY.length - 1);
      const n = Math.max(24, Math.round((x1 - x0) / 10)), waves = Math.max(2, Math.round((x1 - x0) / 330));
      let d = "";
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const y = y0 + (y1 - y0) * Math.pow(t, 1.3) + amp * Math.sin(t * Math.PI * 2 * waves) * Math.sin(t * Math.PI); // climbs, with a wiggle that dies out at both ends
        d += (i ? "L" : "M") + (x0 + (x1 - x0) * t).toFixed(1) + " " + y.toFixed(1);
      }
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      paths.forEach((path) => path.setAttribute("d", d));
      total = edge.getTotalLength();
      done.style.strokeDasharray = String(total);
      for (let k = 0; k < SAMPLES; k++) {
        const len = total * k / (SAMPLES - 1), pt = edge.getPointAtLength(len), a = edge.getPointAtLength(Math.max(0, len - 6)), b = edge.getPointAtLength(Math.min(total, len + 6));
        table[k * 3] = pt.x; table[k * 3 + 1] = pt.y;
        table[k * 3 + 2] = Math.max(-MAX_TILT, Math.min(MAX_TILT, Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI * TILT));
      }
      stops.forEach((li, i) => {
        const pt = edge.getPointAtLength(lenOf(i / (STAGES.length - 1)));
        li.style.left = pt.x.toFixed(1) + "px";
        li.style.top = pt.y.toFixed(1) + "px";
      });
      place();
    };

    // Each frame: ease every walker toward the target, then decide from scroll speed and remaining distance whether they are walking.
    const frame = (now: number) => {
      loop = 0;
      const dt = Math.min(3, (now - last) / 16.67);
      last = now;
      const y = window.scrollY, speed = Math.abs(y - lastY) / Math.max(dt, 0.1);
      lastY = y;
      if (reduced.matches) { cur.fill(target); spread = face; root.classList.remove("is-walking"); place(); return; }
      let gapLeft = 0;
      cur.forEach((c, k) => { cur[k] = c + (target - c) * (1 - Math.pow(1 - SMOOTH * (1 - LAG * k), dt)); gapLeft = Math.max(gapLeft, Math.abs(target - cur[k])); });
      if (Math.abs(target - cur[0]) > 0.0004) face = target > cur[0] ? 1 : -1;
      spread += (face - spread) * (1 - Math.pow(0.8, dt));
      if (gapLeft > 0.002 || (speed > 1 && target > 0 && target < 1)) walkUntil = now + STILL_MS;
      const walking = now < walkUntil;
      root.classList.toggle("is-walking", walking);
      root.classList.toggle("is-back", face < 0);
      place();
      if (walking || gapLeft > 0.0004 || Math.abs(face - spread) > 0.01) loop = requestAnimationFrame(frame);
      else { cur.fill(target); spread = face; place(); }
    };
    const run = () => { if (!loop) { last = performance.now(); loop = requestAnimationFrame(frame); } };
    const aim = (progress: number) => {
      target = progress;
      if (!placed || reduced.matches) { placed = true; cur.fill(progress); spread = face; place(); return; }
      run();
    };

    // Section edges in document space. Layout is read here (on resize and when a section changes size), never on scroll.
    const refresh = () => {
      const els = STAGES.map((stage) => document.getElementById(stage.id));
      if (els.some((el) => !el)) { tops = []; return; }
      const sy = window.scrollY;
      const r = els.map((el) => el!.getBoundingClientRect());
      tops = r.map((rect) => rect.top + sy); bottoms = r.map((rect) => rect.bottom + sy);
      const how = document.getElementById("how-it-works");
      howTop = how ? how.getBoundingClientRect().top + sy : Infinity;
    };
    const measure = () => {
      measureFrame = 0;
      if (!tops.length || document.hidden) return;
      const viewport = window.innerHeight, sy = window.scrollY;
      const rects = tops.map((top, i) => ({ top: top - sy, bottom: bottoms[i] - sy }));
      const index = activeStage(rects, viewport);
      const nowAway = howTop - sy < viewport * 0.92; // the map's top edge has come up into the screen
      if (nowAway !== awayRef.current) { awayRef.current = nowAway; setAway(nowAway); }
      const prev = activeRef.current;
      if (index !== prev) { activeRef.current = index; setActive(index); }
      if (index < 0 && prev === -1) return; // still above stage 1: the bar is hidden and the party already stands at the start
      aim(trailProgress(rects, viewport, rects[rects.length - 1])); // the party reaches the flag as Level up arrives
    };
    const queue = () => { if (!measureFrame) measureFrame = requestAnimationFrame(measure); };
    const remeasure = () => { refresh(); queue(); };

    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", remeasure);
    document.addEventListener("visibilitychange", queue);
    const resizer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(remeasure); // the page grows when results appear
    resizer?.observe(document.body); // the hero or fonts can move every section without resizing any of them
    resizer?.observe(document.querySelector("main") ?? document.body);
    STAGES.map((stage) => stage.id).forEach((id) => { const el = document.getElementById(id); if (el) resizer?.observe(el); }); // a column can change height without the page changing
    const shaper = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(layout); // the bar itself changed width or breakpoint
    shaper?.observe(track);
    layout();
    remeasure();
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", remeasure);
      document.removeEventListener("visibilitychange", queue);
      resizer?.disconnect();
      shaper?.disconnect();
      cancelAnimationFrame(measureFrame);
      cancelAnimationFrame(loop);
    };
  }, []);

  const stateOf = (index: number): NodeState => {
    if (index === 0) return hasInput ? "done" : "lit";
    if (index === 1) return hasResult ? "done" : busy ? "busy" : "dim";
    if (index === 2) return hasResult ? "lit" : "dim";
    return "lit";
  };

  return <nav ref={rootRef} className={"jbar" + (active < 0 || away ? " is-hidden" : "")} aria-label="Your journey">
    <div className="jbar-sky" aria-hidden="true"><i className="jbar-cloud c1" /><i className="jbar-cloud c2" /><i className="jbar-cloud c3" /></div>
    <div className="jbar-art" aria-hidden="true"><span className="jbar-ridges" /><span className="jbar-summit" /><span className="jbar-near" /></div>
    <div ref={trackRef} className="jbar-track">
      <svg ref={svgRef} className="jbar-trail" aria-hidden="true" focusable="false">
        <path className="jbar-way-edge" fill="none" />
        <path className="jbar-way" fill="none" />
        <path className="jbar-way-done" fill="none" />
      </svg>
      <ol>
        {STAGES.map((stage, index) => {
          const state = stateOf(index);
          return <li key={stage.id}>
            <a className={"jbar-node " + state} href={"#" + stage.id} aria-current={index === active ? "step" : undefined}
              aria-label={"Stage " + stage.number + ": " + stage.title + STATE_TEXT[state]} onClick={(event) => glideTo(event, stage.id)}>
              <span className="jbar-face">
                <span className="jbar-icon"><PixelIcon name={ICONS[index]} size={16} /></span>
                <b className="jbar-num" aria-hidden="true">{stage.number}</b>
                {state === "done" && <span className="jbar-badge" aria-hidden="true"><Check size={9} strokeWidth={4} /></span>}
              </span>
              <span className="jbar-label" aria-hidden="true">{stage.label}</span>
            </a>
          </li>;
        })}
      </ol>
      <div className="jbar-party" aria-hidden="true">
        {PARTY.map((kind) => <span key={kind} className="jbar-walker"><span className="jbar-body"><span className="jbar-hop"><PixelAgent kind={kind} small /></span></span></span>)}
      </div>
    </div>
  </nav>;
}

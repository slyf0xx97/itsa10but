import { BASE_PATH } from "@/lib/base-path";
import type { CSSProperties, RefObject } from "react";
import { PixelIcon, type PixelIconName } from "@/components/career/pixel-icons";
import { ARRIVALS, CYCLE, HOPS, NODE_ORDER, READER_IDS, SEG_ENDS, WIDE, powerLine, type Hop, type Layout, type NodeId, type ReaderId, type SegId } from "@/lib/trail-geometry";

// The drawings of the "How it works" map. TrailArt is the still picture: the painted landscape, the road and its markers.
// The scenery moves with small CSS animations (clouds, birds, fog, river glints, flag, fire), switched off for reduced motion and paused off screen (arch.css).
// TrailLive is a second SVG on top that holds what travels: the note, the agents who carry it, arrival pulses and beads on the road.
// It uses SMIL (animateMotion) on one shared clock, so pausing it off screen is a single svg.pauseAnimations() call.

export type Which = "wide" | "rail";
const f = (n: number) => String(+n.toFixed(4));
const ICON: Partial<Record<NodeId, PixelIconName>> = { camp: "scroll", native: "gear", boost: "cloud", result: "report" };
const RING: Partial<Record<NodeId, string>> = { native: "#e8912d", boost: "#3bb4d6", result: "#e8912d" };
const SPRITE: Record<ReaderId, [number, number]> = { scout: [0, 0], finder: [627, 0], recruiter: [0, 627], planner: [627, 627] };
const INK = "#1f2430";
const SIZE: Record<Which, { node: number; sprite: number; glyph: number }> = { wide: { node: 20, sprite: 46, glyph: 1.15 }, rail: { node: 16, sprite: 34, glyph: 0.95 } };
const isReader = (id: NodeId): id is ReaderId => (READER_IDS as string[]).includes(id);

function Sprite({ stop, size }: { stop: ReaderId; size: number }) {
  const [qx, qy] = SPRITE[stop];
  return <svg x={-size / 2} y={-size / 2} width={size} height={size} viewBox={`${qx} ${qy} 627 627`}>
    <image href={`${BASE_PATH}/assets/agents/pixel-team-v2.png`} width="1254" height="1254" style={{ imageRendering: "pixelated" }} />
  </svg>;
}

/** Glyphs for the note, defined once per svg. Raw shows personal details in coral, masked swaps them for dark blocks, checked adds a green tick. */
function Defs({ p }: { p: string }) {
  const sheet = (masked: boolean, tick: boolean) => <g>
    <circle r="23" fill={`url(#${p}-glow)`} />
    <rect x="-12" y="-9" width="24" height="18" rx="3" fill="#f6ecd2" stroke={INK} strokeWidth="1.6" />
    <rect x="-8" y="-5.5" width="9" height="3" fill={masked ? INK : "#c93a25"} opacity={masked ? 0.8 : 1} />
    <rect x="-8" y="-0.5" width="16" height="2.6" fill={masked ? INK : "#c93a25"} opacity={masked ? 0.8 : 1} />
    <rect x="-8" y="4" width="11" height="2.4" fill="#3a4955" opacity="0.55" />
    {tick && <g><circle cx="10" cy="-8" r="6" fill="#2d7d46" stroke="#fff" strokeWidth="1.4" /><path d="M7 -8 L9.4 -5.6 L13.4 -10.4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></g>}
  </g>;
  return <defs>
    <radialGradient id={`${p}-glow`}><stop offset="0" stopColor="#dbe86a" stopOpacity="0.95" /><stop offset="0.55" stopColor="#dbe86a" stopOpacity="0.35" /><stop offset="1" stopColor="#dbe86a" stopOpacity="0" /></radialGradient>
    <g id={`${p}-raw`}>{sheet(false, false)}</g>
    <g id={`${p}-masked`}>{sheet(true, false)}</g>
    <g id={`${p}-checked`}>{sheet(true, true)}</g>
    <g id={`${p}-pine`}><rect x="-3" y="-8" width="6" height="10" fill="#8a5a33" /><polygon points="0,-58 -17,-30 17,-30" fill="#3f9e57" /><polygon points="0,-44 -21,-14 21,-14" fill="#2d7d46" /><polygon points="0,-30 -24,0 24,0" fill="#3f9e57" /><polygon points="0,-30 3,0 24,0" fill="#2d7d46" opacity="0.5" /></g>
    <g id={`${p}-fir`}><rect x="-3" y="-8" width="6" height="10" fill="#5b3b22" /><polygon points="0,-58 -17,-30 17,-30" fill="#256b3d" /><polygon points="0,-44 -21,-14 21,-14" fill="#1d5a34" /><polygon points="0,-30 -24,0 24,0" fill="#256b3d" /><polygon points="0,-30 3,0 24,0" fill="#164a2a" opacity="0.6" /></g>
  </defs>;
}

function Node({ id, x, y, which }: { id: NodeId; x: number; y: number; which: Which }) {
  const { node, sprite } = SIZE[which];
  if (isReader(id)) {
    const r = sprite / 2 + 2;
    return <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill="#fff" stroke="#167a66" strokeWidth="3.5" /><circle r={r} fill="none" stroke={INK} strokeWidth="1.2" />
      <Sprite stop={id} size={sprite} />
    </g>;
  }
  const icon = ICON[id];
  const ring = RING[id] ?? "#167a66";
  return <g transform={`translate(${x} ${y})`}>
    <circle r={node + 6} fill="#fff" opacity="0.5" />
    <circle r={node} fill="#fff" stroke={ring} strokeWidth="4.5" />
    <circle r={node} fill="none" stroke={INK} strokeWidth="1.4" />
    {icon && <g transform={`translate(${-node * 0.55} ${-node * 0.55})`} style={{ color: INK } as CSSProperties}><PixelIcon name={icon} size={node * 1.1} /></g>}
  </g>;
}

function Trail({ layout, which }: { layout: Layout; which: Which }) {
  const ids = Object.keys(SEG_ENDS) as SegId[];
  const wide = which === "wide";
  return <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    {ids.map((id) => <path key={id + "g"} d={layout.segs[id]} stroke="#dbe86a" strokeWidth={wide ? 26 : 20} opacity="0.28" />)}
    {ids.map((id) => <path key={id + "e"} d={layout.segs[id]} stroke="#8a5a33" strokeWidth={wide ? 17 : 13} opacity="0.55" />)}
    {ids.map((id) => <path key={id + "b"} d={layout.segs[id]} stroke="#f6ecd2" strokeWidth={wide ? 11 : 8} />)}
    {ids.map((id) => <path key={id + "d"} d={layout.segs[id]} stroke="#b9651a" strokeWidth="2.4" strokeDasharray="1 11" opacity="0.6" />)}
  </g>;
}

// Scenery -----------------------------------------------------------------------------------------------------------------------------

type Peak = readonly [x: number, top: number, halfWidth: number];
/** A row of mountains with snowcaps and a shaded side. */
function Mountains({ peaks, base, fill, shade }: { peaks: readonly Peak[]; base: number; fill: string; shade: string }) {
  return <g>{peaks.map(([x, top, hw]) => {
    const h = base - top;
    return <g key={x}>
      <polygon points={`${x - hw},${base} ${x},${top} ${x + hw},${base}`} fill={fill} />
      <polygon points={`${x},${top} ${x + hw},${base} ${x + hw * 0.25},${base}`} fill={shade} opacity="0.35" />
      <polygon points={`${x},${top} ${x + hw * 0.3},${top + h * 0.3} ${x + hw * 0.13},${top + h * 0.23} ${x},${top + h * 0.34} ${x - hw * 0.13},${top + h * 0.23} ${x - hw * 0.3},${top + h * 0.3}`} fill="#fff" />
    </g>;
  })}</g>;
}
const FAR: Peak[] = [[60, 250, 90], [170, 222, 100], [290, 238, 90], [410, 192, 110], [540, 206, 100], [660, 150, 120], [790, 168, 100], [900, 112, 130], [1010, 128, 110]];
const NEAR: Peak[] = [[110, 300, 80], [360, 280, 90], [600, 262, 80], [830, 222, 100]];
const SUMMIT: Peak[] = [[1165, 22, 170]];

const cloud = (x: number, y: number, s: number, dur: number, delay: number) => <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
  <g className="qm-a qm-a-cloud" style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s` }}>
    <ellipse cx="0" cy="0" rx="34" ry="10" fill="#fff" opacity="0.85" /><ellipse cx="-14" cy="-7" rx="16" ry="10" fill="#fff" opacity="0.85" /><ellipse cx="10" cy="-10" rx="18" ry="11" fill="#fff" opacity="0.85" />
  </g>
</g>;
const bird = (y: number, s: number, dur: number, delay: number) => <g key={`${y}-${delay}`} transform={`translate(0 ${y}) scale(${s})`}>
  <g className="qm-a qm-a-bird" style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s` }}>
    <path d="M0 0 q5 -7 10 0 q5 -7 10 0" fill="none" stroke="#3a4955" strokeWidth="1.8" strokeLinecap="round" />
  </g>
</g>;

/** The wide map's painted landscape, back to front: sky, sun and clouds, two mountain ranges and the snowy summit, rolling hills, ground that climbs like a stair of hills beside the road,
 *  a foggy forest by the camp, a rocky pass with a waterfall, the river valley, a ravine, a camp and the summit with its flag and chest. The "Built with" cave at the bottom right is HTML (how-it-works.tsx). Coordinates are board units (1200 by 536). */
function WideScenery() {
  const pine = (x: number, y: number, s: number, id = "pine") => <use key={`${id}${x}-${y}`} href={`#w-bg-${id}`} transform={`translate(${x} ${y}) scale(${s})`} />;
  const g1 = "M0 488 C60 488 90 480 120 478 S215 472 250 442 S262 392 292 388 S400 392 432 386 S462 372 480 340 S505 274 560 272 S690 274 728 272 S752 258 772 248 S790 246 840 246 S975 248 1005 216 S1030 178 1075 178 S1140 180 1165 124 S1190 100 1200 96";
  return <g>
    <defs>
      <linearGradient id="w-bg-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fd0ee" /><stop offset="0.55" stopColor="#d4eef2" /><stop offset="1" stopColor="#e9f6dc" /></linearGradient>
      <linearGradient id="w-bg-grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9bd96e" /><stop offset="1" stopColor="#6dbb4c" /></linearGradient>
      <linearGradient id="w-bg-grass2" x1="430" y1="0" x2="772" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#c4ee98" stopOpacity="0" /><stop offset="0.12" stopColor="#c4ee98" /><stop offset="0.88" stopColor="#c4ee98" /><stop offset="1" stopColor="#c4ee98" stopOpacity="0" /></linearGradient>
      <linearGradient id="w-bg-rock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bdb09c" /><stop offset="1" stopColor="#9a8c78" /></linearGradient>
    </defs>
    <rect width="1200" height="536" fill="url(#w-bg-sky)" />
    <circle cx="330" cy="40" r="15" fill="#ffe27a" opacity="0.95" />
    {cloud(250, 34, 1, 46, -10)}{cloud(640, 30, 0.9, 58, -30)}{cloud(800, 70, 1, 52, -22)}
    <Mountains peaks={FAR} base={330} fill="#b4cde0" shade="#6f93ad" />
    <Mountains peaks={NEAR} base={345} fill="#93b7bd" shade="#4f7a80" />
    <Mountains peaks={SUMMIT} base={330} fill="#a7bfd2" shade="#5f819b" />
    <path d="M0 345 C100 300 200 330 330 312 S560 262 700 250 S900 205 1000 192 S1150 165 1200 165 V536 H0 Z" fill="#a9de80" />
    {pine(430, 300, 0.4)}{pine(452, 296, 0.34)}{pine(880, 222, 0.4)}{pine(905, 226, 0.34)}
    <path d={`${g1} V536 H0 Z`} fill="url(#w-bg-grass)" />
    <path d={`${g1} V536 H0 Z`} transform="translate(0 46)" fill="#5fae42" opacity="0.5" />
    {/* beside the camp: a dark forest in fog, where personal details disappear */}
    {pine(282, 470, 0.85, "fir")}{pine(308, 452, 0.95, "fir")}{pine(334, 472, 0.9, "fir")}{pine(356, 456, 0.8, "fir")}{pine(272, 490, 0.7, "fir")}{pine(364, 492, 0.7, "fir")}
    <g fill="#fff">
      <ellipse className="qm-a qm-a-fog" cx="316" cy="440" rx="66" ry="12" opacity="0.5" style={{ animationDuration: "9s" }} />
      <ellipse className="qm-a qm-a-fog" cx="340" cy="466" rx="70" ry="12" opacity="0.5" style={{ animationDuration: "11s", animationDelay: "-4s" }} />
      <ellipse className="qm-a qm-a-fog" cx="290" cy="482" rx="40" ry="9" opacity="0.45" style={{ animationDuration: "8s", animationDelay: "-2s" }} />
    </g>
    {/* the rocky pass under Native scan */}
    <g transform="translate(-24 -22)">
      <polygon points="498,332 520,300 600,296 740,298 752,330 740,352 700,356 660,346 600,352 540,344 508,350" fill="url(#w-bg-rock)" stroke="#7d705e" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M520 318 H640 M534 334 H600 M668 316 H738" stroke="#7d705e" strokeWidth="1.6" opacity="0.7" fill="none" />
      <path d="M560 298 L574 324 M610 298 L598 326" stroke="#e8dcc8" strokeWidth="2" opacity="0.6" fill="none" />
    </g>
    {/* the river valley under API boost */}
    <path d="M432 392 C470 374 500 354 540 352 S700 354 735 348 S758 292 770 264 V536 H432 Z" fill="url(#w-bg-grass2)" />
    <rect x="680" y="278" width="20" height="76" fill="#bfe9f5" opacity="0.8" />
    <g stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.6">
      <line className="qm-a qm-a-fall" x1="685" y1="282" x2="685" y2="338" /><line className="qm-a qm-a-fall" x1="690" y1="282" x2="690" y2="338" style={{ animationDelay: "-0.5s" }} /><line className="qm-a qm-a-fall" x1="695" y1="282" x2="695" y2="338" style={{ animationDelay: "-1s" }} />
    </g>
    <path d="M690 352 C676 376 706 396 692 424 S708 494 698 540" fill="none" stroke="#1b86a8" strokeWidth="27" strokeLinecap="round" />
    <path d="M690 352 C676 376 706 396 692 424 S708 494 698 540" fill="none" stroke="#3bb4d6" strokeWidth="20" strokeLinecap="round" />
    <ellipse cx="690" cy="352" rx="24" ry="8" fill="#3bb4d6" stroke="#1b86a8" strokeWidth="3" />
    <g fill="#fff"><ellipse className="qm-a qm-a-glint" cx="686" cy="384" rx="7" ry="1.6" /><ellipse className="qm-a qm-a-glint" cx="700" cy="440" rx="7" ry="1.6" style={{ animationDelay: "-1s" }} /><ellipse className="qm-a qm-a-glint" cx="698" cy="498" rx="7" ry="1.6" style={{ animationDelay: "-2s" }} /></g>
    {/* the ravine under the rope bridge */}
    <path d="M1014 190 L1026 216 L1040 226 L1054 214 L1066 188 Z" fill="#2a2018" /><path d="M1014 190 L1026 216 M1066 188 L1054 214" stroke="#7d705e" strokeWidth="2" fill="none" />
    {/* the camp: a tent and a small fire */}
    <g transform="translate(42 480)"><polygon points="-30,0 0,-36 30,0" fill="#e8912d" stroke={INK} strokeWidth="2" strokeLinejoin="round" /><polygon points="0,-36 30,0 9,0" fill="#b9651a" opacity="0.6" /><polygon points="-9,0 0,-18 9,0" fill="#3a2a1a" /></g>
    <g transform="translate(168 486)"><rect x="-10" y="-4" width="20" height="5" rx="1" fill="#8a5a33" stroke={INK} strokeWidth="1.2" /><g className="qm-a qm-a-fire"><path d="M-5 -4 C-8 -14 0 -16 0 -26 C6 -18 8 -12 5 -4 Z" fill="#e8912d" /><path d="M-2 -4 C-3 -10 0 -12 0 -17 C3 -13 3 -9 2 -4 Z" fill="#ffe27a" /></g></g>
    {/* the summit: a flag in the snow and a small chest */}
    <path d="M1165 48 V4" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
    <g transform="translate(1165 4)"><path className="qm-a qm-a-flag" d="M0 0 h20 l-5 6 l5 6 h-20 z" fill="#c93a25" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" /></g>
    <g transform="translate(1190 108)"><rect x="-10" y="-8" width="20" height="14" rx="2" fill="#b9651a" stroke={INK} strokeWidth="1.6" /><rect x="-10" y="-8" width="20" height="6" rx="2" fill="#e8912d" stroke={INK} strokeWidth="1.6" /><rect x="-2.5" y="-5" width="5" height="6" fill="#ffe27a" stroke={INK} strokeWidth="1" /></g>
    {bird(86, 1, 36, -4)}{bird(118, 0.8, 44, -20)}{bird(70, 0.9, 52, -33)}
  </g>;
}

/** Things that stand on the road, drawn over it: a post under the fork sign, the bridge over the river, boulders on the pass and the rope bridge. */
function WideProps() {
  const [bx, by] = [690, WIDE.pts.boost[1]];
  return <g>
    <rect x={WIDE.pts.fork[0] - 3} y={WIDE.pts.fork[1] + 52} width="6" height="22" fill="#8a5a33" stroke={INK} strokeWidth="1.4" />
    {/* wooden bridge over the river on the API boost road */}
    <g>
      <rect x={bx - 27} y={by - 9} width="54" height="18" rx="2" fill="#c98b4b" stroke={INK} strokeWidth="1.8" />
      <path d={Array.from({ length: 7 }, (_, i) => `M${bx - 21 + i * 7} ${by - 9} v18`).join(" ")} stroke="#8a5a33" strokeWidth="1.4" />
      <path d={`M${bx - 27} ${by - 14} H${bx + 27} M${bx - 27} ${by + 14} H${bx + 27}`} stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <path d={`M${bx - 25} ${by - 14} v6 M${bx + 25} ${by - 14} v6 M${bx - 25} ${by + 14} v-6 M${bx + 25} ${by + 14} v-6`} stroke={INK} strokeWidth="2.2" />
    </g>
    {/* boulders at the edge of the rocky pass */}
    <g stroke={INK} strokeWidth="1.8"><ellipse cx="690" cy="232" rx="16" ry="12" fill="#9a9086" /><ellipse cx="716" cy="236" rx="9" ry="7" fill="#aaa095" /></g>
    <path d="M682 228 q6 -6 12 -2" stroke="#d8d0c4" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* rope bridge over the ravine */}
    <g>
      <path d="M1012 146 Q1040 162 1068 146" fill="none" stroke={INK} strokeWidth="2" /><path d="M1012 156 Q1040 172 1068 156" fill="none" stroke="#8a5a33" strokeWidth="2.4" />
      {Array.from({ length: 8 }, (_, i) => { const x = 1016 + i * 6.8; const y = 160 + Math.sin(((x - 1012) / 56) * Math.PI) * 8; return <rect key={i} x={x - 2.5} y={y - 5} width="5" height="10" fill="#c98b4b" stroke={INK} strokeWidth="1" />; })}
      <rect x="1008" y="138" width="6" height="26" fill="#8a5a33" stroke={INK} strokeWidth="1.4" /><rect x="1066" y="138" width="6" height="26" fill="#8a5a33" stroke={INK} strokeWidth="1.4" />
    </g>
  </g>;
}

/** The rail's scenery: hills under each marker and a few props beside the road. The road runs down the list here, so the summit with its flag sits at the end. */
function RailScenery({ layout }: { layout: Layout }) {
  const { pts } = layout;
  const pine = (x: number, y: number, s: number) => <use key={`${x}-${y}`} href="#r-bg-pine" transform={`translate(${x} ${y}) scale(${s})`} />;
  const side = (id: keyof Layout["pts"]) => (pts[id][0] > 40 ? 12 : 68);
  return <g>
    {NODE_ORDER.map((id) => <ellipse key={id} cx={pts[id][0]} cy={pts[id][1] + 18} rx="32" ry="9" fill="#8fd062" opacity="0.55" />)}
    {pine(side("fork"), pts.fork[1] + 36, 0.5)}{pine(side("fork") + (side("fork") > 40 ? -9 : 9), pts.fork[1] + 12, 0.42)}
    {pine(side("native"), pts.native[1] + 24, 0.46)}{pine(side("result"), pts.result[1] - 30, 0.46)}
    <g transform={`translate(${side("camp")} ${pts.camp[1] + 22})`}><polygon points="-12,0 0,-14 12,0" fill="#e8912d" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" /><polygon points="-4,0 0,-7 4,0" fill="#3a2a1a" /></g>
    <g stroke={INK} strokeWidth="1.4"><ellipse cx={side("native") - 2} cy={pts.native[1] - 22} rx="8" ry="6" fill="#9a9086" /></g>
    <g transform={`translate(${pts.result[0]} ${pts.result[1] + 18})`}>
      <polygon points="-34,0 0,-46 34,0" fill="#a7bfd2" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" /><polygon points="0,-46 12,-28 6,-31 0,-25 -6,-31 -12,-28" fill="#fff" />
      <path d="M0 -46 V-62" stroke={INK} strokeWidth="1.6" /><path className="qm-a qm-a-flag" d="M0 -62 h11 l-3 4 l3 4 h-11 z" fill="#c93a25" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
    </g>
  </g>;
}

/** A strip of mountains, a sun and a cloud along the top of the rail map (the wide map paints its own sky). */
export function Skyline() {
  return <svg className="qm-skyline" viewBox="0 0 600 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <defs><linearGradient id="sk-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fd0ee" /><stop offset="1" stopColor="#d9f0e6" /></linearGradient></defs>
    <rect width="600" height="120" fill="url(#sk-sky)" />
    <circle cx="520" cy="26" r="13" fill="#ffe27a" />
    <g className="qm-a qm-a-cloud" style={{ animationDuration: "50s" }}><ellipse cx="90" cy="30" rx="30" ry="8" fill="#fff" opacity="0.85" /><ellipse cx="104" cy="23" rx="16" ry="9" fill="#fff" opacity="0.85" /></g>
    <Mountains peaks={[[40, 54, 80], [170, 36, 90], [300, 58, 78], [430, 30, 100], [560, 52, 80]]} base={120} fill="#b4cde0" shade="#6f93ad" />
    <path d="M0 112 C100 92 200 108 300 98 S500 92 600 106 V120 H0 Z" fill="#a9de80" />
  </svg>;
}

/** The electric line from API boost to the agents: a blue halo, a dark edge so it shows on grass, and a bright yellow core. */
function Bolt({ d, wide }: { d: string; wide: boolean }) {
  return <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} stroke="#3bb4d6" strokeWidth={wide ? 11 : 8} opacity="0.45" />
    <path d={d} stroke={INK} strokeWidth={wide ? 6 : 4.6} opacity="0.7" />
    <path d={d} stroke="#ffe94a" strokeWidth={wide ? 3.6 : 2.8} />
  </g>;
}
const SPARK = "M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z";
/** A powered agent: a warm glow, a bright ring and two small sparks. `live` makes the sparks flicker (SMIL, so the page's one pause call covers them). */
function Lit({ x, y, r, live, i = 0 }: { x: number; y: number; r: number; live: boolean; i?: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <circle r={r + 8} fill="none" stroke="#ffe27a" strokeWidth="9" opacity="0.4" />
    <circle r={r + 3} fill="none" stroke="#fff6a0" strokeWidth="3" /><circle r={r + 3} fill="none" stroke="#e8912d" strokeWidth="1" />
    {[[r * 0.8, -r * 0.95], [-r * 0.9, -r * 0.7]].map(([dx, dy], k) => <path key={k} transform={`translate(${dx} ${dy})`} d={SPARK} fill="#fff6a0" stroke="#e8912d" strokeWidth="0.8" opacity={live ? 0 : 1}>
      {live && <animate attributeName="opacity" dur="0.9s" begin={`${-(i * 0.23 + k * 0.45)}s`} repeatCount="indefinite" values="0;1;0.2;1;0" />}
    </path>)}
  </g>;
}

/** The still map. With `still` set (reduced motion, or before the page knows) every marker also carries the note, so the position at each step shows without motion. */
export function TrailArt({ which, layout, still }: { which: Which; layout: Layout; still: boolean }) {
  const p = which === "wide" ? "w-bg" : "r-bg";
  const style: CSSProperties | undefined = which === "rail" ? { width: layout.w, height: layout.h } : undefined;
  const { node, glyph } = SIZE[which];
  const power = powerLine(layout, which === "wide");
  return <svg className={`qm-svg qm-svg-${which}`} viewBox={`0 0 ${layout.w} ${layout.h}`} style={style} aria-hidden="true" focusable="false">
    <Defs p={p} />
    {which === "wide" ? <WideScenery /> : <RailScenery layout={layout} />}
    <Trail layout={layout} which={which} />
    {which === "wide" && <WideProps />}
    {NODE_ORDER.map((id) => <Node key={id} id={id} x={layout.pts[id][0]} y={layout.pts[id][1]} which={which} />)}
    {/* the cable from API boost to the agents: dull and unplugged while nothing runs on a key, bright with lit agents in the still map */}
    {still ? <Bolt d={power.d} wide={which === "wide"} /> : <path d={power.d} fill="none" stroke="#6b7c8a" strokeWidth="2" strokeDasharray="3 5" strokeLinecap="round" opacity="0.5" />}
    {still && READER_IDS.map((id, i) => <Lit key={id} x={layout.pts[id][0]} y={layout.pts[id][1]} r={SIZE[which].sprite / 2 + 2} live={false} i={i} />)}
    {still && NODE_ORDER.map((id) => {
      const [x, y] = layout.pts[id];
      const ref = id === "camp" ? "raw" : id === "result" ? "checked" : "masked";
      const at = isReader(id) ? [x, y + SIZE[which].sprite / 2 + 16] : [x + node * 0.85, y + node * 0.75];
      return <use key={id} href={`#${p}-${ref}`} transform={`translate(${at[0]} ${at[1]}) scale(${isReader(id) ? glyph * 0.7 : glyph})`} />;
    })}
  </svg>;
}

// SMIL helpers. Every time is a fraction of the element's own duration.
const list = (xs: number[]) => xs.map(f).join(";");
const SPLINE = ".42 0 .58 1";

function HopShape({ hop, layout, which }: { hop: Hop; layout: Layout; which: Which }) {
  const dur = hop.road ? CYCLE * 2 : CYCLE;
  const off = hop.road === "boost" ? CYCLE : 0;
  const t = (s: number) => (s + off) / dur;
  const fade = 0.2;
  const { sprite, glyph } = SIZE[which];
  const carrier = hop.walker;
  return <g opacity="0">
    <animate attributeName="opacity" dur={`${dur}s`} repeatCount="indefinite" keyTimes={list([0, t(hop.show), t(hop.show + fade), t(hop.hide - fade), t(hop.hide), 1])} values="0;0;1;1;0;0" />
    <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={layout.segs[hop.seg]} calcMode="spline" keyPoints={hop.stay ? "0;0;0;0" : "0;0;1;1"} keyTimes={list([0, t(hop.go), t(hop.end), 1])} keySplines={`${SPLINE};${SPLINE};${SPLINE}`} />
    {carrier && <g>
      <animateTransform attributeName="transform" type="translate" values="0 0;0 -2.5;0 0" dur="0.45s" repeatCount="indefinite" />
      <Sprite stop={carrier} size={sprite} />
    </g>}
    <g transform={`translate(0 ${carrier ? -sprite * 0.62 : 0}) scale(${glyph})`}><use href={`#${which === "wide" ? "w" : "r"}-live-${hop.glyph}`} /></g>
  </g>;
}

function Pulse({ x, y, at, road, r }: { x: number; y: number; at: number; road?: "native" | "boost"; r: number }) {
  const dur = road ? CYCLE * 2 : CYCLE;
  const t0 = at + (road === "boost" ? CYCLE : 0);
  const ks = list([0, t0 / dur, (t0 + 1.6) / dur, 1]);
  return <g transform={`translate(${x} ${y})`}>
    <circle r={r} fill="none" stroke="#dbe86a" strokeWidth="5" opacity="0">
      <animate attributeName="opacity" dur={`${dur}s`} repeatCount="indefinite" keyTimes={ks} values="0;0.95;0;0" />
      <animateTransform attributeName="transform" type="scale" dur={`${dur}s`} repeatCount="indefinite" keyTimes={ks} values="0.8;0.8;1.8;1.8" />
    </circle>
  </g>;
}

const approxLen = (d: string) => {
  const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  let sum = 0;
  for (let i = 2; i + 1 < n.length; i += 2) sum += Math.hypot(n[i] - n[i - 2], n[i + 1] - n[i - 1]);
  return sum;
};

/** Small lime beads that drift along every stretch of road all the time, so the roads always look alive. */
function Beads({ layout, which }: { layout: Layout; which: Which }) {
  const speed = which === "wide" ? 34 : 30;
  return <g>
    {(Object.keys(SEG_ENDS) as SegId[]).flatMap((id) => {
      const len = approxLen(layout.segs[id]);
      if (len < 70) return [];
      const dur = Math.max(4, len / speed);
      const n = Math.max(1, Math.min(2, Math.round(len / 200)));
      return Array.from({ length: n }, (_, i) => <circle key={id + i} r={which === "wide" ? 4 : 3.2} fill="#dbe86a" stroke="#fff" strokeWidth="1.2" opacity="0.9">
        <animateMotion dur={`${f(dur)}s`} begin={`${f(-(dur * i) / n)}s`} repeatCount="indefinite" path={layout.segs[id]} />
      </circle>);
    })}
  </g>;
}

export function TrailLive({ which, layout, svgRef }: { which: Which; layout: Layout; svgRef: RefObject<SVGSVGElement | null> }) {
  const p = which === "wide" ? "w-live" : "r-live";
  const { node } = SIZE[which];
  const wide = which === "wide";
  const style: CSSProperties | undefined = which === "rail" ? { width: layout.w, height: layout.h } : undefined;
  const [mx, my] = layout.pts.camp;
  const [zx, zy] = layout.pts.result;
  const power = powerLine(layout, wide);
  const boltT = list([0, (CYCLE + 8.6) / (CYCLE * 2), (CYCLE + 9.2) / (CYCLE * 2), (CYCLE + 33) / (CYCLE * 2), (CYCLE + 35) / (CYCLE * 2), 1]);
  const litT = list([0, (CYCLE + 12.2) / (CYCLE * 2), (CYCLE + 13.2) / (CYCLE * 2), (CYCLE + 33) / (CYCLE * 2), (CYCLE + 35) / (CYCLE * 2), 1]);
  const scanT = list([0, 0.4 / CYCLE, 0.6 / CYCLE, 1.0 / CYCLE, 1.1 / CYCLE, 1]);
  const spark = (dx: number, dy: number, at: number) => <g key={dx + "" + dy} transform={`translate(${zx + dx} ${zy + dy})`}>
    <path d="M0 -9 L2.5 -2.5 L9 0 L2.5 2.5 L0 9 L-2.5 2.5 L-9 0 L-2.5 -2.5 Z" fill="#ffe27a" stroke="#e8912d" strokeWidth="1" opacity="0">
      <animate attributeName="opacity" dur={`${CYCLE}s`} repeatCount="indefinite" keyTimes={list([0, at / CYCLE, (at + 0.5) / CYCLE, (at + 1.2) / CYCLE, (at + 1.8) / CYCLE, (at + 2.4) / CYCLE, 1])} values="0;0;1;0.3;1;0;0" />
    </path>
  </g>;
  return <svg ref={svgRef} className={`qm-svg qm-live qm-svg-${which}`} viewBox={`0 0 ${layout.w} ${layout.h}`} style={style} aria-hidden="true" focusable="false">
    <Defs p={p} />
    <Beads layout={layout} which={which} />
    {ARRIVALS.map((a) => <Pulse key={a.stop + (a.road ?? "")} x={layout.pts[a.stop][0]} y={layout.pts[a.stop][1]} at={a.at} road={a.road} r={(READER_IDS as string[]).includes(a.stop) ? SIZE[which].sprite / 2 + 4 : node + 8} />)}
    {/* the privacy scan: a light bar sweeps over the camp while the note is raw, just before it is masked */}
    <g transform={`translate(${mx} ${my})`}>
      <rect x={-node - 10} y="-2" width={(node + 10) * 2} height="4" rx="2" fill="#dbe86a" opacity="0">
        <animate attributeName="opacity" dur={`${CYCLE}s`} repeatCount="indefinite" keyTimes={scanT} values="0;0;0.95;0.95;0;0" />
        <animateTransform attributeName="transform" type="translate" dur={`${CYCLE}s`} repeatCount="indefinite" keyTimes={scanT} values={`0 ${-node};0 ${-node};0 ${node};0 ${node};0 ${node};0 ${node}`} />
      </rect>
    </g>
    {/* API boost powers the agents: the current runs along the line once the note is on the API boost road, and the four agents light up until the run ends. Native scan leaves them plain. */}
    <g opacity="0">
      <animate attributeName="opacity" dur={`${CYCLE * 2}s`} repeatCount="indefinite" keyTimes={boltT} values="0;0;1;1;0;0" />
      <g><animate attributeName="opacity" dur="0.5s" repeatCount="indefinite" values="1;0.6;1;0.8;1" /><Bolt d={power.d} wide={wide} /></g>
      {[0, 1].map((k) => <circle key={k} r={wide ? 5 : 4} fill="#fff" stroke="#e8912d" strokeWidth="1.4">
        <animateMotion dur="1.1s" begin={`${-k * 0.55}s`} repeatCount="indefinite" path={power.d} />
      </circle>)}
    </g>
    {READER_IDS.map((id, i) => <g key={id} opacity="0">
      <animate attributeName="opacity" dur={`${CYCLE * 2}s`} repeatCount="indefinite" keyTimes={litT} values="0;0;1;1;0;0" />
      <Lit x={layout.pts[id][0]} y={layout.pts[id][1]} r={SIZE[which].sprite / 2 + 2} live i={i} />
    </g>)}
    {HOPS.map((hop) => <HopShape key={hop.id} hop={hop} layout={layout} which={which} />)}
    {(wide ? [[40, -30, 30.4], [88, -62, 30.9], [112, -8, 31.4]] : [[-16, -30, 30.4], [18, -34, 30.9]]).map(([dx, dy, at]) => spark(dx, dy, at))}
  </svg>;
}

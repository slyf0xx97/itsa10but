// Geometry and timing for the "How it works" adventure map (components/trail-art.tsx draws it, components/how-it-works.tsx wraps it).
// Two layouts share one set of stops: a wide map (percent-positioned, scales with the board) and a narrow rail (fixed rem sizes, one stop per row).

/** A station is one card on the map. Upload Résumé is the first. The fork holds two (API boost on the high road, Native scan below it), and the four résumé agents share one. */
export type StopId = "camp" | "native" | "boost" | "readers" | "result";
export type ReaderId = "scout" | "finder" | "recruiter" | "planner";
/** A place on the road with a round marker. The agents stand one after another on a stretch of the road. */
export type NodeId = Exclude<StopId, "readers"> | ReaderId;
export type Pt = readonly [number, number];
export type SegId = "s0" | "nA" | "bA" | "nB" | "bB" | "s2" | "r1" | "r2" | "r3" | "s3";
export type End = NodeId | "fork" | "join";

export const READER_IDS: ReaderId[] = ["scout", "finder", "recruiter", "planner"];
/** Cards in run order, which is also the keyboard order. */
export const STOP_ORDER: StopId[] = ["camp", "boost", "native", "readers", "result"];
/** Markers on the road, in run order. */
export const NODE_ORDER: NodeId[] = ["camp", "boost", "native", "scout", "finder", "recruiter", "planner", "result"];

/** Which two points each segment of the road joins. */
export const SEG_ENDS: Record<SegId, [End, End]> = {
  s0: ["camp", "fork"],
  nA: ["fork", "native"], bA: ["fork", "boost"], nB: ["native", "join"], bB: ["boost", "join"],
  s2: ["join", "scout"], r1: ["scout", "finder"], r2: ["finder", "recruiter"], r3: ["recruiter", "planner"], s3: ["planner", "result"],
};

export type Layout = { w: number; h: number; pts: Record<End, Pt>; segs: Record<SegId, string> };

/** Radius of a road corner, in units. Small on purpose: the roads read as elbow connectors, not curves. */
export const CORNER = 6;

/** A road through axis-aligned points (each step is horizontal or vertical). Every turn gets a small rounded elbow. */
export function elbow(points: Pt[], r = CORNER): string {
  const [first, ...rest] = points;
  let d = `M${first[0]} ${first[1]}`;
  for (let i = 0; i < rest.length; i++) {
    const [x, y] = rest[i];
    const next = rest[i + 1];
    if (!next) { d += ` L${x} ${y}`; break; }
    const [px, py] = points[i];
    const k = Math.min(r, Math.hypot(x - px, y - py) / 2, Math.hypot(next[0] - x, next[1] - y) / 2);
    d += ` L${x - Math.sign(x - px) * k} ${y - Math.sign(y - py) * k} Q${x} ${y} ${x + Math.sign(next[0] - x) * k} ${y + Math.sign(next[1] - y) * k}`;
  }
  return d;
}

/** Station cards on the wide map, in board units (the board is 1200 wide, 536 tall). `reach` is the gap from the marker to the card edge, `h` the room kept for the text.
 *  The road only climbs, so the free ground is above and to the left of it and below and to the right of it: early cards sit above the road, the agents below it.
 *  The two roads of the fork are the main event, so their cards are the widest on the map and their type is a step larger (arch.css).
 *  `at` pins a card to a fixed top left corner instead (the Results card hangs in the sky beside the summit). */
export const CARD: Record<StopId, { w: number; h: number; reach: number; at?: Pt }> = {
  camp: { w: 196, h: 170, reach: 38 },
  native: { w: 252, h: 124, reach: 38 },
  boost: { w: 252, h: 124, reach: 38 },
  readers: { w: 226, h: 252, reach: 44 },
  result: { w: 170, h: 108, reach: 38, at: [880, 16] },
};
export const SIDE: Record<StopId, "above" | "below"> = { camp: "above", native: "below", boost: "above", readers: "below", result: "below" };
export const ROAD_R = 13;
/** Smallest gap the map keeps between a card and anything else (another card, a road, a sign), in units. */
export const GAP = 12;

/** The "Built with" cave carved into the rock at the bottom right, outside the road. A box in board units; it runs to the bottom edge of the board. */
export const CAVE = { l: 1026, t: 286, w: 170, h: 250 };

/** The wooden "Pick one" sign under the fork, the section title sign in the top left corner and the small "API boost powers your agents" label above the agents (dy is from the agents road). */
export const FORK_SIGN = { w: 74, h: 26, dy: 28 };
export const TITLE_SIGN = { x: 12, y: 12, w: 178, h: 46 };
export const POWER_LABEL = { w: 196, h: 22, dy: -67 };

/** Wide board, 1200 by 536 units. The road only climbs: from the camp at the bottom left it steps up to the fork, then API boost climbs to the high pass
 *  while Native scan goes along the river valley and climbs to meet it (116 units apart, so the two roads read as two choices), the agents walk the next ledge,
 *  the road crosses the rope bridge and ends on the summit at the top right. The fork sits close to the camp and the two cards close to the fork, so little bare road is left. */
const WIDE_PTS: Record<End, Pt> = {
  camp: [140, 454], fork: [330, 366], boost: [520, 250], native: [520, 366], join: [750, 250],
  scout: [812, 224], finder: [864, 224], recruiter: [916, 224], planner: [968, 224], result: [1165, 70],
};

export const WIDE: Layout = {
  w: 1200, h: 536,
  pts: WIDE_PTS,
  segs: ((p) => ({
    s0: elbow([p.camp, [268, p.camp[1]], [268, p.fork[1]], p.fork]),
    nA: elbow([p.fork, p.native]),
    bA: elbow([p.fork, [350, p.fork[1]], [350, p.boost[1]], p.boost]),
    nB: elbow([p.native, [p.join[0], p.native[1]], p.join]),
    bB: elbow([p.boost, p.join]),
    s2: elbow([p.join, [p.join[0], p.scout[1]], p.scout]),
    r1: elbow([p.scout, p.finder]),
    r2: elbow([p.finder, p.recruiter]),
    r3: elbow([p.recruiter, p.planner]),
    s3: elbow([p.planner, [1016, p.planner[1]], [1016, 154], [p.result[0], 154], p.result]),
  }))(WIDE_PTS),
};

/** Where a card hangs: the marker, or for the agents the middle of their stretch of road. A pinned card hangs from the middle of its top edge, `reach` above it. */
export function cardAnchor(layout: Layout, id: StopId): Pt {
  const { at, w, reach } = CARD[id];
  if (at) return [at[0] + w / 2, at[1] - reach];
  if (id === "readers") return [(layout.pts.scout[0] + layout.pts.planner[0]) / 2, layout.pts.scout[1]];
  return layout.pts[id];
}

/** A card as a box in board units. */
export function cardBox(id: StopId, layout: Layout = WIDE) {
  const [x, y] = cardAnchor(layout, id);
  const { w, h, reach } = CARD[id];
  const t = SIDE[id] === "above" ? y - reach - h : y + reach;
  return { l: x - w / 2, r: x + w / 2, t, b: t + h };
}

/** The electric line that runs from the API boost marker to the agents: a zigzag from `a` to `b` with the given swing. */
export function bolt(a: Pt, b: Pt, amp: number, n = 8): string {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const len = Math.hypot(dx, dy) || 1;
  const [nx, ny] = [-dy / len, dx / len];
  let d = `M${a[0]} ${a[1]}`;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const k = (i % 2 ? 1 : -1) * amp;
    d += ` L${+(a[0] + dx * t + nx * k).toFixed(1)} ${+(a[1] + dy * t + ny * k).toFixed(1)}`;
  }
  return d + ` L${b[0]} ${b[1]}`;
}

/** Where the line starts (beside the API boost marker) and ends (at the first agent), and its path, for the wide map or the rail. */
export function powerLine(layout: Layout, wide: boolean) {
  const [bx, by] = layout.pts.boost;
  const [sx, sy] = layout.pts.scout;
  const from: Pt = wide ? [bx + 22, by - 22] : [bx + 14, by + 16];
  const to: Pt = wide ? [sx - 28, sy + 6] : [sx + 16, sy - 16];
  return { from, to, d: bolt(from, to, wide ? 7 : 4) };
}

/** Narrow rail: one unit is one pixel. Rows are as tall as their cards, so the page measures them and calls railFrom; RAIL is the guess used before it has. */
export const RAIL_W = 80;
const RAIL_X: Record<End, number> = {
  camp: 22, fork: 40, native: 20, boost: 60, join: 40,
  scout: 40, finder: 40, recruiter: 40, planner: 40, result: 58,
};
export const RAIL_ROWS: { id: End; px: number }[] = [
  { id: "camp", px: 150 }, { id: "fork", px: 44 }, { id: "boost", px: 140 }, { id: "native", px: 124 }, { id: "join", px: 20 },
  { id: "scout", px: 44 }, { id: "finder", px: 44 }, { id: "recruiter", px: 44 }, { id: "planner", px: 64 }, { id: "result", px: 112 },
];

/** Builds the rail from the y of every point (and the total height). Each stretch is down, across at half height, then down again. */
export function railFrom(ys: Record<End, number>, h: number): Layout {
  const pts = {} as Record<End, Pt>;
  for (const id of Object.keys(RAIL_X) as End[]) pts[id] = [RAIL_X[id], ys[id]];
  const segs = {} as Record<SegId, string>;
  for (const id of Object.keys(SEG_ENDS) as SegId[]) {
    const [a, b] = SEG_ENDS[id];
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const mid = Math.round((ay + by) / 2);
    segs[id] = elbow(ax === bx ? [pts[a], pts[b]] : [pts[a], [ax, mid], [bx, mid], pts[b]]);
  }
  return { w: RAIL_W, h, pts, segs };
}

function guessRail(): Layout {
  let top = 0;
  const ys = {} as Record<End, number>;
  for (const row of RAIL_ROWS) {
    ys[row.id] = top + (row.id === "join" ? 8 : row.id === "fork" ? 22 : row.px > 60 ? 24 : row.px / 2);
    top += row.px;
  }
  return railFrom(ys, top);
}
export const RAIL: Layout = guessRail();

/** One stretch of the journey, with times in seconds inside the cycle. The note is on screen from `show` to `hide`, moves from `go` to `end`. */
export type Hop = { id: string; seg: SegId; show: number; go: number; end: number; hide: number; glyph: "raw" | "masked" | "checked"; walker?: ReaderId; road?: "native" | "boost"; stay?: boolean };

/** Length of one run. Road hops sit in a doubled timeline so Native scan and API boost take turns. */
export const CYCLE = 36;

export const HOPS: Hop[] = [
  // The note waits at the camp, raw, while the privacy scan sweeps it, then swaps to the masked note and sets off.
  { id: "h0", seg: "s0", show: 0.2, go: 0.4, end: 1.0, hide: 1.2, glyph: "raw", stay: true },
  { id: "h1", seg: "s0", show: 1.0, go: 1.6, end: 6.4, hide: 6.8, glyph: "masked" },
  { id: "h2n", seg: "nA", show: 6.6, go: 6.8, end: 8.8, hide: 9.4, glyph: "masked", road: "native" },
  { id: "h2b", seg: "bA", show: 6.6, go: 6.8, end: 8.8, hide: 9.4, glyph: "masked", road: "boost" },
  { id: "h3n", seg: "nB", show: 9.2, go: 9.8, end: 11.6, hide: 11.8, glyph: "masked", road: "native" },
  { id: "h3b", seg: "bB", show: 9.2, go: 9.8, end: 11.6, hide: 11.8, glyph: "masked", road: "boost" },
  { id: "h4", seg: "s2", show: 11.6, go: 11.6, end: 13.0, hide: 13.6, glyph: "masked" },
  { id: "h5", seg: "r1", show: 13.4, go: 13.8, end: 16.0, hide: 16.6, glyph: "masked", walker: "scout" },
  { id: "h6", seg: "r2", show: 16.4, go: 16.8, end: 19.0, hide: 19.6, glyph: "masked", walker: "finder" },
  { id: "h7", seg: "r3", show: 19.4, go: 19.8, end: 22.0, hide: 22.6, glyph: "masked", walker: "recruiter" },
  { id: "h8", seg: "s3", show: 22.4, go: 22.8, end: 30.0, hide: 35.4, glyph: "checked", walker: "planner" },
];

/** Which road the visitor has lowered the bridge to. "turns" is the default: the note takes API boost, then Native scan, run after run. */
export type Route = "turns" | "boost" | "native";
export const ROUTES: Route[] = ["turns", "boost", "native"];

/** The hops that run for a route. The shared stretches always run, and a chosen road runs alone in one 36 second cycle instead of taking turns in a doubled one. */
export const hopsFor = (route: Route): Hop[] => (route === "turns" ? HOPS : HOPS.filter((hop) => !hop.road || hop.road === route));

/** Where the two bridge gates stand on the wide map, one on each road just after the fork. */
export const GATES: Record<"boost" | "native", Pt> = { boost: [350, 316], native: [430, 366] };

/** The gate of a road: the fixed spot on the wide map, or halfway between the fork and the road's marker on the rail. */
export function gatePoint(layout: Layout, wide: boolean, road: "boost" | "native"): Pt {
  if (wide) return GATES[road];
  const [fx, fy] = layout.pts.fork, [nx, ny] = layout.pts[road];
  return [(fx + nx) / 2, (fy + ny) / 2];
}

/** The play, reset and bridge controls under the title sign, as a box in board units on the wide map. */
export const CONTROLS = { x: 12, y: 70, w: 340, h: 92 };

/** When the note reaches each marker, for the arrival pulse. Native scan and API boost arrive in their own run. */
export const ARRIVALS: { stop: NodeId; at: number; road?: "native" | "boost" }[] = [
  { stop: "camp", at: 0.2 },
  { stop: "native", at: 8.8, road: "native" }, { stop: "boost", at: 8.8, road: "boost" },
  { stop: "scout", at: 13.0 }, { stop: "finder", at: 16.0 }, { stop: "recruiter", at: 19.0 }, { stop: "planner", at: 22.0 },
  { stop: "result", at: 30.0 },
];

/** The arrival pulses that run for a route. */
export const arrivalsFor = (route: Route) => (route === "turns" ? ARRIVALS : ARRIVALS.filter((arrival) => !arrival.road || arrival.road === route));

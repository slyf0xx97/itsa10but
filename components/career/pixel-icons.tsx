// Hand-drawn 16x16 pixel icons, one path each. Each path is a union of same-winding rectangles,
// so the default fill rule works and holes are real gaps.
type Rect = [x: number, y: number, w: number, h: number];

const path = (rects: Rect[]) => rects.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h${-w}z`).join("");

const shapes = {
  dashboard: [[1, 1, 14, 1], [1, 14, 14, 1], [2, 8, 3, 6], [6, 4, 3, 10], [10, 10, 3, 4]],
  communication: [[1, 2, 14, 1], [1, 10, 14, 1], [1, 3, 1, 7], [14, 3, 1, 7], [4, 11, 2, 1], [3, 12, 2, 1], [4, 6, 2, 1], [7, 6, 2, 1], [10, 6, 2, 1]],
  api: [[4, 2, 3, 1], [4, 3, 2, 4], [2, 7, 2, 2], [4, 9, 2, 4], [4, 13, 3, 1], [9, 2, 3, 1], [10, 3, 2, 4], [12, 7, 2, 2], [10, 9, 2, 4], [9, 13, 3, 1]],
  network: [[6, 1, 4, 3], [1, 11, 4, 4], [11, 11, 4, 4], [7, 4, 2, 4], [3, 8, 10, 1], [3, 9, 1, 2], [12, 9, 1, 2]],
  siem: [[1, 2, 14, 1], [1, 11, 14, 1], [1, 3, 1, 8], [14, 3, 1, 8], [7, 12, 2, 2], [5, 14, 6, 1], [3, 8, 3, 1], [6, 4, 1, 5], [7, 8, 2, 1], [9, 6, 1, 3], [10, 6, 3, 1]],
  incident: [[7, 2, 2, 1], [6, 3, 4, 2], [5, 5, 2, 2], [9, 5, 2, 2], [4, 7, 3, 2], [9, 7, 3, 2], [3, 9, 4, 1], [9, 9, 4, 1], [3, 10, 10, 1], [2, 11, 5, 2], [9, 11, 5, 2], [1, 13, 14, 1]],
  report: [[3, 1, 6, 1], [9, 1, 1, 3], [9, 3, 4, 1], [3, 1, 1, 14], [3, 14, 10, 1], [12, 3, 1, 12], [5, 6, 6, 1], [5, 8, 6, 1], [5, 10, 4, 1]],
  data: [2, 6, 10].flatMap((y): Rect[] => [[4, y, 8, 1], [3, y + 1, 10, 1], [4, y + 2, 8, 1]]),
  ml: [[1, 2, 3, 3], [1, 11, 3, 3], [6, 6, 4, 4], [12, 2, 3, 3], [12, 11, 3, 3], [4, 5, 1, 1], [5, 6, 1, 1], [4, 10, 1, 1], [5, 9, 1, 1], [10, 6, 1, 1], [11, 5, 1, 1], [10, 9, 1, 1], [11, 10, 1, 1]],
  testing: [[6, 1, 4, 2], [6, 3, 4, 2], [5, 5, 6, 2], [4, 7, 8, 1], [3, 9, 10, 2], [2, 11, 12, 3]],
  cloud: [[6, 3, 4, 1], [5, 4, 6, 1], [5, 5, 8, 1], [2, 6, 12, 1], [1, 7, 14, 2], [2, 9, 12, 1], [3, 10, 10, 1]],
  fallback: [[7, 1, 2, 2], [6, 3, 4, 1], [1, 4, 14, 1], [3, 5, 10, 1], [4, 6, 8, 1], [5, 7, 6, 2], [4, 9, 8, 1], [3, 10, 10, 1], [3, 11, 3, 1], [10, 11, 3, 1], [2, 12, 2, 1], [12, 12, 2, 1]],
  signals: [[1, 11, 2, 3], [5, 8, 2, 6], [9, 5, 2, 9], [13, 2, 2, 12]],
  compass: [[5, 1, 6, 1], [3, 2, 2, 1], [11, 2, 2, 1], [2, 3, 1, 2], [13, 3, 1, 2], [1, 5, 1, 6], [14, 5, 1, 6], [2, 11, 1, 2], [13, 11, 1, 2], [3, 13, 2, 1], [11, 13, 2, 1], [5, 14, 6, 1], [5, 10, 2, 1], [6, 9, 2, 1], [7, 8, 2, 1], [8, 7, 2, 1], [9, 6, 2, 1], [10, 5, 1, 1]],
  book: [[1, 2, 6, 1], [1, 3, 1, 10], [1, 13, 6, 1], [7, 2, 2, 12], [9, 2, 6, 1], [14, 3, 1, 10], [9, 13, 6, 1], [3, 5, 3, 1], [3, 7, 3, 1], [10, 5, 3, 1], [10, 7, 3, 1]],
  scroll: [[2, 2, 12, 2], [4, 4, 1, 8], [11, 4, 1, 8], [6, 6, 4, 1], [6, 8, 4, 1], [2, 12, 12, 2]],
  search: [[4, 1, 5, 1], [3, 2, 1, 1], [9, 2, 1, 1], [2, 3, 1, 5], [10, 3, 1, 5], [3, 8, 1, 1], [9, 8, 1, 1], [4, 9, 5, 1], [10, 10, 2, 2], [12, 12, 2, 2]],
  plug: [[5, 1, 2, 4], [9, 1, 2, 4], [4, 5, 8, 4], [6, 9, 4, 2], [7, 11, 2, 4]],
  // Agent-role icons for the "See full findings" buttons: binoculars (Role Scout), magnifier over a document (Experience Finder), clipboard with a tick (Recruiter), checklist (Action Planner).
  binoculars: [[3, 2, 3, 3], [10, 2, 3, 3], [2, 5, 5, 4], [9, 5, 5, 4], [7, 6, 2, 3], [2, 9, 1, 4], [6, 9, 1, 4], [9, 9, 1, 4], [13, 9, 1, 4], [2, 13, 5, 1], [9, 13, 5, 1]],
  docsearch: [[1, 1, 1, 14], [1, 1, 7, 1], [7, 2, 1, 3], [1, 14, 6, 1], [3, 4, 3, 1], [3, 6, 3, 1], [8, 7, 4, 1], [7, 8, 1, 4], [12, 8, 1, 4], [8, 12, 4, 1], [12, 13, 2, 2]],
  clipboard: [[5, 1, 6, 3], [2, 3, 3, 1], [11, 3, 3, 1], [2, 4, 1, 11], [13, 4, 1, 11], [2, 14, 12, 1], [4, 9, 1, 2], [5, 10, 1, 2], [6, 11, 1, 2], [7, 10, 1, 2], [8, 9, 1, 2], [9, 8, 1, 2], [10, 7, 1, 2]],
  checklist: [[1, 1, 4, 4], [1, 6, 4, 4], [1, 11, 4, 1], [1, 14, 4, 1], [1, 11, 1, 4], [4, 11, 1, 4], [7, 2, 8, 2], [7, 7, 8, 2], [7, 12, 6, 2]],
  cross: [[3, 3, 2, 2], [5, 5, 2, 2], [7, 7, 2, 2], [9, 9, 2, 2], [11, 11, 2, 2], [11, 3, 2, 2], [9, 5, 2, 2], [5, 9, 2, 2], [3, 11, 2, 2]],
  gear: [[7, 1, 2, 2],[7, 13, 2, 2], [1, 7, 2, 2], [13, 7, 2, 2], [3, 3, 2, 2], [11, 3, 2, 2], [3, 11, 2, 2], [11, 11, 2, 2], [5, 3, 6, 2], [3, 5, 10, 2], [3, 7, 4, 2], [9, 7, 4, 2], [3, 9, 10, 2], [5, 11, 6, 2]],
} satisfies Record<string, Rect[]>;

export type PixelIconName = keyof typeof shapes;

const paths = Object.fromEntries(Object.entries(shapes).map(([name, rects]) => [name, path(rects)])) as Record<PixelIconName, string>;

export function PixelIcon({ name, size = 16 }: { name: PixelIconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" fill="currentColor" aria-hidden="true" focusable="false">
      <path d={paths[name]} />
    </svg>
  );
}

// A pixel coin in three layers so it can be two-tone: a dark rim, the gold face and a small shine. Colours come from CSS (--coin-rim, --coin-face, --coin-shine).
const disc = (rows: [y: number, x: number, w: number][]): Rect[] => rows.map(([y, x, w]) => [x, y, w, 1]);
const coinRim = path(disc([[1, 5, 6], [2, 3, 10], [3, 2, 12], [4, 1, 14], [5, 1, 14], [6, 1, 14], [7, 1, 14], [8, 1, 14], [9, 1, 14], [10, 1, 14], [11, 1, 14], [12, 2, 12], [13, 3, 10], [14, 5, 6]]));
const coinFace = path(disc([[2, 5, 6], [3, 3, 10], [4, 2, 12], [5, 2, 12], [6, 2, 12], [7, 2, 12], [8, 2, 12], [9, 2, 12], [10, 2, 12], [11, 2, 12], [12, 3, 10], [13, 5, 6]]));
const coinMark = path([[7, 5, 2, 6]]);
const coinShine = path([[4, 4, 3, 1], [4, 5, 1, 2]]);

/** One coin: full (gold) or empty (an outline only). A half coin is a full coin clipped to its left half by CSS, over an empty one. */
export function PixelCoin({ empty = false, size = 18 }: { empty?: boolean; size?: number }) {
  return (
    <svg className={"px-coin" + (empty ? " empty" : "")} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <path className="px-coin-rim" d={coinRim} />
      {!empty && <><path className="px-coin-face" d={coinFace} /><path className="px-coin-mark" d={coinMark} /><path className="px-coin-shine" d={coinShine} /></>}
    </svg>
  );
}

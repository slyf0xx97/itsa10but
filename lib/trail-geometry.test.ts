import assert from "node:assert/strict";
import { test } from "node:test";
import { ARRIVALS, CARD, CAVE, CORNER, CYCLE, FORK_SIGN, GAP, HOPS, NODE_ORDER, POWER_LABEL, RAIL, READER_IDS, ROAD_R, SEG_ENDS, STOP_ORDER, TITLE_SIGN, WIDE, bolt, cardAnchor, cardBox, elbow, powerLine, railFrom, type End, type Layout, type Pt, type SegId } from "./trail-geometry.ts";

const nums = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

/** Walks a road and returns every point it passes, with the command that reached it. */
function steps(d: string) {
  const out: { cmd: string; pts: Pt[] }[] = [];
  for (const m of d.matchAll(/([MLQ])([^MLQ]*)/g)) {
    const n = nums(m[2]);
    out.push({ cmd: m[1], pts: Array.from({ length: n.length / 2 }, (_, i) => [n[2 * i], n[2 * i + 1]] as Pt) });
  }
  return out;
}

test("elbow turns at right angles with a small corner", () => {
  assert.equal(elbow([[0, 0], [100, 0]]), "M0 0 L100 0");
  assert.equal(elbow([[0, 0], [100, 0], [100, 80]]), `M0 0 L${100 - CORNER} 0 Q100 0 100 ${CORNER} L100 80`);
  // a short leg never gets a corner bigger than half of it
  assert.equal(elbow([[0, 0], [4, 0], [4, 50]]), "M0 0 L2 0 Q4 0 4 2 L4 50");
});

const otherRows = { camp: 20, fork: 280, native: 330, boost: 470, join: 600, scout: 640, finder: 690, recruiter: 740, planner: 790, result: 900 };
for (const [name, layout] of [["wide", WIDE], ["rail", RAIL], ["rail, other row heights", railFrom(otherRows, 1010)]] as [string, Layout][]) {
  test(`${name} road: straight lines with right-angle elbows`, () => {
    for (const id of Object.keys(SEG_ENDS) as SegId[]) {
      let at: Pt | undefined;
      for (const { cmd, pts } of steps(layout.segs[id])) {
        assert.ok(cmd === "M" || cmd === "L" || cmd === "Q", `${id} uses ${cmd}`);
        if (cmd === "L") assert.ok(at![0] === pts[0][0] || at![1] === pts[0][1], `${id} line from ${at} to ${pts[0]} is not horizontal or vertical`);
        if (cmd === "Q") {
          // the control point is the corner: it lines up with where the curve starts and ends, and the radius is small
          const [c, e] = pts;
          assert.ok((at![0] === c[0] && c[1] === e[1]) || (at![1] === c[1] && c[0] === e[0]), `${id} elbow at ${c}`);
          assert.ok(Math.abs(c[0] - at![0]) + Math.abs(c[1] - at![1]) <= CORNER && Math.abs(c[0] - e[0]) + Math.abs(c[1] - e[1]) <= CORNER, `${id} corner is small`);
        }
        at = pts[pts.length - 1];
      }
    }
  });

  test(`${name} road: every segment starts and ends on its points`, () => {
    for (const id of Object.keys(SEG_ENDS) as SegId[]) {
      const [a, b] = SEG_ENDS[id] as [End, End];
      const n = nums(layout.segs[id]);
      assert.deepEqual(n.slice(0, 2), [...layout.pts[a]], `${id} start`);
      assert.deepEqual(n.slice(-2), [...layout.pts[b]], `${id} end`);
    }
  });
  test(`${name} road: all points sit inside the board`, () => {
    for (const [point, [x, y]] of Object.entries(layout.pts)) {
      assert.ok(x >= 0 && x <= layout.w && y >= 0 && y <= layout.h, point);
    }
  });
}

test("the stations are the four steps on the page: upload and mask, a fork that holds two cards, the four résumé agents in one card and the action plan", () => {
  assert.deepEqual(STOP_ORDER, ["camp", "native", "boost", "readers", "result"]);
  assert.deepEqual(NODE_ORDER, ["camp", "native", "boost", ...READER_IDS, "result"]);
  assert.ok(!("mask" in CARD) && !("s1" in SEG_ENDS), "Mask and search is part of the first station now");
});

test("the two roads of the fork are the main event: their cards are wider than the others and the roads sit well apart", () => {
  assert.ok(CARD.native.w > CARD.camp.w && CARD.boost.w > CARD.camp.w && CARD.native.w >= 240 && CARD.boost.w >= 240);
  assert.ok(WIDE.pts.boost[1] - WIDE.pts.native[1] >= 110, "the roads keep at least 110 units apart");
});

test("the timeline is ordered and fits one cycle", () => {
  for (const hop of HOPS) {
    assert.ok(hop.show <= hop.go && hop.go <= hop.end && hop.end <= hop.hide && hop.hide <= CYCLE, hop.id);
    assert.ok(!hop.walker || READER_IDS.includes(hop.walker), hop.id);
  }
  for (const arrival of ARRIVALS) assert.ok(arrival.at >= 0 && arrival.at < CYCLE, arrival.stop);
  assert.deepEqual(new Set(ARRIVALS.map((a) => a.stop)), new Set(NODE_ORDER));
});

test("the note's hops cover every stretch of road, so the timeline joins all stops", () => {
  assert.deepEqual(new Set(HOPS.map((hop) => hop.seg)), new Set(Object.keys(SEG_ENDS)));
});

test("the road only climbs: no stretch of road ever drops, and the camp is the lowest marker and the summit the highest", () => {
  for (const id of Object.keys(SEG_ENDS) as SegId[]) {
    const n = nums(WIDE.segs[id]);
    for (let i = 3; i < n.length; i += 2) assert.ok(n[i] <= n[i - 2] + 0.001, `${id} drops at y ${n[i - 2]} to ${n[i]}`);
    // and the end of a stretch is higher than its start, or level for a flat run
    const [a, b] = SEG_ENDS[id];
    assert.ok(WIDE.pts[b][1] <= WIDE.pts[a][1], `${id} ends lower than it starts`);
  }
  const ys = NODE_ORDER.map((id) => WIDE.pts[id][1]);
  assert.equal(Math.max(...ys), WIDE.pts.camp[1]);
  assert.equal(Math.min(...ys), WIDE.pts.result[1]);
  // every station is higher than the one before it, except the two roads of the fork, which both climb from the fork
  assert.ok(WIDE.pts.fork[1] < WIDE.pts.camp[1] && WIDE.pts.native[1] < WIDE.pts.boost[1] && WIDE.pts.boost[1] <= WIDE.pts.fork[1]);
  assert.ok(WIDE.pts.scout[1] < WIDE.pts.native[1] && WIDE.pts.result[1] < WIDE.pts.planner[1]);
  // and it runs from the bottom left to the top right
  assert.ok(WIDE.pts.camp[0] < 150 && WIDE.pts.result[0] > 1100);
});

test("the electric line starts beside the API boost marker, ends at the first reader and stays inside the board", () => {
  for (const [name, layout, wide] of [["wide", WIDE, true], ["rail", RAIL, false]] as const) {
    const { from, to, d } = powerLine(layout, wide);
    const n = nums(d);
    assert.deepEqual(n.slice(0, 2), [...from]);
    assert.deepEqual(n.slice(-2), [...to]);
    assert.ok(Math.hypot(from[0] - layout.pts.boost[0], from[1] - layout.pts.boost[1]) < 40, `${name} starts near API boost`);
    assert.ok(Math.hypot(to[0] - layout.pts.scout[0], to[1] - layout.pts.scout[1]) < 40, `${name} ends near the first reader`);
    for (let i = 0; i < n.length; i += 2) assert.ok(n[i] >= 0 && n[i] <= layout.w && n[i + 1] >= 0 && n[i + 1] <= layout.h, `${name} point ${i / 2}`);
  }
  assert.equal(bolt([0, 0], [100, 0], 5, 4), "M0 0 L25 5 L50 -5 L75 5 L100 0");
});

// The wide map's station cards as boxes in board units, plus the two signs.
const forkSign = () => { const [x, y] = WIDE.pts.fork; return { l: x - FORK_SIGN.w / 2, r: x + FORK_SIGN.w / 2, t: y + FORK_SIGN.dy, b: y + FORK_SIGN.dy + FORK_SIGN.h }; };
const titleSign = { l: TITLE_SIGN.x, r: TITLE_SIGN.x + TITLE_SIGN.w, t: TITLE_SIGN.y, b: TITLE_SIGN.y + TITLE_SIGN.h };
const powerLabel = () => { const [x, y] = cardAnchor(WIDE, "readers"); return { l: x - POWER_LABEL.w / 2, r: x + POWER_LABEL.w / 2, t: y + POWER_LABEL.dy, b: y + POWER_LABEL.dy + POWER_LABEL.h }; };
type Box = { l: number; r: number; t: number; b: number };
const gapBetween = (a: Box, b: Box) => Math.max(b.l - a.r, a.l - b.r, b.t - a.b, a.t - b.b);
const cave: Box = { l: CAVE.l, r: CAVE.l + CAVE.w, t: CAVE.t, b: CAVE.t + CAVE.h };
const boxes: [string, Box][] = [...STOP_ORDER.map((id) => [id, cardBox(id)] as [string, Box]), ["fork sign", forkSign()], ["title sign", titleSign], ["power label", powerLabel()], ["cave", cave]];

test("wide map: cards, signs and the cave stay inside the board with at least 12 units between any two", () => {
  for (const [name, c] of boxes) assert.ok(c.l >= 0 && c.r <= WIDE.w && c.t >= 0 && c.b <= WIDE.h, `${name} inside the board`);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    assert.ok(gapBetween(boxes[i][1], boxes[j][1]) >= GAP, `${boxes[i][0]} and ${boxes[j][0]}`);
  }
});

test("wide map: no road runs through a card, a sign or the cave, and every road keeps 12 units from them", () => {
  const pad = ROAD_R + GAP;
  for (const id of Object.keys(SEG_ENDS) as SegId[]) {
    const n = nums(WIDE.segs[id]);
    for (let i = 2; i + 1 < n.length; i += 2) {
      const [x1, y1, x2, y2] = [n[i - 2], n[i - 1], n[i], n[i + 1]];
      for (const [name, c] of boxes) {
        const hit = Math.max(x1, x2) > c.l - pad && Math.min(x1, x2) < c.r + pad && Math.max(y1, y2) > c.t - pad && Math.min(y1, y2) < c.b + pad;
        assert.ok(!hit, `${id} comes within ${pad} units of the ${name}`);
      }
    }
  }
});

test("wide map: every card keeps its set distance from its own marker (the pinned Results card aside)", () => {
  for (const id of STOP_ORDER.filter((id) => !CARD[id].at)) {
    const box = cardBox(id);
    const [, y] = id === "readers" ? WIDE.pts.scout : WIDE.pts[id];
    const near = box.t > y ? box.t - y : y - box.b;
    assert.equal(near, CARD[id].reach, id);
  }
});

test("wide map: the electric line stays clear of every card", () => {
  const n = nums(powerLine(WIDE, true).d);
  for (let i = 2; i + 1 < n.length; i += 2) {
    const [x1, y1, x2, y2] = [n[i - 2], n[i - 1], n[i], n[i + 1]];
    for (const [name, c] of boxes) {
      const hit = Math.max(x1, x2) > c.l - 4 && Math.min(x1, x2) < c.r + 4 && Math.max(y1, y2) > c.t - 4 && Math.min(y1, y2) < c.b + 4;
      assert.ok(!hit, `the line crosses the ${name}`);
    }
  }
});

/**
 * Geometry for the skills radar: rings, dots and one label chip per skill, all inside the viewBox. Pure, so it is testable.
 * The layout is deterministic and mirror-symmetric: every chip has the same size, the chips on the right half are placed once, and the
 * left half is their mirror image, so the figure is balanced for any number of skills.
 */
export type RadarSpec = { W: number; H: number; R: number; font: number; mark: number; gap: number; wrapAt: number };
export type Box = { x: number; y: number; w: number; h: number };
export type RadarItem = { name: string; low: boolean; value: number; label: string; dot: [number, number]; chip: Box & { lines: string[]; textX: number; textY: number } };

export const DOT = 7;
export const CHIP_PAD = 7;
export const LINE = 1.2;
/** The most axes the radar draws. More skills than this stay in the lists below the chart. */
export const MAX_AXES = 8;
const CHAR = 0.62; // average bold glyph width in em, a little generous so text never leaves its chip

/** Wide chart: renders at about 0.9 of a unit per pixel, so 20 units is about 18px. */
export const WIDE: RadarSpec = { W: 820, H: 600, R: 175, font: 19, mark: 18, gap: 20, wrapAt: 10 };
/** Phone chart: a narrower box with larger units, so labels stay near 13px when the box shrinks to a phone width. */
export const COMPACT: RadarSpec = { W: 620, H: 600, R: 120, font: 20, mark: 18, gap: 22, wrapAt: 7 };

/** Splits a name over at most two lines of about `maxChars` characters; a part that is still too long ends in "…". */
export function wrapName(name: string, maxChars: number): string[] {
  const words = name.split(" ");
  let lines = [name];
  if (name.length > maxChars && words.length >= 2) {
    let bestMax = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
      if (Math.max(a.length, b.length) < bestMax) { bestMax = Math.max(a.length, b.length); lines = [a, b]; }
    }
  }
  return lines.map((line) => (line.length > maxChars + 2 ? line.slice(0, maxChars + 1) + "…" : line));
}

export const radarPoint = (spec: RadarSpec, index: number, count: number, value: number, radius = spec.R) => {
  const angle = (-90 + (index * 360) / count) * Math.PI / 180;
  const r = (radius * value) / 100;
  return [spec.W / 2 + Math.cos(angle) * r, spec.H / 2 + Math.sin(angle) * r] as const;
};

export const overlaps = (a: Box, b: Box, margin = 0) =>
  a.x < b.x + b.w + margin && b.x < a.x + a.w + margin && a.y < b.y + b.h + margin && b.y < a.y + a.h + margin;

export const hitsDisc = (box: Box, cx: number, cy: number, radius: number) => {
  const nx = Math.min(Math.max(cx, box.x), box.x + box.w), ny = Math.min(Math.max(cy, box.y), box.y + box.h);
  return Math.hypot(nx - cx, ny - cy) < radius;
};

/** Where a chip sits relative to the point on its spoke: beside it for the sides, above or below it for the top and bottom. */
function ideal(spec: RadarSpec, index: number, n: number, w: number, h: number): [number, number] {
  const cx = spec.W / 2;
  const angle = (-90 + (index * 360) / n) * Math.PI / 180, ux = Math.cos(angle), uy = Math.sin(angle);
  const [px, py] = radarPoint(spec, index, n, 100, spec.R + spec.gap);
  const x = ux > 0.35 ? px : ux < -0.35 ? px - w : cx - w / 2;
  const y = Math.abs(ux) <= 0.35 ? (uy < 0 ? py - h : py) : py - h / 2;
  return [x, y];
}

export function layoutRadar(skills: { name: string; evidence: number; label?: string }[], spec: RadarSpec): RadarItem[] {
  const n = skills.length, m = 3, cx = spec.W / 2, cy = spec.H / 2;
  const lines = skills.map((skill) => wrapName(skill.name, spec.wrapAt));
  // One size for every chip: the widest label and the most lines. Equal chips are what make the figure look balanced.
  const w = CHIP_PAD * 2 + spec.mark + 5 + Math.max(...lines.map((set) => Math.max(...set.map((line) => line.length)))) * spec.font * CHAR;
  const h = Math.max(spec.mark, Math.max(...lines.map((set) => set.length)) * spec.font * LINE) + 10;
  const half = Math.floor(n / 2);
  const placed: Box[] = [];
  const spots: [number, number][] = [];
  // Place the axes on the right half (and the top and, with an even count, the bottom); mirror the rest.
  for (let i = 0; i <= half; i++) {
    let [x, y] = ideal(spec, i, n, w, h);
    const side = x > cx - w / 2 + 1 ? 1 : 0; // 1: the chip hangs to the right of the middle line
    for (let tries = 0; tries < 30; tries++) {
      const box = { x, y, w, h };
      const mirror = { x: 2 * cx - x - w, y, w, h };
      const clash = hitsDisc(box, cx, cy, spec.R + 5) || placed.some((other) => overlaps(box, other, 5) || overlaps(mirror, other, 5)) || (side === 1 && overlaps(box, mirror, 5));
      if (!clash) break;
      if (hitsDisc(box, cx, cy, spec.R + 5)) { x += side ? 4 : 0; y += y < cy ? -4 : 4; } else y += y < cy ? -4 : 4;
    }
    x = Math.min(Math.max(x, m), spec.W - m - w);
    y = Math.min(Math.max(y, m), spec.H - m - h);
    spots[i] = [x, y];
    placed.push({ x, y, w, h }, { x: 2 * cx - x - w, y, w, h });
  }
  return skills.map((skill, i) => {
    const value = Math.max(skill.evidence, 4);
    const [x, y] = i <= half ? spots[i] : [2 * cx - spots[n - i][0] - w, spots[n - i][1]];
    const [dx, dy] = radarPoint(spec, i, n, value);
    return {
      name: skill.name, low: skill.evidence < 35, value: skill.evidence, label: skill.label ?? skill.evidence + "%", dot: [dx, dy] as [number, number],
      chip: { x, y, w, h, lines: lines[i], textX: x + CHIP_PAD + spec.mark + 5, textY: y + h / 2 },
    };
  });
}

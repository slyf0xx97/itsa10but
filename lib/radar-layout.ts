/** Geometry for the skills radar: rings, dots, score values and one label chip per skill, all inside the viewBox. Pure, so it is testable. */
export type RadarSpec = { W: number; H: number; R: number; font: number; scoreFont: number; mark: number; gap: number; wrapAt: number };
export type Box = { x: number; y: number; w: number; h: number };
export type RadarItem = { name: string; low: boolean; value: number; label: string; dot: [number, number]; score: Box; chip: Box & { lines: string[]; textX: number; textY: number } };

export const DOT = 7;
export const CHIP_PAD = 7;
export const LINE = 1.2;
const CHAR = 0.62; // average bold glyph width in em, a little generous so text never leaves its chip

/** Wide chart: renders at about 0.9 of a unit per pixel at 36rem, so 16 units is about 14.5px. */
export const WIDE: RadarSpec = { W: 640, H: 540, R: 165, font: 20, scoreFont: 23, mark: 19, gap: 42, wrapAt: 11 };
/** Phone chart: a narrower box with larger units, so labels stay near 13px when the box shrinks to a phone width. */
export const COMPACT: RadarSpec = { W: 420, H: 540, R: 108, font: 20, scoreFont: 23, mark: 18, gap: 44, wrapAt: 10 };

export function wrapName(name: string, maxChars: number): string[] {
  const words = name.split(" ");
  if (name.length <= maxChars || words.length < 2) return [name];
  let best = [name], bestMax = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
    if (Math.max(a.length, b.length) < bestMax) { bestMax = Math.max(a.length, b.length); best = [a, b]; }
  }
  return best;
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

/** Chips go to the free spot nearest their spoke: not on the rings, a dot, a score value or another chip, and inside the box. */
export function layoutRadar(skills: { name: string; evidence: number; label?: string }[], spec: RadarSpec): RadarItem[] {
  const n = skills.length, m = 3, step = 4, cx = spec.W / 2, cy = spec.H / 2;
  const items: RadarItem[] = skills.map((skill, index) => {
    const value = Math.max(skill.evidence, 4);
    const angle = (-90 + (index * 360) / n) * Math.PI / 180, ux = Math.cos(angle), uy = Math.sin(angle);
    const [dx, dy] = radarPoint(spec, index, n, value);
    const label = skill.label ?? skill.evidence + "%";
    const sw = label.length * spec.scoreFont * CHAR, // the printed score, "84%" or "4/5"
       sh = spec.scoreFont * 1.15;
    const sx = dx + ux * (DOT + 3 + sw / 2), sy = dy + uy * (DOT + 3 + sh / 2);
    const lines = wrapName(skill.name, spec.wrapAt);
    const w = CHIP_PAD * 2 + spec.mark + 5 + Math.max(...lines.map((line) => line.length)) * spec.font * CHAR;
    const h = Math.max(spec.mark, lines.length * spec.font * LINE) + 10;
    const [px, py] = radarPoint(spec, index, n, 100, spec.R + spec.gap);
    return {
      name: skill.name, low: skill.evidence < 35, value: skill.evidence, label, dot: [dx, dy],
      score: { x: sx - sw / 2, y: sy - sh / 2, w: sw, h: sh },
      chip: { x: px + ux * (w / 2) - w / 2, y: py + uy * (h / 2) - h / 2, w, h, lines, textX: 0, textY: 0 },
    };
  });
  const placed: Box[] = [];
  const blockers: Box[] = items.flatMap((item) => [item.score, { x: item.dot[0] - DOT, y: item.dot[1] - DOT, w: DOT * 2, h: DOT * 2 }]);
  // Longest chips choose first, because they have the fewest free spots.
  [...items].sort((a, b) => b.chip.w - a.chip.w).forEach((item) => {
    const c = item.chip, idealX = c.x, idealY = c.y;
    let best: [number, number] | null = null, bestCost = Infinity;
    for (let x = m; x <= spec.W - m - c.w; x += step) for (let y = m; y <= spec.H - m - c.h; y += step) {
      const cost = (x - idealX) ** 2 + (y - idealY) ** 2;
      if (cost >= bestCost) continue;
      const box = { x, y, w: c.w, h: c.h };
      if (hitsDisc(box, cx, cy, spec.R + 5) || blockers.some((b) => overlaps(box, b, 4)) || placed.some((b) => overlaps(box, b, 5))) continue;
      best = [x, y]; bestCost = cost;
    }
    if (best) { c.x = best[0]; c.y = best[1]; }
    else { c.x = Math.min(Math.max(c.x, m), spec.W - m - c.w); c.y = Math.min(Math.max(c.y, m), spec.H - m - c.h); }
    placed.push(c);
    c.textX = c.x + CHIP_PAD + spec.mark + 5; c.textY = c.y + c.h / 2;
  });
  return items;
}

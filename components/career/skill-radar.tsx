import { BASE_PATH } from "@/lib/base-path";
import type { Skill } from "@/lib/analysis-types";
import { skillArt } from "@/lib/skill-art";
import { rankSkills } from "@/lib/dashboard-data";
import { PROOF_STEP_TOTAL, proofCount } from "@/lib/proof-steps";
import { COMPACT, DOT, LINE, WIDE, layoutRadar, radarPoint, type RadarSpec } from "@/lib/radar-layout";
import { PixelIcon } from "@/components/career/pixel-icons";
import { Term } from "@/components/career/term";

/** Pixels per drawing unit at full size, so a cropped drawing keeps the type size the full one had (wide 44rem for 640 units, compact 28rem for 420). */
const SCALE = { wide: 0.92, compact: 1.067 };
/** The shared wide spec with a snugger ring and label gap, so the Stage 3 panel stays short. */
const WIDE_TIGHT: RadarSpec = { ...WIDE, R: 150, gap: 30 };
const COMPACT_TIGHT: RadarSpec = { ...COMPACT, R: 100, gap: 26 };
const EDGE = 5;

/** Tight box around everything drawn (rings, chips, scores), so no empty band is left inside the viewBox. */
function crop(spec: RadarSpec, items: ReturnType<typeof layoutRadar>) {
  const cx = spec.W / 2, cy = spec.H / 2;
  const boxes = [{ x: cx - spec.R, y: cy - spec.R, w: spec.R * 2, h: spec.R * 2 }, ...items.flatMap((item) => [item.chip, item.score])];
  const x0 = Math.max(0, Math.min(...boxes.map((b) => b.x)) - EDGE), y0 = Math.max(0, Math.min(...boxes.map((b) => b.y)) - EDGE);
  const x1 = Math.min(spec.W, Math.max(...boxes.map((b) => b.x + b.w)) + EDGE), y1 = Math.min(spec.H, Math.max(...boxes.map((b) => b.y + b.h)) + EDGE);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** A skill as the radar draws it: its proof in whole steps (3 of 5), on a 0 to 100 scale so each ring is one step. */
type Plotted = { name: string; evidence: number; label: string };
const STEP = 100 / PROOF_STEP_TOTAL;

function Chart({ skills, spec, variant, summary }: { skills: Plotted[]; spec: RadarSpec; variant: "wide" | "compact"; summary: string }) {
  const n = skills.length;
  const ring = (level: number) => skills.map((_, index) => radarPoint(spec, index, n, level).join(",")).join(" ");
  const items = layoutRadar(skills, spec);
  const cx = spec.W / 2, cy = spec.H / 2;
  const box = crop(spec, items);
  return <svg className={"radar-" + variant} viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} style={{ maxWidth: `${((box.w * SCALE[variant]) / 16).toFixed(1)}rem` }} role="img" aria-label={"Skills radar of your proof. " + summary}>
    {Array.from({ length: PROOF_STEP_TOTAL - 1 }, (_, i) => STEP * (i + 1)).map((level) => <polygon key={level} className="ring" points={ring(level)} />)}
    <polygon className="ring outer" points={ring(100)} />
    {skills.map((_, index) => { const [x, y] = radarPoint(spec, index, n, 100); return <line key={index} className="spoke" x1={cx} y1={cy} x2={x} y2={y} />; })}
    <polygon className="shape" points={items.map((item) => item.dot.join(",")).join(" ")} />
    {items.map((item) => <circle key={item.name} className={"dot" + (item.low ? " low" : "")} cx={item.dot[0]} cy={item.dot[1]} r={DOT} />)}
    {items.map((item) => <text key={item.name} className="rd-score" x={item.score.x + item.score.w / 2} y={item.score.y + item.score.h / 2} fontSize={spec.scoreFont} textAnchor="middle" dominantBaseline="central">{item.label}</text>)}
    {items.map((item) => {
      const art = skillArt(item.name);
      const { chip } = item;
      const markY = chip.y + (chip.h - spec.mark) / 2;
      return <g key={item.name}>
        <rect className={"rd-chip" + (item.low ? " low" : "")} x={chip.x} y={chip.y} width={chip.w} height={chip.h} rx={8} />
        <g aria-hidden="true" transform={`translate(${chip.x + 7} ${markY})`} className="mark-svg">
          {art.logos.length ? <image href={BASE_PATH + "/tool-logos/" + art.logos[0]} width={spec.mark} height={spec.mark} /> : <PixelIcon name={art.icon} size={spec.mark} />}
        </g>
        <text className={"rd-label" + (item.low ? " low" : "")} x={chip.textX} y={chip.textY} fontSize={spec.font} dominantBaseline="central">
          {chip.lines.map((line, i) => <tspan key={i} x={chip.textX} dy={i === 0 ? ((1 - chip.lines.length) * spec.font * LINE) / 2 : spec.font * LINE}>{line}</tspan>)}
        </text>
      </g>;
    })}
  </svg>;
}

/** The key under the radar: one quiet line of three small keys. The glyphs are decoration, and each word's tooltip holds the longer explanation. */
export function RadarLegend() {
  return <ul className="rd-legend" aria-label="How to read the radar">
    <li className="rd-key have"><i className="rd-glyph dot" aria-hidden="true" /><b><Term id="proof">Have</Term></b></li>
    <li className="rd-key gap"><i className="rd-glyph dot" aria-hidden="true" /><b><Term id="gap">Gap</Term></b></li>
    <li className="rd-key"><i className="rd-glyph num" aria-hidden="true">3/5</i><b><Term id="proof-score">Proof steps</Term></b></li>
  </ul>;
}

/**
 * Radar of the reader's own proof per skill (0% to 100%), the skills the role asks for most first. Two drawings of the same data: the wide one for a roomy column, the
 * compact one with larger units for phone widths (CSS shows one, by the figure's own width). Rows below carry the same data as text.
 */
export function SkillRadar({ skills }: { skills: Skill[] }) {
  if (skills.length < 3) return null;
  const ranked: Plotted[] = rankSkills(skills).map((skill) => { const steps = proofCount(skill); return { name: skill.name, evidence: steps * STEP, label: `${steps}/${PROOF_STEP_TOTAL}` }; });
  const summary = ranked.map((skill) => `${skill.name} ${skill.label} proof steps`).join(", ");
  return <figure className="radar">
    <div className="radar-box">
      <Chart skills={ranked} spec={WIDE_TIGHT} variant="wide" summary={summary} />
      <Chart skills={ranked} spec={COMPACT_TIGHT} variant="compact" summary={summary} />
    </div>
  </figure>;
}

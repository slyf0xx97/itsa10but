import { BASE_PATH } from "@/lib/base-path";
import type { Skill } from "@/lib/analysis-types";
import { skillArt } from "@/lib/skill-art";
import { rankSkills } from "@/lib/dashboard-data";
import { PROOF_STEP_TOTAL, proofCount } from "@/lib/proof-steps";
import { COMPACT, DOT, LINE, MAX_AXES, WIDE, layoutRadar, radarPoint, type RadarSpec } from "@/lib/radar-layout";
import { PixelIcon } from "@/components/career/pixel-icons";
import { Term } from "@/components/career/term";
import { LearnPill, LearnSvg } from "@/components/career/learn-link";

/** Pixels per drawing unit at full size, so a cropped drawing keeps the type size the full one had. */
const SCALE = { wide: 0.9, compact: 1.1 };
const EDGE = 5;
/** On a phone the labelled chips would shrink to unreadable type, so each spoke ends in a badge with the skill's icon and the names sit in a key under the chart. */
const BADGE = 21;

/** The box around the rings and chips (or badges), made symmetric about the middle line so the figure sits centred in its frame. */
function crop(spec: RadarSpec, items: ReturnType<typeof layoutRadar>, numbered: boolean) {
  const cx = spec.W / 2, cy = spec.H / 2;
  if (numbered) {
    const reach = spec.R + spec.gap + BADGE + EDGE;
    return { x: cx - reach, y: cy - reach, w: reach * 2, h: reach * 2 };
  }
  const boxes = [{ x: cx - spec.R, y: cy - spec.R, w: spec.R * 2, h: spec.R * 2 }, ...items.map((item) => item.chip)];
  const half = Math.min(cx, Math.max(...boxes.map((b) => Math.max(cx - b.x, b.x + b.w - cx))) + EDGE);
  const y0 = Math.max(0, Math.min(...boxes.map((b) => b.y)) - EDGE), y1 = Math.min(spec.H, Math.max(...boxes.map((b) => b.y + b.h)) + EDGE);
  return { x: cx - half, y: y0, w: half * 2, h: y1 - y0 };
}

/** A skill as the radar draws it: its proof in whole steps (3 of 5), on a 0 to 100 scale so each ring is one step. */
type Plotted = { name: string; evidence: number; label: string };
const STEP = 100 / PROOF_STEP_TOTAL;

function Mark({ name, size }: { name: string; size: number }) {
  const art = skillArt(name);
  return art.logos.length ? <image href={BASE_PATH + "/tool-logos/" + art.logos[0]} width={size} height={size} /> : <PixelIcon name={art.icon} size={size} />;
}

function Chart({ skills, spec, variant, summary }: { skills: Plotted[]; spec: RadarSpec; variant: "wide" | "compact"; summary: string }) {
  const n = skills.length;
  const numbered = variant === "compact";
  const ring = (level: number) => skills.map((_, index) => radarPoint(spec, index, n, level).join(",")).join(" ");
  const items = layoutRadar(skills, spec);
  const cx = spec.W / 2, cy = spec.H / 2;
  const box = crop(spec, items, numbered);
  return <svg className={"radar-" + variant} viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} style={{ maxWidth: `${((box.w * SCALE[variant]) / 16).toFixed(1)}rem` }} role="img" aria-label={"Skills radar of your proof. " + summary}>
    {Array.from({ length: PROOF_STEP_TOTAL - 1 }, (_, i) => STEP * (i + 1)).map((level) => <polygon key={level} className="ring" points={ring(level)} />)}
    <polygon className="ring outer" points={ring(100)} />
    {skills.map((_, index) => { const [x, y] = radarPoint(spec, index, n, 100); return <line key={index} className="spoke" x1={cx} y1={cy} x2={x} y2={y} />; })}
    <polygon className="shape" points={items.map((item) => item.dot.join(",")).join(" ")} />
    {items.map((item) => <circle key={item.name} className={"dot" + (item.low ? " low" : "")} cx={item.dot[0]} cy={item.dot[1]} r={DOT} />)}
    {numbered
      ? items.map((item, index) => {
        const [bx, by] = radarPoint(spec, index, n, 100, spec.R + spec.gap);
        return <LearnSvg key={item.name} name={item.name}>
          <circle className={"rd-badge" + (item.low ? " low" : "")} cx={bx} cy={by} r={BADGE} />
          <g transform={`translate(${bx - 13} ${by - 13})`} className="mark-svg"><Mark name={item.name} size={26} /></g>
        </LearnSvg>;
      })
      : items.map((item) => {
        const { chip } = item;
        const markY = chip.y + (chip.h - spec.mark) / 2;
        return <LearnSvg key={item.name} name={item.name}>
          <rect className={"rd-tag-bg" + (item.low ? " low" : "")} x={chip.x} y={chip.y} width={chip.w} height={chip.h} rx={8} />
          <g aria-hidden="true" transform={`translate(${chip.x + 7} ${markY})`} className="mark-svg"><Mark name={item.name} size={spec.mark} /></g>
          <text className={"rd-label" + (item.low ? " low" : "")} x={chip.textX} y={chip.textY} fontSize={spec.font} dominantBaseline="central">
            {chip.lines.map((line, i) => <tspan key={i} x={chip.textX} dy={i === 0 ? ((1 - chip.lines.length) * spec.font * LINE) / 2 : spec.font * LINE}>{line}</tspan>)}
          </text>
        </LearnSvg>;
      })}
  </svg>;
}

/** The key under the radar: one quiet line of three small keys. The glyphs are decoration, and each word's tooltip holds the longer explanation. */
export function RadarLegend() {
  return <ul className="rd-legend" aria-label="How to read the radar">
    <li className="rd-key have"><i className="rd-glyph dot" aria-hidden="true" /><b><Term id="proof">Have</Term></b></li>
    <li className="rd-key gap"><i className="rd-glyph dot" aria-hidden="true" /><b><Term id="gap">Gap</Term></b></li>
  </ul>;
}

/** Phone key: each skill's icon (the same one on its spoke), its name and its proof in steps. */
function NumberKey({ skills }: { skills: Plotted[] }) {
  return <ol className="radar-key" aria-label="Skills on the radar. Press one to learn it.">
    {skills.map((skill) => {
      const art = skillArt(skill.name);
      return <li key={skill.name}><LearnPill name={skill.name} className="rkl-row">
        <span className="rk-mark">{art.logos.length ? <img src={BASE_PATH + "/tool-logos/" + art.logos[0]} alt="" width={18} height={18} /> : <PixelIcon name={art.icon} size={18} />}</span> {/* eslint-disable-line @next/next/no-img-element */}
        <span className="rk-name">{skill.name}</span>
        <span className="rk-steps">{skill.label}</span>
      </LearnPill></li>;
    })}
  </ol>;
}

/**
 * Radar of the reader's own proof per skill (0% to 100%), the skills the role asks for most first, at most eight. Two drawings of the same data: the wide one with
 * labelled chips for a roomy column, the compact one with numbered spokes and a key for phone widths (CSS shows one, by the figure's own width). Rows below carry the same data as text.
 */
export function SkillRadar({ skills }: { skills: Skill[] }) {
  if (skills.length < 3) return null;
  const ranked: Plotted[] = rankSkills(skills).slice(0, MAX_AXES).map((skill) => { const steps = proofCount(skill); return { name: skill.name, evidence: steps * STEP, label: `${steps}/${PROOF_STEP_TOTAL}` }; });
  const summary = ranked.map((skill) => `${skill.name} ${skill.label} proof steps`).join(", ");
  const hidden = skills.length - ranked.length;
  return <figure className="radar">
    <div className="radar-box">
      <Chart skills={ranked} spec={WIDE} variant="wide" summary={summary} />
      <Chart skills={ranked} spec={COMPACT} variant="compact" summary={summary} />
      <NumberKey skills={ranked} />
    </div>
    {hidden > 0 && <figcaption className="radar-more">Chart shows the {ranked.length} skills the role asks for most. All {skills.length} are listed below.</figcaption>}
  </figure>;
}
